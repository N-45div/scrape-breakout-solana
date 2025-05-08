import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { findClientPda, findTaskPda, PROGRAM_ID } from "../program/program";

type Task = {
  id: string;
  status: "Pending" | "Assigned" | "Done";
  url: string;
  format: string;
  ipfsHash: string | null; // Now a Supabase public URL
};

interface TaskListPageProps {
  keypair: Keypair | null;
}

function TaskListPage({ keypair }: TaskListPageProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState("");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const fetchTasks = async () => {
    if (!keypair) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setStatus("Fetching tasks...");

      // Fetch the Client PDA
      const [clientPda, clientBump] = await findClientPda(keypair.publicKey);
      const clientAccountInfo = await connection.getAccountInfo(clientPda);
      if (!clientAccountInfo) {
        setStatus("No tasks found. Please create a task first.");
        setTasks([]);
        return;
      }

      // Get the task counter
      const taskCounter = new BN(clientAccountInfo.data.slice(41, 49), "le").toNumber();

      // Fetch all tasks
      const taskPromises: Promise<Task | null>[] = [];
      for (let id = 0; id < taskCounter; id++) {
        taskPromises.push(fetchTask(keypair.publicKey, id));
      }
      const taskResults = await Promise.all(taskPromises);
      const fetchedTasks = taskResults.filter((task): task is Task => task !== null);
      setTasks(fetchedTasks);
      setStatus(fetchedTasks.length > 0 ? "Tasks loaded successfully." : "No tasks found.");
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setStatus("Failed to load tasks: " + (error as Error).message);
      setTasks([]);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Refresh tasks every 30 seconds
    const interval = setInterval(() => {
      fetchTasks();
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [keypair]);

  const fetchTask = async (owner: PublicKey, id: number): Promise<Task | null> => {
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

      // Skip filter, label
      for (let i = 0; i < 2; i++) {
        const strLength = data.readUInt32LE(offset);
        offset += 4 + strLength;
      }

      // Parse format
      const formatLength = data.readUInt32LE(offset);
      offset += 4;
      const format = data.slice(offset, offset + formatLength).toString();
      offset += formatLength;

      offset += 8; // reward
      const statusByte = data[offset];
      const taskStatus = statusByte === 0 ? "Pending" : statusByte === 1 ? "Assigned" : "Done";
      offset += 1 + 1 + 32; // status, node_assigned_flag, assigned_node

      // Parse ipfs_hash (now a Supabase public URL)
      const ipfsHashFlag = data[offset];
      let ipfsHash: string | null = null;
      if (ipfsHashFlag === 1) {
        offset += 1;
        const ipfsHashLength = data.readUInt32LE(offset);
        offset += 4;
        ipfsHash = data.slice(offset, offset + ipfsHashLength).toString();
      }

      return {
        id: `T${taskId}`,
        status: taskStatus,
        url,
        format,
        ipfsHash,
      };
    } catch (error) {
      console.error(`Failed to fetch task ${id}:`, error);
      return null;
    }
  };

  const handleDownload = async (task: Task) => {
    if (!task.ipfsHash) {
      setStatus(`Task ${task.id} has no data to download.`);
      return;
    }

    try {
      setStatus(`Downloading data for task ${task.id} from Supabase Storage...`);

      // Fetch data from the Supabase public URL
      const response = await fetch(task.ipfsHash);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.text();

      // Determine file extension based on format
      let extension = ".txt";
      if (task.format.toLowerCase() === "jsonl") {
        extension = ".jsonl";
      } else if (task.format.toLowerCase() === "tfrecords") {
        extension = ".tfrecord";
      } else if (task.format.toLowerCase() === "parquet") {
        extension = ".parquet";
      }

      // Create a Blob and trigger download
      const blob = new Blob([data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `task-${task.id}-data${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus(`Data for task ${task.id} downloaded successfully.`);
    } catch (error) {
      console.error(`Failed to download data for task ${task.id}:`, error);
      setStatus(`Failed to download data for task ${task.id}: ${(error as Error).message}`);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="task-list-page page-container w-full">
      <div className="header">
        <div className="w-full">
          <button
            className="m-0 absolute back-button -translate-x-[18px] -translate-y-[4px]"
            onClick={handleBack}
          >
            ← Back
          </button>
          <h2 className="text-xl text-center font-bold">Your Tasks</h2>
        </div>
      </div>

      <div className="task-list mt-4">
        {tasks.length === 0 ? (
          <p className="text-center">No tasks available.</p>
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
                      className={
                        task.status === "Done"
                          ? "active"
                          : task.status === "Assigned"
                          ? "inactive"
                          : "pending"
                      }
                    >
                      {task.status}
                    </span>
                  </td>
                  <td>
                    {task.status === "Done" && task.ipfsHash ? (
                      <button
                        className="action-button download-button"
                        onClick={() => handleDownload(task)}
                      >
                        Download
                      </button>
                    ) : (
                      <span>-</span>
                    )}
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

export default TaskListPage;