import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { findClientPda, findTaskPda } from "../program/program";

interface Task {
  id: string;
  status: "Pending" | "Assigned" | "Completed";
  url: string;
  format: string;
  ipfsHash: string | null;
  downloadUrl?: string;
}

interface TaskMetadata {
  taskId: string;
  downloadUrl: string;
  selectedNodeOwner: string;
  url: string;
  format: string;
}

interface TaskListPageProps {
  walletAddress: string | null;
}

function TaskListPage({ walletAddress }: TaskListPageProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState("");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const fetchTasks = async () => {
    if (!walletAddress) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setStatus("Fetching tasks...");

      // Fetch off-chain metadata from local storage
      const storedTasks: TaskMetadata[] = JSON.parse(
        localStorage.getItem(`tasks_${walletAddress}`) || "[]"
      );
      const taskMetadataMap = new Map<string, TaskMetadata>();
      storedTasks.forEach((task) => taskMetadataMap.set(task.taskId, task));

      // Fetch on-chain task data
      const publicKey = new PublicKey(walletAddress);
      const [clientPda] = await findClientPda(publicKey);
      const clientAccountInfo = await connection.getAccountInfo(clientPda);
      if (!clientAccountInfo) {
        setStatus("No tasks found. Please create a task first.");
        setTasks([]);
        return;
      }

      const taskCounter = new BN(clientAccountInfo.data.slice(41, 49), "le").toNumber();

      const taskPromises: Promise<Task | null>[] = [];
      for (let id = 0; id < taskCounter; id++) {
        taskPromises.push(fetchTask(publicKey, id));
      }
      const taskResults = await Promise.all(taskPromises);
      const fetchedTasks = taskResults.filter((task): task is Task => task !== null);

      // Combine on-chain tasks with off-chain metadata
      const combinedTasks = fetchedTasks.map((task) => {
        const metadata = taskMetadataMap.get(task.id);
        return {
          ...task,
          downloadUrl: metadata?.downloadUrl || task.ipfsHash,
          url: metadata?.url || task.url,
          format: metadata?.format || task.format,
        };
      });

      setTasks(combinedTasks);
      setStatus(combinedTasks.length > 0 ? "Tasks loaded successfully." : "No tasks found.");
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setStatus("Failed to load tasks: " + (error as Error).message);
      setTasks([]);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => {
      fetchTasks();
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const fetchTask = async (owner: PublicKey, id: number): Promise<Task | null> => {
    try {
      const [taskPda] = await findTaskPda(owner, new BN(id));
      const taskAccountInfo = await connection.getAccountInfo(taskPda);
      if (!taskAccountInfo) return null;

      const data = taskAccountInfo.data;
      let offset = 8 + 1;
      const taskId = new BN(data.slice(offset, offset + 8), "le").toNumber();
      offset += 8 + 32 + 32;

      const urlLength = data.readUInt32LE(offset);
      offset += 4;
      const url = data.slice(offset, offset + urlLength).toString();
      offset += urlLength;

      for (let i = 0; i < 2; i++) {
        const strLength = data.readUInt32LE(offset);
        offset += 4 + strLength;
      }

      const formatLength = data.readUInt32LE(offset);
      offset += 4;
      const format = data.slice(offset, offset + formatLength).toString();
      offset += formatLength;

      offset += 8;
      const statusByte = data[offset];
      const taskStatus = statusByte === 0 ? "Pending" : statusByte === 1 ? "Assigned" : "Completed";
      offset += 1 + 1 + 32;

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
    const downloadUrl = task.downloadUrl || task.ipfsHash;
    if (!downloadUrl) {
      setStatus(`Task ${task.id} has no data to download.`);
      return;
    }

    try {
      setStatus(`Downloading data for task ${task.id}...`);

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.text();

      let extension = ".txt";
      if (task.format.toLowerCase() === "jsonl") {
        extension = ".jsonl";
      } else if (task.format.toLowerCase() === "tfrecords") {
        extension = ".tfrecord";
      } else if (task.format.toLowerCase() === "parquet") {
        extension = ".parquet";
      }

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
                        task.status === "Completed"
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
                    {(task.downloadUrl || task.ipfsHash) ? (
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