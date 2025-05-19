import express, { Express, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import fetch from "node-fetch";
import { parse } from "node-html-parser";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";
import BN from "bn.js";
import asyncHandler from "express-async-handler";
import { PrivyClient, LinkedAccountWithMetadata, WalletWithMetadata } from "@privy-io/server-auth";
import {
  findTaskPda,
  findProviderNodePda,
  findEndpointNodePda,
  findNodeRegistryPda,
  findTokenVaultPda,
  findClientPda,
  createAssignTaskByEndpointInstruction,
  createCompleteTaskInstruction,
  createUpdateNodeReportInstruction,
  createUpdateNodeInstruction,
  createCreateNodeInstruction,
  createNodeRegistryInitializeInstruction,
} from "./program/program";

// Fix for node-html-parser: Declare a module if types are missing
declare module 'node-html-parser' {
  export function parse(html: string): any;
}

const app: Express = express();

// Configure CORS to allow requests from the extension
app.use(cors({
  origin: [
    "chrome-extension://<CHROME_EXTENSION_ID>",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// Supabase setup
const supabaseUrl: string = process.env.SUPABASE_URL ?? '';
const supabaseKey: string = process.env.SUPABASE_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Solana setup
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const PROGRAM_ID = new PublicKey("7pqme6UtiQshBaes6hQ2HkEwnwUph1JsEujZzKi9rmxU");

// Privy setup
const PRIVY_APP_ID: string = process.env.PRIVY_APP_ID ?? '';
const PRIVY_APP_SECRET: string = process.env.PRIVY_APP_SECRET ?? '';

// Google OAuth setup
const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET ?? '';

// Initialize PrivyClient
const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

// Type guard to narrow LinkedAccountWithMetadata to WalletWithMetadata
function isWalletAccount(account: LinkedAccountWithMetadata): account is WalletWithMetadata {
  return account.type === "wallet" && "chainType" in account && "address" in account;
}

// Function to create a user and wallet, and store in Supabase
// ... (other imports and setup)

// Function to create a user and wallet, and store in Supabase
async function createUserAndWallet(email: string, supabaseAccessToken: string, refreshToken?: string): Promise<{ userId: string; walletAddress: string }> {
  try {
    console.log("Checking if user exists in Supabase...");

    // Use the Supabase access token to authenticate requests
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("user_id, wallet_address")
      .eq("email", email)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw new Error(`Failed to check existing user: ${fetchError.message}`);
    }

    if (existingUser) {
      console.log(`User already exists with email: ${email}, returning existing data`);
      return { userId: existingUser.user_id, walletAddress: existingUser.wallet_address };
    }

    console.log("Creating new user with Privy and pregenerating a Solana wallet...");
    const privyUser = await privy.importUser({
      linkedAccounts: [
        {
          type: "email",
          address: email,
        },
      ],
      createEthereumWallet: false,
      createSolanaWallet: true,
      createEthereumSmartWallet: false,
    });
    const userId: string = privyUser.id;

    const solanaWallet = privyUser.linkedAccounts.find(account =>
      isWalletAccount(account) && account.chainType === "solana"
    );
    if (!solanaWallet || !isWalletAccount(solanaWallet)) {
      throw new Error("Failed to pregenerate Solana wallet for user");
    }

    const walletAddress: string = solanaWallet.address;
    const walletId: string = solanaWallet.address;

    console.log(`Privy user created: userId=${userId}, walletAddress=${walletAddress}`);

    // Fetch the authenticated user using the Supabase access token
    const { data: { user }, error: userError } = await supabase.auth.getUser(supabaseAccessToken);
    if (userError || !user) {
      throw new Error(`Failed to fetch authenticated user: ${userError?.message || "User not found"}`);
    }

    const authUserId: string = user.id;
    console.log(`Supabase Auth user fetched: authUserId=${authUserId}`);

    console.log("Inserting into public.users table...");
    const { error: dbError } = await supabase.from("users").insert({
      auth_user_id: authUserId,
      user_id: userId,
      wallet_id: walletId,
      wallet_address: walletAddress,
      email,
      refresh_token: refreshToken,
    });

    if (dbError) {
      console.error(`Failed to insert into public.users: ${dbError.message}`);
      throw new Error(`Failed to save user to database: ${dbError.message}`);
    }

    console.log("User successfully created and saved to database");
    return { userId, walletAddress };
  } catch (error: any) {
    if (error.message.includes("Rate limit")) {
      throw new Error("Privy rate limit exceeded. Please wait a minute and try again.");
    }
    throw error;
  }
}

// Endpoint to create a user and wallet
app.post("/create-user", asyncHandler(async (req: Request, res: Response) => {
  const { email, supabaseAccessToken, refreshToken } = req.body;

  if (!email || !supabaseAccessToken) {
    res.status(400).json({ error: "Email and supabaseAccessToken are required" });
    return;
  }

  try {
    const { userId, walletAddress } = await createUserAndWallet(email, supabaseAccessToken, refreshToken);
    res.status(200).json({ userId, walletAddress });
  } catch (error: any) {
    console.error("Error creating user and wallet:", error);
    res.status(500).json({ error: error.message });
  }
}));

// ... (rest of the file)

// Function to sign and send a transaction with Privy
async function signAndSendTransactionWithPrivy(userId: string, tx: Transaction): Promise<string> {
  const { data: userData, error: fetchError } = await supabase
    .from("users")
    .select("wallet_id")
    .eq("user_id", userId)
    .single();

  if (fetchError || !userData?.wallet_id) {
    throw new Error(`Failed to fetch wallet_id for userId ${userId}: ${fetchError?.message || "No wallet_id found"}`);
  }

  const walletId: string = userData.wallet_id;

  console.log(`Signing and sending transaction with walletId: ${walletId}`);
  const { hash } = await privy.walletApi.solana.signAndSendTransaction({
    walletId,
    caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    transaction: tx,
  });

  if (!hash) {
    throw new Error("Failed to get transaction hash from Privy");
  }

  return hash;
}

// Function to fetch active provider nodes
async function getActiveProviderNodes(): Promise<{ owner: PublicKey; pda: PublicKey }[]> {
  const [registryPda] = await findNodeRegistryPda();
  const registryAccount = await connection.getAccountInfo(registryPda);
  if (!registryAccount) {
    throw new Error("Node registry not found");
  }

  const registryData = registryAccount.data;
  let offset = 8 + 1; // Skip discriminator and bump
  const nodeCount = registryData.readUInt32LE(offset);
  offset += 4;
  const nodeOwners: PublicKey[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const owner = new PublicKey(registryData.slice(offset, offset + 32));
    nodeOwners.push(owner);
    offset += 32;
  }

  const activeNodes: { owner: PublicKey; pda: PublicKey }[] = [];
  for (const owner of nodeOwners) {
    const [nodePda] = await findProviderNodePda(owner);
    const nodeAccount = await connection.getAccountInfo(nodePda);
    if (nodeAccount) {
      const data = nodeAccount.data;
      let offset = 8 + 1 + 32 + 4 + 2 + 2 + 8 + 8 + 8 + 8; // Skip to active field
      const active = data[offset] === 1;
      if (active) {
        activeNodes.push({ owner, pda: nodePda });
      }
    }
  }

  return activeNodes;
}

// Function to fetch node data for rankings
async function getNodeRankings(walletAddress: string): Promise<any> {
  const activeNodes = await getActiveProviderNodes();
  const nodesData: any[] = [];

  for (const node of activeNodes) {
    const nodeAccount = await connection.getAccountInfo(node.pda);
    if (!nodeAccount) continue;

    const data = nodeAccount.data;
    let offset = 8 + 1 + 32 + 4 + 2 + 2; // Skip to bandwidth_limit
    const bandwidthLimit = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;
    const bandwidthUsed = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;
    const datasetSize = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;
    const reputation = new BN(data.slice(offset, offset + 8), "le");

    const score = reputation.toNumber() + Math.round(datasetSize.div(bandwidthLimit).toNumber() * 10);

    const tokenMint = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
    const nodeTokenAccount = await getAssociatedTokenAddress(tokenMint, node.owner);
    const tokenAccountInfo = await connection.getAccountInfo(nodeTokenAccount);
    const earnings = tokenAccountInfo ? (tokenAccountInfo.lamports / 1_000_000_000).toFixed(1) : "0.0";

    nodesData.push({
      address: `${node.owner.toString().slice(0, 4)}...${node.owner.toString().slice(-4)}`,
      name: `Node_${node.owner.toString().slice(0, 4)}`,
      score,
      earnings: `${earnings} $SCRAPE`,
      owner: node.owner.toString(),
    });
  }

  nodesData.sort((a, b) => b.score - a.score);

  let userNode = null;
  const topNodes = nodesData.slice(0, 5).map((node, index) => ({
    ...node,
    rank: index + 1,
  }));

  const userNodeIndex = nodesData.findIndex(node => node.owner === walletAddress);
  if (userNodeIndex !== -1) {
    userNode = {
      ...nodesData[userNodeIndex],
      rank: userNodeIndex + 1,
    };
  }

  return { topNodes, userNode };
}

// Function to fetch rewards
async function getRewards(walletAddress: string, userNode: any): Promise<any[]> {
  const rewards = [
    {
      id: "R001",
      name: "Weekly Top 10 Bonus",
      amount: "5.0 $SCRAPE",
      status: userNode && userNode.rank <= 10 ? "Claimable" : "Locked",
      requirement: "Maintain top 10 position for a week",
    },
    {
      id: "R002",
      name: "High Availability Reward",
      amount: "3.5 $SCRAPE",
      status: "Claimable",
      requirement: "99.9% uptime for 30 days",
    },
    {
      id: "R003",
      name: "Data Quality Champion",
      amount: "10.0 $SCRAPE",
      status: userNode && userNode.rank <= 5 ? "Claimable" : "Locked",
      requirement: "Reach top 5 in node rankings",
    },
    {
      id: "R004",
      name: "Early Adopter Bonus",
      amount: "2.0 $SCRAPE",
      status: "Claimed",
      requirement: "Joined during beta phase",
    },
  ];

  return rewards;
}

// Function to check task assignment
async function checkTaskAssignment(
  owner: PublicKey,
  id: number,
  nodePda: PublicKey
): Promise<{ nodeAssigned: boolean } | null> {
  try {
    const [taskPda] = await findTaskPda(owner, new BN(id));
    const taskAccountInfo = await connection.getAccountInfo(taskPda);
    if (!taskAccountInfo) return null;

    const data = taskAccountInfo.data;
    let offset = 8 + 1 + 8 + 32 + 32; // Skip discriminator, bump, id, owner, endpoint_node
    for (let i = 0; i < 4; i++) {
      const strLength = data.readUInt32LE(offset);
      offset += 4 + strLength;
    }
    offset += 8 + 1; // reward, status
    const nodeAssignedFlag = data[offset];
    if (nodeAssignedFlag !== 1) return { nodeAssigned: false };
    offset += 1;
    const assignedNode = new PublicKey(data.slice(offset, offset + 32));
    return { nodeAssigned: assignedNode.equals(nodePda) };
  } catch (error) {
    console.error(`Failed to check task ${id} assignment:`, error);
    return null;
  }
}

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Backend server is running!" });
});

// Endpoint to exchange authorization code for tokens
app.post("/exchange-code", asyncHandler(async (req: Request, res: Response) => {
  const { code, redirect_uri } = req.body;

  if (!code || !redirect_uri) {
    res.status(400).json({ error: "Code and redirect_uri are required" });
    return;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Failed to exchange code: ${errorData.error_description || errorData.error}`);
    }

    const tokenData = await tokenResponse.json();
    res.status(200).json({
      access_token: tokenData.access_token,
      id_token: tokenData.id_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });
  } catch (error: any) {
    console.error("Error exchanging code:", error);
    res.status(500).json({ error: error.message });
  }
}));

// Endpoint to create a user and wallet
app.post("/create-user", asyncHandler(async (req: Request, res: Response) => {
  const { email, accessToken } = req.body;

  if (!email || !accessToken) {
    res.status(400).json({ error: "Email and accessToken are required" });
    return;
  }

  try {
    const { userId, walletAddress } = await createUserAndWallet(email, accessToken);
    res.status(200).json({ userId, walletAddress });
  } catch (error: any) {
    console.error("Error creating user and wallet:", error);
    res.status(500).json({ error: error.message });
  }
}));

// Endpoint to fetch node status
app.post("/node-status", asyncHandler(async (req: Request, res: Response) => {
  const { userId, walletAddress } = req.body;

  if (!userId || !walletAddress) {
    res.status(400).json({ error: "userId and walletAddress are required" });
    return;
  }

  try {
    const owner = new PublicKey(walletAddress);
    const [providerNodePda] = await findProviderNodePda(owner);
    const nodeAccountInfo = await connection.getAccountInfo(providerNodePda);
    let bandwidthLimitMB = 0;

    if (!nodeAccountInfo) {
      res.json({ nodeExists: false });
      return;
    }

    const data = nodeAccountInfo.data;
    let offset = 8 + 1 + 32 + 4 + 2 + 2;
    const bandwidthLimit = new BN(data.slice(offset, offset + 8), "le");
    bandwidthLimitMB = Math.round(bandwidthLimit.div(new BN(1_000_000)).toNumber());

    const [clientPda] = await findClientPda(owner);
    const clientAccountInfo = await connection.getAccountInfo(clientPda);
    let tasksCreated = 0;
    let activeTasks = 0;

    if (clientAccountInfo) {
      const taskCounter = new BN(clientAccountInfo.data.slice(41, 49), "le").toNumber();
      tasksCreated = taskCounter;

      const taskPromises: Promise<{ nodeAssigned: boolean } | null>[] = [];
      for (let id = 0; id < taskCounter; id++) {
        taskPromises.push(checkTaskAssignment(owner, id, providerNodePda));
      }
      const taskResults = await Promise.all(taskPromises);
      activeTasks = taskResults.filter(result => result?.nodeAssigned).length;
    }

    const tokenMint = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
    const nodeTokenAccount = await getAssociatedTokenAddress(tokenMint, owner);
    let earnings = "0 $SCRAPE";
    try {
      const tokenAccountInfo = await getAccount(connection, nodeTokenAccount);
      const balance = Number(tokenAccountInfo.amount) / 1_000_000;
      earnings = `${balance.toFixed(2)} $SCRAPE`;
    } catch (error) {
      console.error("Failed to fetch token balance:", error);
    }

    const uptime = bandwidthLimitMB > 0 ? "24h 13m" : "0h 0m";

    res.json({
      nodeExists: true,
      bandwidthLimitMB,
      uptime,
      earnings,
      activeTasks,
      tasksCreated,
    });
  } catch (error: any) {
    console.error("Error fetching node status:", error);
    res.status(500).json({ error: error.message });
  }
}));

// Endpoint to start the node
app.post("/start-node", asyncHandler(async (req: Request, res: Response) => {
  const { userId, walletAddress } = req.body;

  if (!userId || !walletAddress) {
    res.status(400).json({ error: "userId and walletAddress are required" });
    return;
  }

  try {
    const signer = new PublicKey(walletAddress);
    const [providerNodePda] = await findProviderNodePda(signer);
    const nodeAccountInfo = await connection.getAccountInfo(providerNodePda);
    if (!nodeAccountInfo) {
      res.status(400).json({ error: "ProviderNode not found" });
      return;
    }

    const defaultBandwidthLimit = new BN(100_000_000);
    const updateNodeIx = createUpdateNodeInstruction(
      {
        signer,
        provider_node: providerNodePda,
      },
      {
        ipv4: Array.from(nodeAccountInfo.data.slice(41, 45)),
        proxy_port: nodeAccountInfo.data.readUInt16LE(45),
        client_port: nodeAccountInfo.data.readUInt16LE(47),
        bandwidth_limit: defaultBandwidthLimit,
      }
    );

    const tx = new Transaction().add(updateNodeIx);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = signer;

    const signature = await signAndSendTransactionWithPrivy(userId, tx);

    res.json({ signature });
  } catch (error: any) {
    console.error("Error starting node:", error);
    res.status(500).json({ error: error.message });
  }
}));

// Endpoint to stop the node
app.post("/stop-node", asyncHandler(async (req: Request, res: Response) => {
  const { userId, walletAddress } = req.body;

  if (!userId || !walletAddress) {
    res.status(400).json({ error: "userId and walletAddress are required" });
    return;
  }

  try {
    const signer = new PublicKey(walletAddress);
    const [providerNodePda] = await findProviderNodePda(signer);
    const nodeAccountInfo = await connection.getAccountInfo(providerNodePda);
    if (!nodeAccountInfo) {
      res.status(400).json({ error: "ProviderNode not found" });
      return;
    }

    const updateNodeIx = createUpdateNodeInstruction(
      {
        signer,
        provider_node: providerNodePda,
      },
      {
        ipv4: Array.from(nodeAccountInfo.data.slice(41, 45)),
        proxy_port: nodeAccountInfo.data.readUInt16LE(45),
        client_port: nodeAccountInfo.data.readUInt16LE(47),
        bandwidth_limit: new BN(0),
      }
    );

    const tx = new Transaction().add(updateNodeIx);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = signer;

    const signature = await signAndSendTransactionWithPrivy(userId, tx);

    res.json({ signature });
  } catch (error: any) {
    console.error("Error stopping node:", error);
    res.status(500).json({ error: error.message });
  }
}));

// Endpoint for NodeForbesPage
app.post("/node-forbes", asyncHandler(async (req: Request, res: Response) => {
  const { userId, walletAddress } = req.body;

  if (!userId || !walletAddress) {
    res.status(400).json({ error: "userId and walletAddress are required" });
    return;
  }

  try {
    const { topNodes, userNode } = await getNodeRankings(walletAddress);
    const rewards = await getRewards(walletAddress, userNode);

    res.json({
      topNodes,
      userNode,
      rewards,
    });
  } catch (error: any) {
    console.error("Error fetching node forbes data:", error);
    res.status(500).json({ error: error.message });
  }
}));

// Endpoint to claim rewards
app.post("/claim-reward", asyncHandler(async (req: Request, res: Response) => {
  const { userId, walletAddress, rewardId } = req.body;

  if (!userId || !walletAddress || !rewardId) {
    res.status(400).json({ error: "userId, walletAddress, and rewardId are required" });
    return;
  }

  try {
    const [providerNodePda] = await findProviderNodePda(new PublicKey(walletAddress));
    const nodeAccountInfo = await connection.getAccountInfo(providerNodePda);
    if (!nodeAccountInfo) {
      res.status(400).json({ error: "ProviderNode not found" });
      return;
    }

    const tokenMint = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
    const [tokenVaultPda] = await findTokenVaultPda();
    const vaultTokenAccount = await getAssociatedTokenAddress(tokenMint, tokenVaultPda, true);
    const nodeTokenAccount = await getAssociatedTokenAddress(tokenMint, new PublicKey(walletAddress));

    const tx = new Transaction();
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = new PublicKey(walletAddress);

    const signature = await signAndSendTransactionWithPrivy(userId, tx);

    res.json({ signature });
  } catch (error: any) {
    console.error(`Error claiming reward ${rewardId}:`, error);
    res.status(500).json({ error: error.message });
  }
}));

// /new-task endpoint
app.post("/new-task", asyncHandler(async (req: Request, res: Response) => {
  const { userId, taskId, url, filter, label, format, params, owner } = req.body;

  if (!userId || !taskId || !url || !filter || !label || !format || !owner) {
    console.log("Missing required fields:", { userId, taskId, url, filter, label, format, owner });
    res.status(400).json({ error: "userId, taskId, url, filter, label, format, and owner are required" });
    return;
  }

  try {
    console.log("Received new task:", { taskId, url, filter, label, format, params, owner });

    let selector = "";
    if (params) {
      const parsedParams = JSON.parse(params);
      selector = parsedParams.selector || "";
      if (!selector) {
        res.status(400).json({ error: "Selector is required in params." });
        return;
      }
    } else {
      res.status(400).json({ error: "Params with selector are required." });
      return;
    }

    const taskIdNum = parseInt(taskId);
    const clientPubkey = new PublicKey(owner);
    const [taskPda] = await findTaskPda(clientPubkey, new BN(taskIdNum));

    const activeNodes = await getActiveProviderNodes();
    if (activeNodes.length === 0) {
      res.status(400).json({ error: "No active provider nodes available" });
      return;
    }

    const selectedNode = activeNodes[0];
    const nodePubkey = selectedNode.owner;
    const nodePda = selectedNode.pda;

    console.log(`Selected provider node: ${nodePubkey.toString()}`);

    const [endpointNodePda] = await findEndpointNodePda(clientPubkey);
    const [registryPda] = await findNodeRegistryPda();
    const [tokenVaultPda] = await findTokenVaultPda();
    const vaultTokenAccount = await getAssociatedTokenAddress(
      new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3"),
      tokenVaultPda,
      true
    );
    const nodeTokenAccount = await getAssociatedTokenAddress(
      new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3"),
      nodePda,
      true
    );

    const assignTaskInstruction = createAssignTaskByEndpointInstruction({
      task: taskPda,
      endpoint_node: endpointNodePda,
      signer: clientPubkey,
      node_registry: registryPda,
      provider_node: nodePda,
    });

    const assignTaskTx = new Transaction().add(assignTaskInstruction);
    assignTaskTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    assignTaskTx.feePayer = clientPubkey;
    const assignTaskSignature = await signAndSendTransactionWithPrivy(userId, assignTaskTx);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();

    const root = parse(html);
    const elements = root.querySelectorAll(selector);
    if (elements.length === 0) {
      res.status(404).json({ error: `No elements found for selector: ${selector}` });
      return;
    }

    interface ScrapedItem {
      text: string;
      tag: string;
    }

    const scrapedData = elements.map((element: any) => ({
      text: (element.textContent || '').trim(),
      tag: element.tagName,
    }));

    const jsonlData = scrapedData.map((item: ScrapedItem) => JSON.stringify(item)).join("\n");

    const filePath = `tasks/${taskId}/data.jsonl`;
    const { error: uploadError } = await supabase.storage
      .from("scraped-data")
      .upload(filePath, jsonlData, {
        contentType: "application/jsonl",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("scraped-data")
      .getPublicUrl(filePath);

    const bandwidthUsedBytes = Buffer.from(html).length;
    const datasetSizeBytes = Buffer.from(jsonlData).length;
    const datasetSizeMB = Math.round(datasetSizeBytes / 1_000_000);

    const completeTaskInstruction = createCompleteTaskInstruction(
      {
        task: taskPda,
        node: nodePda,
        token_vault: tokenVaultPda,
        vault_token_account: vaultTokenAccount,
        node_token_account: nodeTokenAccount,
        signer: nodePubkey,
        token_program: TOKEN_PROGRAM_ID,
      },
      { ipfs_hash: urlData.publicUrl }
    );

    const completeTaskTx = new Transaction().add(completeTaskInstruction);
    completeTaskTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    completeTaskTx.feePayer = nodePubkey;
    const completeTaskSignature = await signAndSendTransactionWithPrivy(userId, completeTaskTx);

    const updateNodeReportInstruction = createUpdateNodeReportInstruction(
      {
        provider_node: nodePda,
        signer: nodePubkey,
      },
      {
        bandwidth_used: new BN(bandwidthUsedBytes),
        reputation_increase: new BN(0),
      }
    );

    const updateNodeReportTx = new Transaction().add(updateNodeReportInstruction);
    updateNodeReportTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    updateNodeReportTx.feePayer = nodePubkey;
    const updateNodeReportSignature = await signAndSendTransactionWithPrivy(userId, updateNodeReportTx);

    const responseData = {
      message: `Task ${taskId} processed successfully`,
      taskDetails: { taskId, url, filter, label, format, selector },
      downloadUrl: urlData.publicUrl,
      datasetSize: datasetSizeMB,
      assignTaskSignature,
      completeTaskSignature,
      updateNodeReportSignature,
      selectedNodeOwner: nodePubkey.toString(),
      signerPubkey: clientPubkey.toString(),
    };
    res.json(responseData);
  } catch (error: any) {
    console.error("Error handling new task:", error);
    res.status(500).json({ error: error.message });
  }
}));

// Endpoint for updating node settings
app.post("/update-node", asyncHandler(async (req: Request, res: Response) => {
  const { userId, signer, providerNode, ipv4, proxyPort, clientPort, bandwidthLimit } = req.body;

  if (!userId || !signer || !providerNode || !ipv4 || !proxyPort || !clientPort || !bandwidthLimit) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  try {
    const updateNodeIx = createUpdateNodeInstruction(
      {
        signer: new PublicKey(signer),
        provider_node: new PublicKey(providerNode),
      },
      {
        ipv4: ipv4.map(Number),
        proxy_port: Number(proxyPort),
        client_port: Number(clientPort),
        bandwidth_limit: new BN(bandwidthLimit),
      }
    );

    const tx = new Transaction().add(updateNodeIx);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = new PublicKey(signer);

    const signature = await signAndSendTransactionWithPrivy(userId, tx);

    res.json({ signature });
  } catch (error: any) {
    console.error("Error updating node:", error);
    res.status(500).json({ error: error.message });
  }
}));

// Endpoint for creating a node
app.post("/create-node", asyncHandler(async (req: Request, res: Response) => {
  const {
    userId,
    signer,
    providerNode,
    nodeRegistry,
    nodeTokenAccount,
    ipv4,
    proxyPort,
    clientPort,
    bandwidthLimit,
  } = req.body;

  if (!userId || !signer || !providerNode || !nodeRegistry || !nodeTokenAccount || !ipv4 || !proxyPort || !clientPort || !bandwidthLimit) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  try {
    const tokenMint = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
    const signerPubkey = new PublicKey(signer);
    const nodeTokenAccountPubkey = new PublicKey(nodeTokenAccount);

    const nodeTokenAccountInfo = await connection.getAccountInfo(nodeTokenAccountPubkey);
    if (!nodeTokenAccountInfo) {
      const createAtaTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          signerPubkey,
          nodeTokenAccountPubkey,
          signerPubkey,
          tokenMint,
          TOKEN_PROGRAM_ID
        )
      );
      createAtaTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      createAtaTx.feePayer = signerPubkey;
      const ataSignature = await signAndSendTransactionWithPrivy(userId, createAtaTx);
    }

    const nodeRegistryPubkey = new PublicKey(nodeRegistry);
    const nodeRegistryInfo = await connection.getAccountInfo(nodeRegistryPubkey);
    if (!nodeRegistryInfo) {
      const initNodeRegistryIx = createNodeRegistryInitializeInstruction({
        node_registry: nodeRegistryPubkey,
        signer: signerPubkey,
        system_program: SystemProgram.programId,
      });
      const initTx = new Transaction().add(initNodeRegistryIx);
      initTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      initTx.feePayer = signerPubkey;
      const initSignature = await signAndSendTransactionWithPrivy(userId, initTx);
    }

    const createNodeIx = createCreateNodeInstruction(
      {
        signer: signerPubkey,
        provider_node: new PublicKey(providerNode),
        node_registry: nodeRegistryPubkey,
        node_token_account: nodeTokenAccountPubkey,
        system_program: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
      {
        ipv4: ipv4.map(Number),
        proxy_port: Number(proxyPort),
        client_port: Number(clientPort),
        bandwidth_limit: new BN(bandwidthLimit),
      }
    );

    const tx = new Transaction().add(createNodeIx);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = signerPubkey;

    const signature = await signAndSendTransactionWithPrivy(userId, tx);

    res.json({ signature });
  } catch (error: any) {
    console.error("Error creating node:", error);
    res.status(500).json({ error: error.message });
  }
}));

// Endpoint for completing a task
app.post("/complete-task", asyncHandler(async (req: Request, res: Response) => {
  const {
    userId,
    task,
    node,
    tokenVault,
    vaultTokenAccount,
    nodeTokenAccount,
    signer,
    ipfsHash,
  } = req.body;

  if (!userId || !task || !node || !tokenVault || !vaultTokenAccount || !nodeTokenAccount || !signer || !ipfsHash) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  try {
    const completeTaskIx = createCompleteTaskInstruction({
      task: new PublicKey(task),
      node: new PublicKey(node),
      token_vault: new PublicKey(tokenVault),
      vault_token_account: new PublicKey(vaultTokenAccount),
      node_token_account: new PublicKey(nodeTokenAccount),
      signer: new PublicKey(signer),
      token_program: TOKEN_PROGRAM_ID,
    }, {
      ipfs_hash: ipfsHash,
    });

    const tx = new Transaction().add(completeTaskIx);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = new PublicKey(signer);

    const signature = await signAndSendTransactionWithPrivy(userId, tx);

    res.json({ signature });
  } catch (error: any) {
    console.error("Error completing task:", error);
    res.status(500).json({ error: error.message });
  }
}));

// /upload endpoint
app.post("/upload", asyncHandler(async (req: Request, res: Response) => {
  const { taskId, data } = req.body;

  if (!taskId || !data) {
    res.status(400).json({ error: "taskId and data are required" });
    return;
  }

  try {
    const filePath = `tasks/${taskId}/data.jsonl`;
    const { error: uploadError } = await supabase.storage
      .from("scraped-data")
      .upload(filePath, data, {
        contentType: "application/jsonl",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("scraped-data")
      .getPublicUrl(filePath);

    res.json({ downloadUrl: urlData.publicUrl });
  } catch (error: any) {
    console.error("Error uploading data:", error);
    res.status(500).json({ error: error.message });
  }
}));

const PORT: number = 3000;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Backend server running on http://127.0.0.1:${PORT}`);
});