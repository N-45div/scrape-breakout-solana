import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client/supabaseClient";

type NodeRanking = {
  address: string;
  name: string;
  score: number;
  earnings: string;
  rank: number;
}

type ClaimableReward = {
  id: string;
  name: string;
  amount: string;
  status: "Claimable" | "Claimed" | "Locked";
  requirement: string;
}

interface NodeForbesPageProps {
  walletAddress: string | null;
}

function NodeForbesPage({ walletAddress }: NodeForbesPageProps) {
  const navigate = useNavigate();
  
  // State for dynamic data
  const [topNodes, setTopNodes] = useState<NodeRanking[]>([]);
  const [userNode, setUserNode] = useState<NodeRanking | null>(null);
  const [rewards, setRewards] = useState<ClaimableReward[]>([]);
  const [status, setStatus] = useState("");

  // Fetch data when walletAddress changes
  useEffect(() => {
    const fetchNodeForbesData = async () => {
      if (!walletAddress) {
        setStatus("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        setStatus("Fetching node rankings and rewards...");

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

        // Fetch dynamic data from the backend
        const response = await fetch("http://localhost:3000/node-forbes", {
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
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        setTopNodes(data.topNodes);
        setUserNode(data.userNode || null);
        setRewards(data.rewards);
        setStatus("");
      } catch (error) {
        console.error("Failed to fetch node forbes data:", error);
        setStatus("Failed to load data: " + (error as Error).message);
      }
    };

    fetchNodeForbesData();
  }, [walletAddress]);

  const handleBack = () => {
    navigate("/");
  };

  const handleClaimReward = async (rewardId: string) => {
    if (!walletAddress) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setStatus(`Claiming reward ${rewardId}...`);

      // Fetch user_id from Supabase
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email || "")
        .single();

      if (fetchError || !userData) {
        throw new Error("Failed to fetch user data: " + (fetchError?.message || "No data"));
      }

      const userId = userData.user_id;

      // Call the backend to claim the reward
      const response = await fetch("http://localhost:3000/claim-reward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          walletAddress,
          rewardId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      // Update the reward status locally
      setRewards(prevRewards =>
        prevRewards.map(reward =>
          reward.id === rewardId
            ? { ...reward, status: "Claimed" }
            : reward
        )
      );

      setStatus(`Reward ${rewardId} claimed successfully! Transaction: ${data.signature}`);
    } catch (error) {
      console.error(`Failed to claim reward ${rewardId}:`, error);
      setStatus(`Failed to claim reward ${rewardId}: ${(error as Error).message}`);
    }
  };

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

          {topNodes.length === 0 ? (
            <p className="text-center">No top nodes available.</p>
          ) : (
            topNodes.map((node) => (
              <div key={node.rank} className="leaderboard-item">
                <div className="rank-col">#{node.rank}</div>
                <div className="name-col">
                  <div className="node-name">{node.name}</div>
                  <div className="node-address">{node.address}</div>
                </div>
                <div className="score-col">{node.score}</div>
                <div className="earnings-col">{node.earnings}</div>
              </div>
            ))
          )}
        </div>

        {userNode && (
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
        )}
      </div>

      <div className="rewards-card">
        <h3 className="section-title text-center">Achievements</h3>

        <div className="rewards-list">
          {rewards.length === 0 ? (
            <p className="text-center">No rewards available.</p>
          ) : (
            rewards.map((reward) => (
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
            ))
          )}
        </div>
      </div>

      {status && (
        <div className="status mt-4 text-center text-sm whitespace-pre-line">
          {status}
        </div>
      )}
    </div>
  );
}

export default NodeForbesPage;