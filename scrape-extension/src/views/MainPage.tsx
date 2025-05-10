import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  findClientPda,
  findProviderNodePda,
  findTaskPda,
} from "../program/program";
import logoIcon from "../../assets/icons/icon48.png";

type NodeStatus = {
  status: "Active" | "Inactive";
  uptime: string;
  earnings: string;
  bandwidth: string;
  activeTasks: number;
  tasksCreated: number;
};

interface MainPageProps {
  walletAddress: string | null;
  onWalletClick: () => void;
  keypair: Keypair | null;
}

function MainPage({ walletAddress, onWalletClick, keypair }: MainPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>({
    status: "Inactive",
    uptime: "0h 0m",
    earnings: "0 $SCRAPE",
    bandwidth: "0 MB/hour",
    activeTasks: 0,
    tasksCreated: 0,
  });
  const [isNodeRunning, setIsNodeRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  useEffect(() => {
    const fetchNodeStatus = async () => {
      if (!keypair || !walletAddress) {
        setStatusMessage("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        setStatusMessage("Fetching node status...");

        // Check if the user has a ProviderNode
        const [providerNodePda, providerNodeBump] = await findProviderNodePda(keypair.publicKey);
        const nodeAccountInfo = await connection.getAccountInfo(providerNodePda);
        let bandwidthLimitMB = 0;
        let isActive = false;

        if (nodeAccountInfo) {
          const data = nodeAccountInfo.data;
          let offset = 8 + 1 + 32 + 4 + 2 + 2; // Skip discriminator, bump, owner, ipv4, proxy_port, client_port
          const bandwidthLimit = new BN(data.slice(offset, offset + 8), "le");
          bandwidthLimitMB = Math.round(bandwidthLimit.div(new BN(1_000_000)).toNumber());
          isActive = bandwidthLimitMB > 0;
          setIsNodeRunning(isActive);
        } else {
          setStatusMessage("ProviderNode not found. Please create a node first.");
          navigate("/create-node");
          return;
        }

        // Use updated bandwidth from navigation state if available
        const updatedBandwidth = (location.state as { updatedBandwidth?: number })?.updatedBandwidth;
        if (updatedBandwidth !== undefined) {
          bandwidthLimitMB = updatedBandwidth;
          isActive = bandwidthLimitMB > 0;
          setIsNodeRunning(isActive);
        }

        // Fetch tasks created (from Client account)
        const [clientPda, clientBump] = await findClientPda(keypair.publicKey);
        const clientAccountInfo = await connection.getAccountInfo(clientPda);
        let tasksCreated = 0;
        let activeTasks = 0;

        if (clientAccountInfo) {
          const taskCounter = new BN(clientAccountInfo.data.slice(41, 49), "le").toNumber();
          tasksCreated = taskCounter;

          // Fetch active tasks assigned to this node
          const taskPromises: Promise<{ nodeAssigned: boolean } | null>[] = [];
          for (let id = 0; id < taskCounter; id++) {
            taskPromises.push(checkTaskAssignment(keypair.publicKey, id, providerNodePda));
          }
          const taskResults = await Promise.all(taskPromises);
          activeTasks = taskResults.filter(result => result?.nodeAssigned).length;
        }

        // Fetch earnings (balance of $SCRAPE token in the node's associated token account)
        const tokenMint = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
        const nodeTokenAccount = await getAssociatedTokenAddress(tokenMint, keypair.publicKey);
        let earnings = "0 $SCRAPE";
        try {
          const tokenAccountInfo = await getAccount(connection, nodeTokenAccount);
          const balance = Number(tokenAccountInfo.amount) / 1_000_000; // Assuming 6 decimals for $SCRAPE
          earnings = `${balance.toFixed(2)} $SCRAPE`;
        } catch (error) {
          console.error("Failed to fetch token balance:", error);
          // Token account might not exist yet; leave earnings as 0
        }

        // Simulate uptime (Solana program doesn't track this directly)
        const simulatedUptime = isActive ? "24h 13m" : "0h 0m"; // Placeholder; in a real app, you'd need a backend to track uptime

        setNodeStatus({
          status: isActive ? "Active" : "Inactive",
          uptime: simulatedUptime,
          earnings,
          bandwidth: `${bandwidthLimitMB} MB/hour`,
          activeTasks,
          tasksCreated,
        });

        setStatusMessage("");
      } catch (error) {
        console.error("Failed to fetch node status:", error);
        setStatusMessage("Failed to fetch node status: " + (error as Error).message);
      }
    };

    fetchNodeStatus();
  }, [keypair, walletAddress, navigate, location]); // Added location to dependencies

  const checkTaskAssignment = async (
    owner: PublicKey,
    id: number,
    nodePda: PublicKey
  ): Promise<{ nodeAssigned: boolean } | null> => {
    try {
      const [taskPda, taskBump] = await findTaskPda(owner, new BN(id));
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
  };

  const handleStartNode = () => {
    // In a real app, you'd call an instruction to "start" the node (e.g., update bandwidth_limit to non-zero)
    setIsNodeRunning(true);
    setNodeStatus(prev => ({
      ...prev,
      status: "Active",
      uptime: "24h 13m", // Simulated
    }));
    setStatusMessage("Node started. Navigate to Node Settings to adjust bandwidth.");
  };

  const handleStopNode = () => {
    // In a real app, you'd call an instruction to "stop" the node (e.g., set bandwidth_limit to 0)
    setIsNodeRunning(false);
    setNodeStatus(prev => ({
      ...prev,
      status: "Inactive",
      uptime: "0h 0m",
    }));
    setStatusMessage("Node stopped.");
  };

  const handleCreateTasks = () => {
    navigate("/create-tasks");
  };

  const handleNodeSettings = () => {
    navigate("/node-settings");
  };

  const handleViewTasks = () => {
    navigate("/task-list");
  };

  const handleViewNodeForbes = () => {
    navigate("/node-forbes");
  };

  return (
    <div className="main-page flex-1">
      <div className="header">
        <div className="logo">
          <img src={logoIcon} alt="Logo" />
          <span className="logo-text">Scrape</span>
        </div>
        <button className="wallet-button" onClick={onWalletClick}>
          {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
        </button>
      </div>

      <div className="flex justify-center gap-4 px-4">
        <button className="nav-button" onClick={handleCreateTasks}>
          Create Tasks
        </button>
        <button className="nav-button" onClick={handleNodeSettings}>
          Node Settings
        </button>
        <button className="nav-button" onClick={handleViewNodeForbes}>
          Node Forbes
        </button>
      </div>

      <div className="status-card">
        <h3 className="text-lg font-medium mb-3">Node Status</h3>
        <div className="status-item">
          <span>Status:</span>
          <span
            className={nodeStatus.status === "Active" ? "active" : "inactive"}
          >
            {nodeStatus.status}
          </span>
        </div>
        <div className="status-item">
          <span>Uptime:</span>
          <span>{nodeStatus.uptime}</span>
        </div>
        <div className="status-item">
          <span>Earnings:</span>
          <span>{nodeStatus.earnings}</span>
        </div>
        <div className="status-item">
          <span>Bandwidth:</span>
          <span>{nodeStatus.bandwidth}</span>
        </div>
        <div className="status-item">
          <span>Tasks:</span>
          <span>{nodeStatus.activeTasks} Active</span>
        </div>
        <div className="status-item">
          <span>Tasks Created:</span>
          <span>{nodeStatus.tasksCreated}</span>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 px-4 mb-[15px]">
        <button className="m-0" onClick={handleViewTasks}>
          View Tasks
        </button>

        {isNodeRunning ? (
          <button className="stop-button m-0" onClick={handleStopNode}>
            Stop Node
          </button>
        ) : (
          <button className="start-button m-0" onClick={handleStartNode}>
            Start Node
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="status mt-4 text-center text-sm whitespace-pre-line">
          {statusMessage}
        </div>
      )}
    </div>
  );
}

export default MainPage;