import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../client/supabaseClient";
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
}

function MainPage({ walletAddress, onWalletClick }: MainPageProps) {
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

  useEffect(() => {
    const fetchNodeStatus = async () => {
      if (!walletAddress) {
        setStatusMessage("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        setStatusMessage("Fetching node status...");

        // Fetch user_id from Supabase
        const { data: userData, error: fetchError } = await supabase
          .from("users")
          .select("user_id")
          .eq("wallet_address", walletAddress)
          .single();

        if (fetchError || !userData) {
          throw new Error("Failed to fetch user data: " + (fetchError?.message || "No data"));
        }

        const userId = userData.user_id;

        // Fetch node status from backend
        const response = await fetch("http://127.0.0.1:3000/node-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            walletAddress,
          }),
        });

        if (!response.ok) {
          const errorText = await response.json();
          if (errorText.error.includes("rate limit")) {
            throw new Error("Rate limit exceeded. Please wait a minute and try again.");
          }
          throw new Error(`HTTP error! Status: ${response.status} - ${errorText.error}`);
        }

        const data = await response.json();

        if (!data.nodeExists) {
          setStatusMessage("ProviderNode not found. Please create a node first.");
          navigate("/create-node");
          return;
        }

        // Use updated bandwidth from navigation state if available
        const updatedBandwidth = (location.state as { updatedBandwidth?: number })?.updatedBandwidth;
        const finalBandwidth = updatedBandwidth !== undefined ? updatedBandwidth : data.bandwidthLimitMB;
        const isActive = finalBandwidth > 0;

        setIsNodeRunning(isActive);
        setNodeStatus({
          status: isActive ? "Active" : "Inactive",
          uptime: data.uptime,
          earnings: data.earnings,
          bandwidth: `${finalBandwidth} MB/hour`,
          activeTasks: data.activeTasks,
          tasksCreated: data.tasksCreated,
        });

        setStatusMessage("");
      } catch (error: any) {
        console.error("Failed to fetch node status:", error);
        setStatusMessage("Failed to fetch node status: " + error.message);
      }
    };

    fetchNodeStatus();
  }, [walletAddress, navigate, location]);

  const handleStartNode = async () => {
    if (!walletAddress) {
      setStatusMessage("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setStatusMessage("Starting node...");

      // Fetch user_id from Supabase
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("user_id")
        .eq("wallet_address", walletAddress)
        .single();

      if (fetchError || !userData) {
        throw new Error("Failed to fetch user data: " + (fetchError?.message || "No data"));
      }

      const userId = userData.user_id;

      // Call backend to start the node
      const response = await fetch("http://127.0.0.1:3000/start-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          walletAddress,
        }),
      });

      if (!response.ok) {
        const errorText = await response.json();
        if (errorText.error.includes("rate limit")) {
          throw new Error("Rate limit exceeded. Please wait a minute and try again.");
        }
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText.error}`);
      }

      const data = await response.json();

      setIsNodeRunning(true);
      setNodeStatus(prev => ({
        ...prev,
        status: "Active",
        uptime: "24h 13m", // Simulated; backend should provide this
      }));
      setStatusMessage(`Node started successfully! Transaction: ${data.signature}`);
    } catch (error: any) {
      console.error("Failed to start node:", error);
      setStatusMessage("Failed to start node: " + error.message);
    }
  };

  const handleStopNode = async () => {
    if (!walletAddress) {
      setStatusMessage("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setStatusMessage("Stopping node...");

      // Fetch user_id from Supabase
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("user_id")
        .eq("wallet_address", walletAddress)
        .single();

      if (fetchError || !userData) {
        throw new Error("Failed to fetch user data: " + (fetchError?.message || "No data"));
      }

      const userId = userData.user_id;

      // Call backend to stop the node
      const response = await fetch("http://127.0.0.1:3000/stop-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          walletAddress,
        }),
      });

      if (!response.ok) {
        const errorText = await response.json();
        if (errorText.error.includes("rate limit")) {
          throw new Error("Rate limit exceeded. Please wait a minute and try again.");
        }
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText.error}`);
      }

      const data = await response.json();

      setIsNodeRunning(false);
      setNodeStatus(prev => ({
        ...prev,
        status: "Inactive",
        uptime: "0h 0m",
      }));
      setStatusMessage(`Node stopped successfully! Transaction: ${data.signature}`);
    } catch (error: any) {
      console.error("Failed to stop node:", error);
      setStatusMessage("Failed to stop node: " + error.message);
    }
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
          {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet"}
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
          <span className={nodeStatus.status === "Active" ? "active" : "inactive"}>
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