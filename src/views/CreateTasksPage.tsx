import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  getAccount,
  createMintToInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  findClientPda,
  findTaskPda,
  findEndpointNodePda,
  findTokenVaultPda,
  createCreateClientInstruction,
  createCreateEndpointNodeInstruction,
  createInitTokenVaultInstruction,
  createCreateTaskInstruction,
} from "../program/program";

interface CreateTasksPageProps {
  keypair: Keypair | null;
}

async function fetchClientTaskCounter(
  connection: Connection,
  client: PublicKey
): Promise<BN> {
  const accountInfo = await connection.getAccountInfo(client);
  if (!accountInfo) {
    return new BN(0); // Client not initialized, start at 0
  }
  const data = accountInfo.data;
  const taskCounter = new BN(data.slice(33, 41), 'le'); // Skip bump (1) + owner (32) = 33 bytes
  return taskCounter;
}

function CreateTasksPage({ keypair }: CreateTasksPageProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    url: "https://example.com",
    params: '{"selector": ".price"}',
    filter: "Positive Sentiment",
    label: "Sentiment: Pos/Neg",
    format: "JSONL",
  });
  const [status, setStatus] = useState("");
  const [taskCounter, setTaskCounter] = useState<BN>(new BN(0));
  const [vaultTokenAccountAddress, setVaultTokenAccountAddress] = useState<string | null>(null);
  const [vaultBalance, setVaultBalance] = useState<string | null>(null);
  const [userTokenAccountAddress, setUserTokenAccountAddress] = useState<string | null>(null);
  const [userTokenBalance, setUserTokenBalance] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keypair) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setStatus("Submitting task...");

      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );

      // Log the wallet public key for debugging
      console.log("Wallet Public Key in Extension:", keypair.publicKey.toString());

      // Check wallet balance before proceeding
      const balance = await connection.getBalance(keypair.publicKey);
      const minimumBalance = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL for fees, rent, and token account creation
      if (balance < minimumBalance) {
        setStatus(
          `Insufficient balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL. Need at least ${(
            minimumBalance / LAMPORTS_PER_SOL
          ).toFixed(6)} SOL. Requesting airdrop...`
        );

        // Request airdrop programmatically (for devnet only)
        try {
          const airdropSignature = await connection.requestAirdrop(
            keypair.publicKey,
            1 * LAMPORTS_PER_SOL // Request 1 SOL
          );
          await connection.confirmTransaction(airdropSignature, "confirmed");
          const newBalance = await connection.getBalance(keypair.publicKey);
          setStatus(`Airdrop successful! New balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL.`);
        } catch (airdropError) {
          throw new Error(
            "Failed to airdrop SOL. Please manually airdrop SOL to your wallet using: solana airdrop 2 <YOUR_WALLET_ADDRESS> --url https://api.devnet.solana.com"
          );
        }
      }

      // Derive PDAs for accounts
      const [client, clientBump] = await findClientPda(keypair.publicKey);
      const [endpointNode, endpointNodeBump] = await findEndpointNodePda(
        keypair.publicKey
      );
      const [tokenVault, tokenVaultBump] = await findTokenVaultPda();

      // Initialize client if not already initialized
      try {
        const clientAccount = await connection.getAccountInfo(client);
        if (!clientAccount) {
          setStatus("Initializing client account...");
          const createClientIx = createCreateClientInstruction({
            signer: keypair.publicKey,
            client,
            system_program: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          });
          const tx = new Transaction().add(createClientIx);
          tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          tx.feePayer = keypair.publicKey;
          tx.sign(keypair);
          const signature = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction(signature, "confirmed");
          setStatus(`Client initialized! Transaction: ${signature}`);
        }
      } catch (error) {
        throw new Error("Failed to initialize client: " + error.message);
      }

      // Fetch task counter from the Client account
      let fetchedTaskCounter: BN;
      try {
        fetchedTaskCounter = await fetchClientTaskCounter(connection, client);
        setTaskCounter(fetchedTaskCounter);
        setStatus(`Fetched task counter: ${fetchedTaskCounter.toString()}`);
      } catch (error) {
        throw new Error("Failed to fetch task counter: " + error.message);
      }

      // Initialize endpoint node if not already initialized
      try {
        const endpointNodeAccount = await connection.getAccountInfo(endpointNode);
        if (!endpointNodeAccount) {
          setStatus("Initializing endpoint node...");
          const createEndpointNodeIx = createCreateEndpointNodeInstruction({
            signer: keypair.publicKey,
            endpoint_node: endpointNode,
            system_program: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          });
          const tx = new Transaction().add(createEndpointNodeIx);
          tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          tx.feePayer = keypair.publicKey;
          tx.sign(keypair);
          const signature = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction(signature, "confirmed");
          setStatus(`Endpoint node initialized! Transaction: ${signature}`);
        }
      } catch (error) {
        throw new Error("Failed to initialize endpoint node: " + error.message);
      }

      // Create the associated token account for the vault using SCRAPE_MINT
      let vaultTokenAccount: PublicKey;
      let tokenMint: PublicKey;
      try {
        // Use SCRAPE_MINT from the program
        const SCRAPE_MINT = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
        tokenMint = SCRAPE_MINT;

        // Create the associated token account for the vault
        vaultTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          tokenVault,
          true // Allow owner off-curve (since tokenVault is a PDA)
        );

        // Log the vault token account address immediately
        console.log("Vault Token Account Address (Before Creation):", vaultTokenAccount.toString());
        setVaultTokenAccountAddress(vaultTokenAccount.toString());
        setStatus(`Vault Token Account Address: ${vaultTokenAccount.toString()}. Checking if it exists...`);

        // Check if the vault token account already exists
        const vaultTokenAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
        if (!vaultTokenAccountInfo) {
          setStatus("Creating vault token account...");
          const createAtaTx = new Transaction().add(
            createAssociatedTokenAccountInstruction(
              keypair.publicKey, // Payer
              vaultTokenAccount, // ATA
              tokenVault, // Owner (the token vault PDA)
              tokenMint, // Mint
              TOKEN_PROGRAM_ID
            )
          );
          createAtaTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          createAtaTx.feePayer = keypair.publicKey;
          createAtaTx.sign(keypair);

          // Send and confirm the transaction with better error handling
          let ataSignature: string;
          try {
            ataSignature = await connection.sendRawTransaction(createAtaTx.serialize(), {
              skipPreflight: false, // Run preflight checks to catch errors early
              maxRetries: 3, // Retry up to 3 times in case of network issues
            });
            const confirmation = await connection.confirmTransaction(ataSignature, "confirmed");
            if (confirmation.value.err) {
              throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }
            setStatus(`Vault token account created! Transaction: ${ataSignature}`);
          } catch (txError) {
            console.error("Vault token account creation failed:", txError);
            throw new Error(`Failed to create vault token account: ${txError.message}. Please ensure your wallet has enough SOL (at least 0.002 SOL for rent).`);
          }

          // Double-check that the account was created
          const vaultTokenAccountInfoAfter = await connection.getAccountInfo(vaultTokenAccount);
          if (!vaultTokenAccountInfoAfter) {
            throw new Error(
              `Vault token account (${vaultTokenAccount.toString()}) was not created despite transaction confirmation. Please create it manually using: ` +
              `spl-token create-account 6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3 --owner ${tokenVault.toString()} --url https://api.devnet.solana.com`
            );
          }
        } else {
          setStatus("Vault token account already exists.");
        }

        // Log the vault token account address again for confirmation
        console.log("Vault Token Account Address (After Creation):", vaultTokenAccount.toString());

        // Check the balance of the vault token account
        let vaultTokenAccountData;
        try {
          vaultTokenAccountData = await getAccount(connection, vaultTokenAccount);
          setVaultBalance(vaultTokenAccountData.amount.toString());
          setStatus(
            `Vault Token Account Address: ${vaultTokenAccount.toString()}\n` +
            `Balance: ${vaultTokenAccountData.amount.toString()} $SCRAPE lamports\n` +
            `Required: 100000 lamports (0.0001 $SCRAPE)`
          );
        } catch (error) {
          throw new Error(
            `Vault token account not initialized properly: ${error.message}. ` +
            `Please ensure the account is created and funded using: spl-token mint 6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3 1000000 ${vaultTokenAccount.toString()} --url https://api.devnet.solana.com`
          );
        }

        const rewardAmount = new BN(100000); // 0.0001 $SCRAPE (assuming 9 decimals)
        const currentBalance = new BN(vaultTokenAccountData.amount.toString());
        if (currentBalance.lt(rewardAmount)) {
          // Mint tokens to the vault token account if balance is insufficient
          setStatus(
            `Vault Token Account Address: ${vaultTokenAccount.toString()}\n` +
            `Balance: ${currentBalance.toString()} $SCRAPE lamports\n` +
            `Required: ${rewardAmount.toString()} lamports (0.0001 $SCRAPE)\n` +
            `Minting additional tokens to vault token account...`
          );
          const mintAmount = 1000000; // 0.001 $SCRAPE
          const mintToTx = new Transaction().add(
            createMintToInstruction(
              tokenMint,
              vaultTokenAccount,
              keypair.publicKey, // Mint authority (must be the extension's keypair)
              mintAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          );
          mintToTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          mintToTx.feePayer = keypair.publicKey;
          mintToTx.sign(keypair);
          const mintToSignature = await connection.sendRawTransaction(mintToTx.serialize());
          await connection.confirmTransaction(mintToSignature, "confirmed");
          setStatus(`Tokens minted to vault! Transaction: ${mintToSignature}`);

          // Re-check the balance after minting
          const updatedVaultTokenAccountData = await getAccount(connection, vaultTokenAccount);
          const updatedBalance = new BN(updatedVaultTokenAccountData.amount.toString());
          setVaultBalance(updatedBalance.toString());
          if (updatedBalance.lt(rewardAmount)) {
            throw new Error(
              `Vault token account still has insufficient $SCRAPE tokens after minting: ${updatedBalance.toString()} lamports available, ${rewardAmount.toString()} lamports required. ` +
              `Please ensure the wallet has mint authority and fund the vault token account using: spl-token mint 6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3 1000000 ${vaultTokenAccount.toString()} --url https://api.devnet.solana.com`
            );
          }
          setStatus(`Vault token account balance: ${updatedBalance.toString()} $SCRAPE lamports. Sufficient for task creation.`);
        } else {
          setStatus(`Vault token account balance: ${currentBalance.toString()} $SCRAPE lamports. Sufficient for task creation.`);
        }
      } catch (error) {
        throw new Error("Failed to create or validate vault token account: " + error.message);
      }

      // Initialize token vault if not already initialized
      try {
        const tokenVaultAccount = await connection.getAccountInfo(tokenVault);
        if (!tokenVaultAccount) {
          setStatus("Initializing token vault...");
          const initTokenVaultIx = createInitTokenVaultInstruction({
            signer: keypair.publicKey,
            token_vault: tokenVault,
            vault_token_account: vaultTokenAccount,
            system_program: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          });
          const tx = new Transaction().add(initTokenVaultIx);
          tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          tx.feePayer = keypair.publicKey;
          tx.sign(keypair);
          const signature = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction(signature, "confirmed");
          setStatus(`Token vault initialized! Transaction: ${signature}`);
        }
      } catch (error) {
        throw new Error("Failed to initialize token vault: " + error.message);
      }

      // Create a user token account for the signer
      let userTokenAccount: PublicKey;
      try {
        userTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          keypair.publicKey
        );

        // Log the user token account address
        console.log("User Token Account Address:", userTokenAccount.toString());
        setUserTokenAccountAddress(userTokenAccount.toString());

        // Check if the user token account already exists
        const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
        if (!userTokenAccountInfo) {
          setStatus("Creating user token account...");

          // Ensure the wallet has enough SOL to create the ATA (~0.002 SOL)
          const ataRentExemption = await connection.getMinimumBalanceForRentExemption(165); // 165 bytes for a token account
          const currentBalance = await connection.getBalance(keypair.publicKey);
          if (currentBalance < ataRentExemption) {
            setStatus(
              `Insufficient SOL to create user token account: ${(currentBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL available, ` +
              `${(ataRentExemption / LAMPORTS_PER_SOL).toFixed(6)} SOL required. Requesting airdrop...`
            );
            const airdropSignature = await connection.requestAirdrop(
              keypair.publicKey,
              1 * LAMPORTS_PER_SOL // Request 1 SOL
            );
            await connection.confirmTransaction(airdropSignature, "confirmed");
            const newBalance = await connection.getBalance(keypair.publicKey);
            setStatus(`Airdrop successful! New balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL.`);
          }

          const createUserAtaTx = new Transaction().add(
            createAssociatedTokenAccountInstruction(
              keypair.publicKey, // Payer
              userTokenAccount, // ATA
              keypair.publicKey, // Owner
              tokenMint, // Mint
              TOKEN_PROGRAM_ID
            )
          );
          createUserAtaTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          createUserAtaTx.feePayer = keypair.publicKey;
          createUserAtaTx.sign(keypair);

          let userAtaSignature: string;
          try {
            userAtaSignature = await connection.sendRawTransaction(createUserAtaTx.serialize(), {
              skipPreflight: false,
              maxRetries: 3,
            });
            const confirmation = await connection.confirmTransaction(userAtaSignature, "confirmed");
            if (confirmation.value.err) {
              throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }
            setStatus(`User token account created! Transaction: ${userAtaSignature}`);
          } catch (txError) {
            console.error("User token account creation failed:", txError);
            throw new Error(
              `Failed to create user token account: ${txError.message}. ` +
              `Please ensure your wallet has enough SOL (~0.002 SOL) and try again.`
            );
          }

          // Double-check that the account was created
          const userTokenAccountInfoAfter = await connection.getAccountInfo(userTokenAccount);
          if (!userTokenAccountInfoAfter) {
            throw new Error(
              `User token account (${userTokenAccount.toString()}) was not created despite transaction confirmation. ` +
              `Please create it manually using: spl-token create-account 6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3 --url https://api.devnet.solana.com`
            );
          }
        } else {
          setStatus("User token account already exists.");
        }

        // Verify the token account is owned by the SPL Token Program
        const userTokenAccountData = await getAccount(connection, userTokenAccount);
        if (userTokenAccountData.owner.toString() !== keypair.publicKey.toString()) {
          throw new Error(
            `User token account (${userTokenAccount.toString()}) is not owned by the expected owner (${keypair.publicKey.toString()}).`
          );
        }

        // Check the balance of the user token account
        setUserTokenBalance(userTokenAccountData.amount.toString());
        const userBalance = new BN(userTokenAccountData.amount.toString());
        const rewardAmount = new BN(100000); // 0.0001 $SCRAPE
        if (userBalance.lt(rewardAmount)) {
          setStatus(
            `User Token Account Address: ${userTokenAccount.toString()}\n` +
            `Balance: ${userBalance.toString()} $SCRAPE lamports\n` +
            `Required: ${rewardAmount.toString()} lamports (0.0001 $SCRAPE)\n` +
            `Please fund the user token account using the following command:\n` +
            `spl-token mint 6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3 1000000 ${userTokenAccount.toString()} --url https://api.devnet.solana.com\n` +
            `Click "Continue" to proceed after funding.`
          );
          // Wait for user confirmation
          await new Promise<void>((resolve) => {
            const checkConfirmation = () => {
              if (isConfirmed) {
                setIsConfirmed(false); // Reset confirmation
                resolve();
              } else {
                setTimeout(checkConfirmation, 100);
              }
            };
            checkConfirmation();
          });

          // Re-check the balance after user confirmation
          const updatedUserTokenAccountData = await getAccount(connection, userTokenAccount);
          const updatedUserBalance = new BN(updatedUserTokenAccountData.amount.toString());
          setUserTokenBalance(updatedUserBalance.toString());
          if (updatedUserBalance.lt(rewardAmount)) {
            throw new Error(
              `User token account still has insufficient $SCRAPE tokens after funding attempt: ${updatedUserBalance.toString()} lamports available, ${rewardAmount.toString()} lamports required. ` +
              `Please fund the user token account using: spl-token mint 6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3 1000000 ${userTokenAccount.toString()} --url https://api.devnet.solana.com`
            );
          }
          setStatus(`User token account balance: ${updatedUserBalance.toString()} $SCRAPE lamports. Sufficient for task creation.`);
        } else {
          setStatus(`User token account balance: ${userBalance.toString()} $SCRAPE lamports. Sufficient for task creation.`);
        }
      } catch (error) {
        throw new Error("Failed to create or validate user token account: " + error.message);
      }

      // Derive task PDA with the fetched task counter
      const [task, taskBump] = await findTaskPda(
        keypair.publicKey,
        taskCounter
      );

      // Log the derived task PDA for debugging
      console.log("Derived Task PDA:", task.toString());
      console.log("Task Bump:", taskBump);
      console.log("Task Counter Used:", taskCounter.toString());

      // Compare with expected PDA from logs (if applicable)
      const expectedTaskPda = new PublicKey("5Fwhjh82wWNwMUsXNM1LskB2suddZu87vypE77xKjS6U");
      if (!task.equals(expectedTaskPda)) {
        console.warn(
          `Derived Task PDA (${task.toString()}) does not match expected PDA (${expectedTaskPda.toString()}). ` +
          `Please verify the program ID, seeds, and task counter.`
        );
      }

      // Create task instruction
      const createTaskIx = createCreateTaskInstruction(
        {
          signer: keypair.publicKey,
          task,
          client,
          endpoint_node: endpointNode,
          token_vault: tokenVault,
          vault_token_account: vaultTokenAccount,
          user_token_account: userTokenAccount,
          system_program: SystemProgram.programId,
          token_program: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        },
        {
          url: formData.url,
          filter: formData.filter,
          label: formData.label,
          format: formData.format,
          reward: new BN(100000), // 0.0001 $SCRAPE (assuming 9 decimals)
        }
      );

      // Send transaction with skipPreflight to get better logs if it fails
      const tx = new Transaction().add(createTaskIx);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = keypair.publicKey;
      tx.sign(keypair);
      let signature: string;
      try {
        signature = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        });
        await connection.confirmTransaction(signature, "confirmed");
      } catch (error: any) {
        if (error.logs) {
          console.error("Transaction Logs:", error.logs);
          throw new Error(`Failed to create task. Transaction Logs: ${JSON.stringify(error.logs)}`);
        }
        throw error;
      }

      setStatus(`Task created successfully! Transaction: ${signature}`);

      // Notify the backend about the new task
      try {
        const taskId = taskCounter.toString(); // Use the taskCounter as the taskId
        const response = await fetch("http://localhost:3000/new-task", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId,
            url: formData.url,
            filter: formData.filter,
            label: formData.label,
            format: formData.format,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to notify backend: ${response.statusText}`);
        }

        const result = await response.json();
        setStatus((prev) => `${prev}\nNotified backend: ${result.message}`);
      } catch (error) {
        console.error("Error notifying backend:", error);
        setStatus((prev) => `${prev}\nFailed to notify backend: ${error.message}`);
      }

      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error(error);
      if (error.logs) {
        console.error("Transaction Logs:", error.logs);
      }
      setStatus("Failed to create task: " + (error.message || error.toString()));
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  const handleContinue = () => {
    setIsConfirmed(true);
  };

  return (
    <div className="page-container w-full">
      <div className="header flex justify-center mb-4">
        <h2 className="text-xl font-bold">Create Tasks</h2>
      </div>

      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group mb-4">
          <label className="block mb-1">URL:</label>
          <input
            type="text"
            name="url"
            value={formData.url}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Params:</label>
          <input
            type="text"
            name="params"
            value={formData.params}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Filter:</label>
          <input
            type="text"
            name="filter"
            value={formData.filter}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Label:</label>
          <input
            type="text"
            name="label"
            value={formData.label}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Format:</label>
          <input
            type="text"
            name="format"
            value={formData.format}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="form-actions flex justify-center gap-4">
          <button
            type="submit"
            className="submit-button bg-blue-500 text-white p-2 rounded"
          >
            Submit Task
          </button>
          <button
            type="button"
            className="cancel-button bg-gray-500 text-white p-2 rounded"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </form>

      {status && (
        <div className="status mt-4 text-center text-sm whitespace-pre-line">
          {status}
          {(userTokenAccountAddress && userTokenBalance && new BN(userTokenBalance).lt(new BN(100000))) && (
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