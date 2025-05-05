import { useState } from "react"
import { useNavigate } from "react-router-dom"

import logoIcon from "../../assets/icons/icon48.png"

type NodeStatus = {
  status: "Active" | "Inactive"
  uptime: string
  earnings: string
  bandwidth: string
  activeTasks: number
  tasksCreated: number
}

interface MainPageProps {
  walletAddress: string | null
  onWalletClick: () => void
}

function MainPage({ walletAddress, onWalletClick }: MainPageProps) {
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>({
    status: "Active",
    uptime: "24h 13m",
    earnings: "12.5 $SCRAPE",
    bandwidth: "1.2 GB/s",
    activeTasks: 45,
    tasksCreated: 3
  })
  const [isNodeRunning, setIsNodeRunning] = useState(true)
  const navigate = useNavigate()

  const handleStartNode = () => {
    setIsNodeRunning(true)
    setNodeStatus(prev => ({
      ...prev,
      status: "Active"
    }))
  }

  const handleStopNode = () => {
    setIsNodeRunning(false)
    setNodeStatus(prev => ({
      ...prev,
      status: "Inactive"
    }))
  }

  const handleCreateTasks = () => {
    navigate("/create-tasks")
  }

  const handleNodeSettings = () => {
    navigate("/node-settings")
  }

  const handleViewTasks = () => {
    navigate("/task-list")
  }


  const handleViewNodeForbes = () => {
    navigate("/node-forbes")
  }

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
            className={nodeStatus.status === "Active" ? "active" : "inactive"}>
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
    </div>
  )
}

export default MainPage
