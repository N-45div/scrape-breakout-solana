import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  findClientPda,
  findEndpointNodePda,
  findTaskPda,
  findTokenVaultPda,
  createCreateClientInstruction,
  createCreateEndpointNodeInstruction,
  createCreateTaskInstruction,
  createInitTokenVaultInstruction,
} from "../program/program";
import { supabase } from "../client/supabaseClient";

interface CreateTasksPageProps {
  walletAddress: string | null;
  setIsCreatingTask: (isCreating: boolean) => void;
}

interface TaskMetadata {
  taskId: string;
  downloadUrl: string;
  selectedNodeOwner: string;
  url: string;
  format: string;
}

function CreateTasksPage({ walletAddress, setIsCreatingTask }: CreateTasksPageProps) {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [filter, setFilter] = useState("");
  const [label, setLabel] = useState("");
  const [format, setFormat] = useState("JSONL");
  const [selector, setSelector] = useState("");
  const [status, setStatus] = useState("");
  const [userTokenAccountAddress, setUserTokenAccountAddress] = useState<string | null>(null);
  const [userTokenBalance, setUserTokenBalance] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const SCRAPE_TOKEN_MINT = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
  const REWARD_AMOUNT = new BN(1000);

  const handleSubmit = async () => {
    if (!walletAddress) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    const publicKey = new PublicKey(walletAddress);

    if (!url || !filter || !label || !format || !selector) {
      setStatus("Please fill in all fields.");
      return;
    }

    try {
      setIsCreatingTask(true);
      setStatus("Preparing to create task...");
      console.log("User's public key:", publicKey.toString());

      // Check wallet SOL balance before proceeding
      const balance = await connection.getBalance(publicKey);
      const minimumBalance = 0.01 * LAMPORTS_PER_SOL;
      if (balance < minimumBalance) {
        setStatus(
          `Insufficient SOL balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL. Need at least ${(
            minimumBalance / LAMPORTS_PER_SOL
          ).toFixed(6)} SOL. Requesting airdrop...`
        );
        const airdropSignature = await connection.requestAirdrop(
          publicKey,
          1 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSignature, "confirmed");
        const newBalance = await connection.getBalance(publicKey);
        setStatus(`Airdrop successful! New balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL.`);
      }

      // Ensure the Client account exists
      const [clientPda] = await findClientPda(publicKey);
      let clientAccountInfo = await connection.getAccountInfo(clientPda);
      if (!clientAccountInfo) {
        setStatus("Client account needs to be created. Please contact support or fund the wallet for transaction signing.");
        throw new Error("Client account not found and cannot be created without transaction signing.");
      }

      // Ensure the EndpointNode account exists
      const [endpointNodePda] = await findEndpointNodePda(publicKey);
      const endpointNodeAccount = await connection.getAccountInfo(endpointNodePda);
      if (!endpointNodeAccount) {
        setStatus("EndpointNode account needs to be created. Please contact support or fund the wallet for transaction signing.");
        throw new Error("EndpointNode account not found and cannot be created without transaction signing.");
      }

      // Fetch the task counter from the Client account
      const taskCounter = clientAccountInfo
        ? new BN(clientAccountInfo.data.slice(41, 49), "le").toNumber()
        : 0;
      const taskId = taskCounter.toString();
      const params = JSON.stringify({ selector });

      // Check if task already exists and verify ownership
      const [taskPda] = await findTaskPda(publicKey, new BN(taskId));
      let taskAccount = await connection.getAccountInfo(taskPda);
      if (taskAccount) {
        const taskOwner = new PublicKey(taskAccount.data.slice(17, 49));
        if (!taskOwner.equals(publicKey)) {
          setStatus(
            `Task with ID ${taskId} already exists with owner ${taskOwner.toString()}. ` +
            `Please close the existing task using the owner's wallet or reset the client account.`
          );
          throw new Error(
            `Task with ID ${taskId} already exists with owner ${taskOwner.toString()}. Cannot overwrite with current wallet ${publicKey.toString()}.`
          );
        }
      }

      // Set up token accounts
      setStatus("Setting up token accounts...");

      // Find the Token Vault PDA
      const [tokenVaultPda] = await findTokenVaultPda();

      // Get the vault's token account
      const vaultTokenAccount = await getAssociatedTokenAddress(
        SCRAPE_TOKEN_MINT,
        tokenVaultPda,
        true
      );

      // Check if the vault token account exists
      const vaultTokenAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
      if (!vaultTokenAccountInfo) {
        setStatus("Vault token account needs to be created. Please contact support or fund the wallet for transaction signing.");
        throw new Error("Vault token account not found and cannot be created without transaction signing.");
      }

      // Check if token vault is initialized
      const tokenVaultAccount = await connection.getAccountInfo(tokenVaultPda);
      if (!tokenVaultAccount) {
        setStatus("Token vault needs to be initialized. Please contact support or fund the wallet for transaction signing.");
        throw new Error("Token vault not initialized and cannot be initialized without transaction signing.");
      }

      // Check vault token account balance
      let vaultTokenAccountData = await getAccount(connection, vaultTokenAccount);
      const vaultBalance = new BN(vaultTokenAccountData.amount.toString());
      if (vaultBalance.lt(REWARD_AMOUNT)) {
        setStatus(
          `Vault Token Account Balance: ${vaultBalance.toString()} $SCRAPE lamports\n` +
          `Required: ${REWARD_AMOUNT.toString()} lamports\n` +
          `Please mint additional tokens to the vault token account using: ` +
          `spl-token mint ${SCRAPE_TOKEN_MINT.toString()} ${REWARD_AMOUNT.mul(new BN(10)).toString()} ${vaultTokenAccount.toString()} --url https://api.devnet.solana.com`
        );
        throw new Error("Insufficient vault balance and cannot mint tokens without transaction signing.");
      }

      // Get or create the user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        SCRAPE_TOKEN_MINT,
        publicKey
      );

      // Check if the user's token account exists
      let userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!userTokenAccountInfo) {
        setStatus("User's token account needs to be created. Please contact support or fund the wallet for transaction signing.");
        throw new Error("User token account not found and cannot be created without transaction signing.");
      }

      // Check the user's token account balance
      const userTokenAccountData = await getAccount(connection, userTokenAccount);
      setUserTokenAccountAddress(userTokenAccount.toString());
      setUserTokenBalance(userTokenAccountData.amount.toString());
      const userBalance = new BN(userTokenAccountData.amount.toString());
      if (userBalance.lt(REWARD_AMOUNT)) {
        setStatus(
          `User Token Account Address: ${userTokenAccount.toString()}\n` +
          `Balance: ${userBalance.toString()} $SCRAPE lamports\n` +
          `Required: ${REWARD_AMOUNT.toString()} lamports\n` +
          `Please fund the user token account using the following command:\n` +
          `spl-token mint ${SCRAPE_TOKEN_MINT.toString()} ${REWARD_AMOUNT.mul(new BN(2)).toString()} ${userTokenAccount.toString()} --url https://api.devnet.solana.com\n` +
          `Click "Continue" to proceed after funding.`
        );
        await new Promise<void>((resolve) => {
          const checkConfirmation = () => {
            if (isConfirmed) {
              setIsConfirmed(false);
              resolve();
            } else {
              setTimeout(checkConfirmation, 100);
            }
          };
          checkConfirmation();
        });

        const updatedUserTokenAccountData = await getAccount(connection, userTokenAccount);
        const updatedUserBalance = new BN(updatedUserTokenAccountData.amount.toString());
        setUserTokenBalance(updatedUserBalance.toString());
        if (updatedUserBalance.lt(REWARD_AMOUNT)) {
          throw new Error(
            `User token account still has insufficient $SCRAPE tokens after funding attempt: ${updatedUserBalance.toString()} lamports available, ${REWARD_AMOUNT.toString()} lamports required.\n` +
            `Please fund the user token account using: spl-token mint ${SCRAPE_TOKEN_MINT.toString()} ${REWARD_AMOUNT.mul(new BN(2)).toString()} ${userTokenAccount.toString()} --url https://api.devnet.solana.com`
          );
        }
        setStatus(`User token account balance: ${updatedUserBalance.toString()} $SCRAPE lamports. Sufficient for task creation.`);
      } else {
        setStatus(`User token account balance: ${userBalance.toString()} $SCRAPE lamports. Sufficient for task creation.`);
      }

      // Fetch user_id from Supabase to identify the Privy wallet
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email || "")
        .single();

      if (fetchError || !userData) {
        throw new Error("Failed to fetch user data: " + (fetchError?.message || "No data"));
      }

      const userId = userData.user_id;

      // Send the task details to the backend to create and assign the task
      setStatus("Creating and assigning task...");
      const owner = publicKey.toString();
      console.log("Sending owner to backend:", owner);

      const response = await fetch("http://localhost:3000/new-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          url,
          filter,
          label,
          format,
          params,
          owner,
          userId, // Pass user_id for Privy wallet signing
          clientPda: clientPda.toString(),
          endpointNodePda: endpointNodePda.toString(),
          taskPda: taskPda.toString(),
          tokenVaultPda: tokenVaultPda.toString(),
          vaultTokenAccount: vaultTokenAccount.toString(),
          userTokenAccount: userTokenAccount.toString(),
          reward: REWARD_AMOUNT.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);

      // Validate that walletAddress matches the owner sent to the backend
      if (walletAddress !== owner) {
        throw new Error(
          `Wallet mismatch! walletAddress (${walletAddress}) does not match owner sent to backend (${owner})`
        );
      }

      // Validate that walletAddress matches the expected signer
      const expectedSigner = new PublicKey(data.signerPubkey || data.endpointNodePubkey);
      if (!publicKey.equals(expectedSigner)) {
        throw new Error(
          `Wallet mismatch! Expected to sign with ${expectedSigner.toString()}, but current wallet is ${publicKey.toString()}`
        );
      }

      // Store task metadata in local storage
      const taskMetadata: TaskMetadata = {
        taskId: `T${taskId}`,
        downloadUrl: data.downloadUrl,
        selectedNodeOwner: data.selectedNodeOwner,
        url,
        format,
      };
      const existingTasks = JSON.parse(localStorage.getItem(`tasks_${walletAddress}`) || "[]");
      existingTasks.push(taskMetadata);
      localStorage.setItem(`tasks_${walletAddress}`, JSON.stringify(existingTasks));

      setStatus(
        `Task ${taskId} assigned successfully to node: ${data.selectedNodeOwner}.\n` +
        `The node operator will complete the task and update the node report.\n` +
        `Download URL (once completed): ${data.downloadUrl}`
      );
      navigate("/task-list");
    } catch (error) {
      console.error("Failed to create task:", error);
      setStatus("Failed to create task: " + (error as Error).message);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleContinue = () => {
    setIsConfirmed(true);
  };

  return (
    <div className="create-tasks-page page-container w-full">
      <div className="header">
        <div className="w-full">
          <button
            className="m-0 absolute back-button -translate-x-[18px] -translate-y-[4px]"
            onClick={handleBack}
          >
            ← Back
          </button>
          <h2 className="text-xl text-center font-bold">Create Task</h2>
        </div>
      </div>

      <div className="task-form mt-4">
        <div className="form-group">
          <label>URL:</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div className="form-group">
          <label>Filter:</label>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Positive Sentiment"
          />
        </div>
        <div className="form-group">
          <label>Label:</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Sentiment: Pos/Neg"
          />
        </div>
        <div className="form-group">
          <label>Format:</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="JSONL">JSONL</option>
            <option value="TFRecords">TFRecords</option>
            <option value="Parquet">Parquet</option>
          </select>
        </div>
        <div className="form-group">
          <label>Selector:</label>
          <input
            type="text"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            placeholder="h1"
          />
        </div>
        <button className="submit-button mt-4" onClick={handleSubmit}>
          Create Task
        </button>
      </div>

      {status && (
        <div className="status mt-4 text-center text-sm whitespace-pre-line">
          {status}
          {(userTokenAccountAddress && userTokenBalance && new BN(userTokenBalance).lt(REWARD_AMOUNT)) && (
            <button
              onClick={handleContinue}
              className="continue-button bg-green-500 text-white p-2 rounded mt-2"
            >
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CreateTasksPage;