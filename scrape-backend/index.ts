import express, { Express, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import fetch from "node-fetch";
import { parse } from "node-html-parser";
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import BN from "bn.js";
import {
  findTaskPda,
  findProviderNodePda,
  findEndpointNodePda,
  findNodeRegistryPda,
  findTokenVaultPda,
  createAssignTaskByEndpointInstruction,
  createCompleteTaskInstruction,
  createUpdateNodeReportInstruction,
} from "./program/program";

const app: Express = express();
app.use(cors());
app.use(express.json());

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Solana setup
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const PROGRAM_ID = new PublicKey("7pqme6UtiQshBaes6hQ2HkEwnwUph1JsEujZzKi9rmxU");

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

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Backend server is running!" });
});

app.post(
  "/new-task",
  async (
    req: Request<
      {},
      any,
      { taskId: string; url: string; filter: string; label: string; format: string; params?: string; owner: string }
    >,
    res: Response
  ) => {
    try {
      const { taskId, url, filter, label, format, params, owner } = req.body;
      if (!taskId || !url || !filter || !label || !format || !owner) {
        console.log("Missing required fields:", { taskId, url, filter, label, format, owner });
        res.status(400).json({ error: "taskId, url, filter, label, format, and owner are required" });
        return;
      }

      console.log("Received new task:", { taskId, url, filter, label, format, params, owner });

      let selector = "";
      if (params) {
        try {
          const parsedParams = JSON.parse(params);
          selector = parsedParams.selector || "";
          console.log("Parsed selector:", selector);
        } catch (error) {
          console.log("Invalid params format:", params, error);
          res.status(400).json({ error: "Invalid params format. Expected JSON with a 'selector' field." });
          return;
        }
      }
      if (!selector) {
        console.log("Selector missing in params:", params);
        res.status(400).json({ error: "Selector is required in params." });
        return;
      }

      // Derive task PDA
      const taskIdNum = parseInt(taskId);
      const clientPubkey = new PublicKey(owner);
      const [taskPda] = await findTaskPda(clientPubkey, new BN(taskIdNum));

      // Fetch active provider nodes and select one
      const activeNodes = await getActiveProviderNodes();
      if (activeNodes.length === 0) {
        console.log("No active provider nodes available");
        res.status(400).json({ error: "No active provider nodes available" });
        return;
      }

      // Simple selection: choose the first active node
      const selectedNode = activeNodes[0];
      const nodePubkey = selectedNode.owner;
      const nodePda = selectedNode.pda;

      console.log(`Selected provider node: ${nodePubkey.toString()}`);

      // Derive the EndpointNode PDA
      const [endpointNodePda] = await findEndpointNodePda(clientPubkey);

      // Log the public keys to identify the problematic one
      console.log("Client/Owner Public Key:", clientPubkey.toString());
      console.log("Endpoint Node PDA:", endpointNodePda.toString());
      console.log("Selected Node Public Key:", nodePubkey.toString());

      // Derive the NodeRegistry PDA
      const [registryPda] = await findNodeRegistryPda();

      // Derive TokenVault and associated token accounts
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

      // Create assign_task_by_endpoint instruction
      console.log("Creating assign_task_by_endpoint instruction...");
      const assignTaskInstruction = createAssignTaskByEndpointInstruction({
        task: taskPda,
        endpoint_node: endpointNodePda,
        signer: clientPubkey, // The signer is the owner of the endpoint_node
        node_registry: registryPda,
        provider_node: nodePda,
      });

      const assignTaskTx = new Transaction().add(assignTaskInstruction);
      assignTaskTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      assignTaskTx.feePayer = clientPubkey;
      const serializedAssignTaskTx = assignTaskTx.serialize({ requireAllSignatures: false }).toString("base64");
      console.log("Serialized assignTaskTx (to be signed by clientPubkey):", serializedAssignTaskTx);

      // Scrape and upload to Supabase
      console.log("Fetching URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        console.log("Failed to fetch URL:", response.status, response.statusText);
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }
      const html = await response.text();
      console.log("Fetched HTML successfully, length:", html.length);

      console.log("Parsing HTML...");
      const root = parse(html);
      console.log("HTML parsed successfully");

      console.log("Querying DOM with selector:", selector);
      const elements = root.querySelectorAll(selector);
      if (elements.length === 0) {
        console.log("No elements found for selector:", selector);
        res.status(404).json({ error: `No elements found for selector: ${selector}` });
        return;
      }
      console.log("Found elements:", elements.length);

      const scrapedData = elements.map((element) => ({
        text: element.textContent.trim(),
        tag: element.tagName,
      }));
      console.log("Scraped data:", scrapedData);

      const jsonlData = scrapedData.map((item) => JSON.stringify(item)).join("\n");
      console.log("Formatted data as JSONL, length:", jsonlData.length);

      const filePath = `tasks/${taskId}/data.jsonl`;
      console.log("Uploading to Supabase Storage at:", filePath);
      const { error: uploadError } = await supabase.storage
        .from("scraped-data")
        .upload(filePath, jsonlData, {
          contentType: "application/jsonl",
          upsert: true,
        });

      if (uploadError) {
        console.log("Failed to upload to Supabase Storage:", uploadError);
        throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
      }
      console.log("Uploaded to Supabase Storage successfully");

      const { data: urlData } = supabase.storage
        .from("scraped-data")
        .getPublicUrl(filePath);
      console.log("Public URL:", urlData.publicUrl);

      // Calculate bandwidth used and dataset size
      const bandwidthUsedBytes = Buffer.from(html).length;
      console.log("Bandwidth used (bytes):", bandwidthUsedBytes);
      const datasetSizeBytes = Buffer.from(jsonlData).length;
      const datasetSizeMB = Math.round(datasetSizeBytes / 1_000_000);

      // Create complete_task instruction
      console.log("Creating complete_task instruction...");
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
      const serializedCompleteTaskTx = completeTaskTx.serialize({ requireAllSignatures: false }).toString("base64");
      console.log("Serialized completeTaskTx (to be signed by nodePubkey):", serializedCompleteTaskTx);

      // Create update_node_report instruction
      console.log("Creating update_node_report instruction...");
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
      const serializedUpdateNodeReportTx = updateNodeReportTx.serialize({ requireAllSignatures: false }).toString("base64");
      console.log("Serialized updateNodeReportTx (to be signed by nodePubkey):", serializedUpdateNodeReportTx);

      const responseData = {
        message: `Task ${taskId} processed successfully`,
        taskDetails: { taskId, url, filter, label, format, selector },
        downloadUrl: urlData.publicUrl,
        datasetSize: datasetSizeMB,
        assignTaskTx: serializedAssignTaskTx,
        completeTaskTx: serializedCompleteTaskTx,
        updateNodeReportTx: serializedUpdateNodeReportTx,
        selectedNodeOwner: nodePubkey.toString(),
        signerPubkey: clientPubkey.toString(), // Updated to use signerPubkey
      };
      console.log("Sending response:", responseData);
      res.json(responseData);
    } catch (error: any) {
      console.error("Error handling new task:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

const PORT: number = 3000;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Backend server running on http://127.0.0.1:${PORT}`);
});