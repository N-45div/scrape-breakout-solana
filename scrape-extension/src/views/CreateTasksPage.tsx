import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Connection,
  Keypair,
  Transaction,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
  createMintToInstruction,
} from "@solana/spl-token";
import { AnchorProvider } from "@project-serum/anchor";
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
  createCloseTaskInstruction,
} from "../program/program";

interface CreateTasksPageProps {
  keypair: Keypair | null;
  setIsCreatingTask: (isCreating: boolean) => void;
}

interface TaskMetadata {
  taskId: string;
  downloadUrl: string;
  selectedNodeOwner: string;
  url: string;
  format: string;
}

function CreateTasksPage({ keypair, setIsCreatingTask }: CreateTasksPageProps) {
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

  const provider = keypair
    ? new AnchorProvider(
        connection,
        {
          publicKey: keypair.publicKey,
          signTransaction: async (tx) => {
            tx.sign(keypair);
            return tx;
          },
          signAllTransactions: async (txs) => {
            txs.forEach((tx) => tx.sign(keypair));
            return txs;
          },
        },
        { commitment: "confirmed" }
      )
    : null;

  const SCRAPE_TOKEN_MINT = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
  const REWARD_AMOUNT = new BN(1000);

  const handleSubmit = async () => {
    if (!keypair || !provider) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    const currentKeypair = keypair;

    if (!url || !filter || !label || !format || !selector) {
      setStatus("Please fill in all fields.");
      return;
    }

    try {
      setIsCreatingTask(true);
      setStatus("Preparing to create task...");
      console.log("User's public key (currentKeypair.publicKey):", currentKeypair.publicKey.toString());

      // Check wallet SOL balance before proceeding
      const balance = await connection.getBalance(currentKeypair.publicKey);
      const minimumBalance = 0.01 * LAMPORTS_PER_SOL;
      if (balance < minimumBalance) {
        setStatus(
          `Insufficient SOL balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL. Need at least ${(
            minimumBalance / LAMPORTS_PER_SOL
          ).toFixed(6)} SOL. Requesting airdrop...`
        );
        const airdropSignature = await connection.requestAirdrop(
          currentKeypair.publicKey,
          1 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSignature, "confirmed");
        const newBalance = await connection.getBalance(currentKeypair.publicKey);
        setStatus(`Airdrop successful! New balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL.`);
      }

      // Ensure the Client account exists
      const [clientPda] = await findClientPda(currentKeypair.publicKey);
      let clientAccountInfo = await connection.getAccountInfo(clientPda);
      if (!clientAccountInfo) {
        setStatus("Creating Client account...");
        const createClientTx = new Transaction().add(
          createCreateClientInstruction({
            signer: currentKeypair.publicKey,
            client: clientPda,
            system_program: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
        );
        createClientTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        createClientTx.feePayer = currentKeypair.publicKey;
        createClientTx.sign(currentKeypair);
        const createClientSig = await connection.sendRawTransaction(createClientTx.serialize());
        await connection.confirmTransaction(createClientSig, "confirmed");
        setStatus("Client account created.");
        clientAccountInfo = await connection.getAccountInfo(clientPda);
      }

      // Ensure the EndpointNode account exists
      const [endpointNodePda] = await findEndpointNodePda(currentKeypair.publicKey);
      const endpointNodeAccount = await connection.getAccountInfo(endpointNodePda);
      if (!endpointNodeAccount) {
        setStatus("Creating EndpointNode account...");
        const createEndpointNodeTx = new Transaction().add(
          createCreateEndpointNodeInstruction({
            signer: currentKeypair.publicKey,
            endpoint_node: endpointNodePda,
            system_program: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
        );
        createEndpointNodeTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        createEndpointNodeTx.feePayer = currentKeypair.publicKey;
        createEndpointNodeTx.sign(currentKeypair);
        const createEndpointNodeSig = await connection.sendRawTransaction(createEndpointNodeTx.serialize());
        await connection.confirmTransaction(createEndpointNodeSig, "confirmed");
        setStatus("EndpointNode account created.");
      }

      // Fetch the task counter from the Client account
      const taskCounter = clientAccountInfo
        ? new BN(clientAccountInfo.data.slice(41, 49), "le").toNumber()
        : 0;
      const taskId = taskCounter.toString();
      const params = JSON.stringify({ selector });

      // Check if task already exists and close it if the owner doesn't match
      const [taskPda] = await findTaskPda(currentKeypair.publicKey, new BN(taskId));
      let taskAccount = await connection.getAccountInfo(taskPda);
      if (taskAccount) {
        const taskOwner = new PublicKey(taskAccount.data.slice(17, 49)); // After discriminator (8) + bump (1) + id (8)
        if (!taskOwner.equals(currentKeypair.publicKey)) {
          setStatus(
            `Task with ID ${taskId} already exists with owner ${taskOwner.toString()}. ` +
            `Please close the existing task using the owner's keypair or reset the client account.`
          );
          throw new Error(
            `Task with ID ${taskId} already exists with owner ${taskOwner.toString()}. Cannot overwrite with current wallet ${currentKeypair.publicKey.toString()}.`
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

      // Check if the vault token account exists; if not, create it
      const vaultTokenAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
      if (!vaultTokenAccountInfo) {
        setStatus("Creating vault token account...");
        const createVaultTokenAccountTx = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            currentKeypair.publicKey,
            vaultTokenAccount,
            tokenVaultPda,
            SCRAPE_TOKEN_MINT
          )
        );
        createVaultTokenAccountTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        createVaultTokenAccountTx.feePayer = currentKeypair.publicKey;
        createVaultTokenAccountTx.sign(currentKeypair);
        const createVaultTokenAccountSig = await connection.sendRawTransaction(createVaultTokenAccountTx.serialize());
        await connection.confirmTransaction(createVaultTokenAccountSig, "confirmed");
        setStatus("Vault token account created.");
      }

      // Initialize token vault if not already initialized
      const tokenVaultAccount = await connection.getAccountInfo(tokenVaultPda);
      if (!tokenVaultAccount) {
        setStatus("Initializing token vault...");
        const initTokenVaultTx = new Transaction().add(
          createInitTokenVaultInstruction({
            signer: currentKeypair.publicKey,
            token_vault: tokenVaultPda,
            vault_token_account: vaultTokenAccount,
            system_program: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
        );
        initTokenVaultTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        initTokenVaultTx.feePayer = currentKeypair.publicKey;
        initTokenVaultTx.sign(currentKeypair);
        const initTokenVaultSig = await connection.sendRawTransaction(initTokenVaultTx.serialize());
        await connection.confirmTransaction(initTokenVaultSig, "confirmed");
        setStatus("Token vault initialized.");
      }

      // Check vault token account balance and mint tokens if necessary
      let vaultTokenAccountData = await getAccount(connection, vaultTokenAccount);
      const vaultBalance = new BN(vaultTokenAccountData.amount.toString());
      if (vaultBalance.lt(REWARD_AMOUNT)) {
        setStatus(
          `Vault Token Account Balance: ${vaultBalance.toString()} $SCRAPE lamports\n` +
          `Required: ${REWARD_AMOUNT.toString()} lamports\n` +
          `Minting additional tokens to vault token account...`
        );
        const mintAmount = REWARD_AMOUNT.mul(new BN(10)).toNumber();
        const mintToTx = new Transaction().add(
          createMintToInstruction(
            SCRAPE_TOKEN_MINT,
            vaultTokenAccount,
            currentKeypair.publicKey,
            mintAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
        mintToTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        mintToTx.feePayer = currentKeypair.publicKey;
        mintToTx.sign(currentKeypair);
        try {
          const mintToSignature = await connection.sendRawTransaction(mintToTx.serialize());
          await connection.confirmTransaction(mintToSignature, "confirmed");
          setStatus(`Tokens minted to vault! Transaction: ${mintToSignature}`);
        } catch (mintError) {
          setStatus(
            `Failed to mint tokens to vault: ${(mintError as Error).message}\n` +
            `Please manually mint tokens using: spl-token mint ${SCRAPE_TOKEN_MINT.toString()} ${mintAmount} ${vaultTokenAccount.toString()} --url https://api.devnet.solana.com`
          );
        }
        vaultTokenAccountData = await getAccount(connection, vaultTokenAccount);
      }

      // Get or create the user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        SCRAPE_TOKEN_MINT,
        currentKeypair.publicKey
      );

      // Check if the user's token account exists; if not, create it
      let userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!userTokenAccountInfo) {
        setStatus("Creating user's token account...");
        const createUserTokenAccountTx = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            currentKeypair.publicKey,
            userTokenAccount,
            currentKeypair.publicKey,
            SCRAPE_TOKEN_MINT
          )
        );
        createUserTokenAccountTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        createUserTokenAccountTx.feePayer = currentKeypair.publicKey;
        createUserTokenAccountTx.sign(currentKeypair);
        const createUserTokenAccountSig = await connection.sendRawTransaction(createUserTokenAccountTx.serialize());
        await connection.confirmTransaction(createUserTokenAccountSig, "confirmed");
        setStatus("User's token account created.");
        userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
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

      // Create the Task account on-chain using create_task instruction
      setStatus("Creating task on-chain...");
      const createTaskTx = new Transaction().add(
        createCreateTaskInstruction({
          signer: currentKeypair.publicKey,
          task: taskPda,
          client: clientPda,
          endpoint_node: endpointNodePda,
          token_vault: tokenVaultPda,
          vault_token_account: vaultTokenAccount,
          user_token_account: userTokenAccount,
          system_program: SystemProgram.programId,
          token_program: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        }, {
          url,
          filter,
          label,
          format,
          reward: REWARD_AMOUNT,
        })
      );
      createTaskTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      createTaskTx.feePayer = currentKeypair.publicKey;
      createTaskTx.sign(currentKeypair);
      let createTaskSig;
      try {
        createTaskSig = await connection.sendRawTransaction(createTaskTx.serialize());
        await connection.confirmTransaction(createTaskSig, "confirmed");
      } catch (error) {
        console.error("Create Task Error:", error);
        throw new Error(`Failed to create task: ${(error as Error).message}`);
      }
      setStatus("Task created on-chain.");

      // Debug: Fetch task account data to verify owner
      taskAccount = await connection.getAccountInfo(taskPda);
      if (taskAccount) {
        const taskOwner = new PublicKey(taskAccount.data.slice(17, 49));
        console.log("Task Owner:", taskOwner.toString());
        if (!taskOwner.equals(currentKeypair.publicKey)) {
          throw new Error(
            `Task owner mismatch! Expected ${currentKeypair.publicKey.toString()}, but found ${taskOwner.toString()}`
          );
        }
        setStatus(`Task created on-chain. Task Owner: ${taskOwner.toString()}`);
      } else {
        setStatus("Task created but account not found on-chain.");
      }

      // Now send the task details to the backend to assign the task
      setStatus("Assigning task...");
      const owner = currentKeypair.publicKey.toString();
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
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);

      // Validate that currentKeypair.publicKey matches the owner sent to the backend
      if (currentKeypair.publicKey.toString() !== owner) {
        throw new Error(
          `Wallet mismatch! currentKeypair.publicKey (${currentKeypair.publicKey.toString()}) does not match owner sent to backend (${owner})`
        );
      }

      // Validate that currentKeypair.publicKey matches the expected signer
      const expectedSigner = new PublicKey(data.signerPubkey || data.endpointNodePubkey);
      if (!currentKeypair.publicKey.equals(expectedSigner)) {
        throw new Error(
          `Wallet mismatch! Expected to sign with ${expectedSigner.toString()}, but current wallet is ${currentKeypair.publicKey.toString()}`
        );
      }

      // Sign and send the assign_task_by_endpoint transaction
      const assignTaskTx = Transaction.from(Buffer.from(data.assignTaskTx, "base64"));
      assignTaskTx.sign(currentKeypair);
      const assignTaskSignature = await connection.sendRawTransaction(assignTaskTx.serialize());
      await connection.confirmTransaction(assignTaskSignature, "confirmed");
      console.log("Task assigned. Signature:", assignTaskSignature);

      // Store task metadata in local storage
      const taskMetadata: TaskMetadata = {
        taskId: `T${taskId}`,
        downloadUrl: data.downloadUrl,
        selectedNodeOwner: data.selectedNodeOwner,
        url,
        format,
      };
      const existingTasks = JSON.parse(localStorage.getItem(`tasks_${currentKeypair.publicKey.toString()}`) || "[]");
      existingTasks.push(taskMetadata);
      localStorage.setItem(`tasks_${currentKeypair.publicKey.toString()}`, JSON.stringify(existingTasks));

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