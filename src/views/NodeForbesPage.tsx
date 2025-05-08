import { useState } from "react"
import { useNavigate } from "react-router-dom"

type NodeRanking = {
  address: string
  name: string
  score: number
  earnings: string
  rank: number
}

type ClaimableReward = {
  id: string
  name: string
  amount: string
  status: "Claimable" | "Claimed" | "Locked"
  requirement: string
}

interface NodeForbesPageProps {
  walletAddress: string | null
}

function NodeForbesPage({ walletAddress }: NodeForbesPageProps) {
  const navigate = useNavigate()
  
  // Top nodes data
  const [topNodes, setTopNodes] = useState<NodeRanking[]>([
    {
      address: "8Kv4...9jQ2",
      name: "DataHawk",
      score: 98,
      earnings: "145.8 $SCRAPE",
      rank: 1
    },
    {
      address: "3Rf7...2kL9",
      name: "ScraperPro",
      score: 95,
      earnings: "132.3 $SCRAPE",
      rank: 2
    },
    {
      address: "7Jd2...5mN3",
      name: "WebHarvester",
      score: 92,
      earnings: "118.7 $SCRAPE",
      rank: 3
    },
    {
      address: "2Tp8...6vR4",
      name: "DataNinja",
      score: 89,
      earnings: "105.2 $SCRAPE",
      rank: 4
    },
    {
      address: "9Lk5...1cB7",
      name: "CrawlerKing",
      score: 87,
      earnings: "98.6 $SCRAPE",
      rank: 5
    }
  ])
  
  // Current user's node
  const [userNode, setUserNode] = useState<NodeRanking>({
    address: walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : "Unknown",
    name: "YourNode",
    score: 82,
    earnings: "87.4 $SCRAPE",
    rank: 8
  })
  
  // Claimable rewards
  const [rewards, setRewards] = useState<ClaimableReward[]>([
    {
      id: "R001",
      name: "Weekly Top 10 Bonus",
      amount: "5.0 $SCRAPE",
      status: "Claimable",
      requirement: "Maintain top 10 position for a week"
    },
    {
      id: "R002",
      name: "High Availability Reward",
      amount: "3.5 $SCRAPE",
      status: "Claimable",
      requirement: "99.9% uptime for 30 days"
    },
    {
      id: "R003",
      name: "Data Quality Champion",
      amount: "10.0 $SCRAPE",
      status: "Locked",
      requirement: "Reach top 5 in node rankings"
    },
    {
      id: "R004",
      name: "Early Adopter Bonus",
      amount: "2.0 $SCRAPE",
      status: "Claimed",
      requirement: "Joined during beta phase"
    }
  ])

  const handleBack = () => {
    navigate("/")
  }
  
  const handleClaimReward = (rewardId: string) => {
    setRewards(prevRewards => 
      prevRewards.map(reward => 
        reward.id === rewardId 
          ? {...reward, status: "Claimed"} 
          : reward
      )
    )
  }

  return (
    <div className="page-container">
      <div className="header">
        <div className="flex-1 mb-4">
          <button className="absolute back-button top-[30px] left-[40px]" onClick={handleBack}>
            ← Back
          </button>
          <h2 className="text-center text-xl font-bold">Node Forbes</h2>
        </div>
      </div>

      <div className="leaderboard-card">        
        <div className="leaderboard-list">
          <div className="leaderboard-header">
            <div className="rank-col">Rank</div>
            <div className="name-col">Node</div>
            <div className="score-col">Score</div>
            <div className="earnings-col">Balance</div>
          </div>
          
          {topNodes.map((node) => (
            <div key={node.rank} className="leaderboard-item">
              <div className="rank-col">#{node.rank}</div>
              <div className="name-col">
                <div className="node-name">{node.name}</div>
                <div className="node-address">{node.address}</div>
              </div>
              <div className="score-col">{node.score}</div>
              <div className="earnings-col">{node.earnings}</div>
            </div>
          ))}
        </div>
        
        <div className="your-ranking">
          <div className="leaderboard-item your-node">
            <div className="rank-col">#{userNode.rank}</div>
            <div className="name-col">
              <div className="node-name">{userNode.name}</div>
              <div className="node-address">{userNode.address}</div>
            </div>
            <div className="score-col">{userNode.score}</div>
            <div className="earnings-col">{userNode.earnings}</div>
          </div>
        </div>
      </div>
      
      <div className="rewards-card">
        <h3 className="section-title text-center">Achievements</h3>
        
        <div className="rewards-list">
          {rewards.map((reward) => (
            <div key={reward.id} className="reward-item">
              <div className="reward-info">
                <div className="reward-name">{reward.name}</div>
                <div className="reward-requirement">{reward.requirement}</div>
              </div>
              <div className="reward-amount">{reward.amount}</div>
              <div className="reward-action">
                {reward.status === "Claimable" ? (
                  <button 
                    className="claim-button"
                    onClick={() => handleClaimReward(reward.id)}
                  >
                    Claim
                  </button>
                ) : reward.status === "Claimed" ? (
                  <span className="claimed-status">Claimed</span>
                ) : (
                  <span className="locked-status">Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NodeForbesPage