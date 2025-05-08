import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import {
  findProviderNodePda,
  findTaskPda,
  findClientPda,
  createCompleteTaskInstruction,
  PROGRAM_ID,
  findTokenVaultPda,
} from "../program/program";
import { load } from "cheerio";

type AssignedTask = {
  id: string;
  status: "Assigned" | "Done";
  url: string;
  filter: string;
  label: string;
  format: string;
  action: "Complete" | "Claim Reward";
};

interface NodeTasksPageProps {
  keypair: Keypair | null;
}

function NodeTasksPage({ keypair }: NodeTasksPageProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [status, setStatus] = useState("");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const fetchAssignedTasks = async () => {
    if (!keypair) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setStatus("Fetching assigned tasks...");

      // Get the ProviderNode PDA
      const [providerNodePda, providerNodeBump] = await findProviderNodePda(keypair.publicKey);
      const nodeAccountInfo = await connection.getAccountInfo(providerNodePda);
      if (!nodeAccountInfo) {
        setStatus("ProviderNode not found. Please create a node first.");
        navigate("/create-node");
        return;
      }

      // Fetch tasks created by the user (from Client account)
      const [clientPda, clientBump] = await findClientPda(keypair.publicKey);
      const clientAccountInfo = await connection.getAccountInfo(clientPda);
      if (!clientAccountInfo) {
        setStatus("No tasks found. Please create a task first.");
        setTasks([]);
        return;
      }

      const taskCounter = new BN(clientAccountInfo.data.slice(41, 49), "le").toNumber();

      // Fetch tasks and filter those assigned to this node
      const taskPromises: Promise<AssignedTask | null>[] = [];
      for (let id = 0; id < taskCounter; id++) {
        taskPromises.push(fetchTask(keypair.publicKey, id, providerNodePda));
      }
      const taskResults = await Promise.all(taskPromises);
      const assignedTasks = taskResults.filter((task): task is AssignedTask => task !== null);
      setTasks(assignedTasks);
      setStatus(assignedTasks.length > 0 ? "Assigned tasks loaded successfully." : "No assigned tasks found.");
    } catch (error) {
      console.error("Failed to fetch assigned tasks:", error);
      setStatus("Failed to load tasks: " + (error as Error).message);
      setTasks([]);
    }
  };

  useEffect(() => {
    fetchAssignedTasks();

    // Refresh tasks every 30 seconds
    const interval = setInterval(() => {
      fetchAssignedTasks();
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [keypair, navigate]);

  const fetchTask = async (
    owner: PublicKey,
    id: number,
    nodePda: PublicKey
  ): Promise<AssignedTask | null> => {
    try {
      const [taskPda, taskBump] = await findTaskPda(owner, new BN(id));
      const taskAccountInfo = await connection.getAccountInfo(taskPda);
      if (!taskAccountInfo) return null;

      const data = taskAccountInfo.data;
      let offset = 8 + 1; // Skip discriminator, bump
      const taskId = new BN(data.slice(offset, offset + 8), "le").toNumber();
      offset += 8 + 32 + 32; // id, owner, endpoint_node

      // Parse URL
      const urlLength = data.readUInt32LE(offset);
      offset += 4;
      const url = data.slice(offset, offset + urlLength).toString();
      offset += urlLength;

      // Parse filter
      const filterLength = data.readUInt32LE(offset);
      offset += 4;
      const filter = data.slice(offset, offset + filterLength).toString();
      offset += filterLength;

      // Parse label
      const labelLength = data.readUInt32LE(offset);
      offset += 4;
      const label = data.slice(offset, offset + labelLength).toString();
      offset += labelLength;

      // Parse format
      const formatLength = data.readUInt32LE(offset);
      offset += 4;
      const format = data.slice(offset, offset + formatLength).toString();
      offset += formatLength;

      offset += 8; // reward
      const statusByte = data[offset];
      const taskStatus = statusByte === 0 ? "Pending" : statusByte === 1 ? "Assigned" : "Done";
      offset += 1;

      const nodeAssignedFlag = data[offset];
      if (nodeAssignedFlag !== 1) return null; // Not assigned
      offset += 1;
      const assignedNode = new PublicKey(data.slice(offset, offset + 32));
      if (!assignedNode.equals(nodePda)) return null; // Assigned to a different node

      const ipfsHashFlag = data[offset + 32];
      const hasIpfsHash = ipfsHashFlag === 1;

      let action: "Complete" | "Claim Reward" = "Complete";
      if (taskStatus === "Done" && hasIpfsHash) {
        action = "Claim Reward";
      }

      return {
        id: `T${taskId}`,
        status: taskStatus === "Done" ? "Done" : "Assigned",
        url,
        filter,
        label,
        format,
        action,
      };
    } catch (error) {
      console.error(`Failed to fetch task ${id}:`, error);
      return null;
    }
  };

  const handleCompleteTask = async (task: AssignedTask) => {
    if (!keypair) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    if (task.action !== "Complete") return;

    try {
      setStatus(`Scraping ${task.url} for task ${task.id}...`);

      // Step 1: Fetch the HTML content
      const response = await fetch(task.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const html = await response.text();

      // Step 2: Parse HTML and apply filters
      const $ = load(html);
      const elements = $(task.filter); // Use the CSS selector from the task
      const scrapedData: Record<string, string>[] = [];
      elements.each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          const item: Record<string, string> = {};
          item[task.label] = text; // Use the label from the task
          scrapedData.push(item);
        }
      });

      if (scrapedData.length === 0) {
        throw new Error("No data matched the filter.");
      }

      // Step 3: Format as JSONL
      let formattedData = "";
      if (task.format.toLowerCase() === "jsonl") {
        formattedData = scrapedData.map(item => JSON.stringify(item)).join("\n");
      } else {
        throw new Error(`Unsupported format: ${task.format}`);
      }

      // Step 4: Upload to Supabase Storage via backend
      setStatus(`Uploading scraped data for task ${task.id} to Supabase Storage via backend...`);
      const uploadResponse = await fetch("http://localhost:3000/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: task.id,
          data: formattedData,
        }),
      });
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to Supabase via backend: ${uploadResponse.statusText}`);
      }
      const { downloadUrl } = await uploadResponse.json();

      // Step 5: Submit the complete_task instruction
      setStatus(`Completing task ${task.id} on-chain...`);
      const taskId = parseInt(task.id.replace("T", ""));
      const [taskPda, taskBump] = await findTaskPda(keypair.publicKey, new BN(taskId));
      const [providerNodePda, providerNodeBump] = await findProviderNodePda(keypair.publicKey);

      // Derive the token vault PDA
      const [tokenVaultPda, tokenVaultBump] = await findTokenVaultPda();

      // $SCRAPE token mint
      const tokenMint = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");

      // Derive the associated token accounts
      const vaultTokenAccount = await getAssociatedTokenAddress(tokenMint, tokenVaultPda, true);
      const nodeTokenAccount = await getAssociatedTokenAddress(tokenMint, keypair.publicKey);

      const completeTaskIx = createCompleteTaskInstruction({
        task: taskPda,
        node: providerNodePda,
        token_vault: tokenVaultPda,
        vault_token_account: vaultTokenAccount,
        node_token_account: nodeTokenAccount,
        signer: keypair.publicKey,
        token_program: TOKEN_PROGRAM_ID,
      }, {
        ipfs_hash: downloadUrl, // Store the Supabase URL
      });

      const tx = new Transaction().add(completeTaskIx);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = keypair.publicKey;
      tx.sign(keypair);
      const signature = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      // Refresh the task list
      const updatedTask = await fetchTask(keypair.publicKey, taskId, providerNodePda);
      if (updatedTask) {
        setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
      }

      setStatus(`Task ${task.id} completed successfully! Download URL: ${downloadUrl}. Transaction: ${signature}`);
    } catch (error) {
      console.error(`Failed to complete task ${task.id}:`, error);
      if ((error as any).logs) {
        console.error("Transaction Logs:", (error as any).logs);
      }
      setStatus(`Failed to complete task ${task.id}: ${(error as Error).message}`);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="node-tasks-page page-container w-full">
      <div className="header">
        <div className="w-full">
          <button
            className="m-0 absolute back-button -translate-x-[18px] -translate-y-[4px]"
            onClick={handleBack}
          >
            ← Back
          </button>
          <h2 className="text-xl text-center font-bold">Assigned Tasks</h2>
        </div>
      </div>

      <div className="task-list mt-4">
        {tasks.length === 0 ? (
          <p className="text-center">No assigned tasks available.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>URL</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.id}</td>
                  <td>{task.url}</td>
                  <td>
                    <span
                      className={task.status === "Done" ? "active" : "inactive"}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`action-button ${task.action === "Complete" ? "submit-button" : "claim-button"}`}
                      onClick={() => handleCompleteTask(task)}
                      disabled={task.action !== "Complete"}
                    >
                      {task.action}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {status && (
        <div className="status mt-4 text-center text-sm whitespace-pre-line">
          {status}
        </div>
      )}
    </div>
  );
}

export default NodeTasksPage;