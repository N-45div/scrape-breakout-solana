import { useState, useEffect } from "react";
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
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  findProviderNodePda,
  createUpdateNodeInstruction,
} from "../program/program";

interface NodeSettingsPageProps {
  keypair: Keypair | null;
}

function NodeSettingsPage({ keypair }: NodeSettingsPageProps) {
  const navigate = useNavigate();
  const [sliderValue, setSliderValue] = useState(50);
  const [bandwidth, setBandwidth] = useState(50);
  const [status, setStatus] = useState("");
  const [nodeExists, setNodeExists] = useState(false);
  const [nodeData, setNodeData] = useState<{
    ipv4: number[];
    proxyPort: number;
    clientPort: number;
    bandwidthLimit: number;
  } | null>(null);

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  useEffect(() => {
    if (!keypair) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    const fetchNodeData = async () => {
      try {
        setStatus("Fetching node data...");

        const [providerNode, _] = await findProviderNodePda(keypair.publicKey);
        const nodeAccountInfo = await connection.getAccountInfo(providerNode);
        if (!nodeAccountInfo) {
          setStatus("ProviderNode not found. Please create a node first.");
          setNodeExists(false);
          return;
        }

        setNodeExists(true);

        const data = nodeAccountInfo.data;
        let offset = 8; // Skip discriminator
        offset += 1; // bump
        offset += 32; // owner
        const ipv4 = Array.from(data.slice(offset, offset + 4));
        offset += 4;
        const proxyPort = data.readUInt16LE(offset);
        offset += 2;
        const clientPort = data.readUInt16LE(offset);
        offset += 2;
        const bandwidthLimit = new BN(data.slice(offset, offset + 8), "le");
        offset += 8;

        const bandwidthLimitMB = Math.round(bandwidthLimit.div(new BN(1_000_000)).toNumber());

        setNodeData({
          ipv4,
          proxyPort,
          clientPort,
          bandwidthLimit: bandwidthLimitMB,
        });
        setBandwidth(bandwidthLimitMB);
        setSliderValue(bandwidthLimitMB);
        setStatus(`Node data loaded. Current bandwidth limit: ${bandwidthLimitMB} MB/hour.`);
      } catch (error) {
        console.error("Failed to fetch node data:", error);
        setStatus("Failed to fetch node data: " + (error as Error).message);
      }
    };

    fetchNodeData();
  }, [keypair]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseInt(e.target.value));
  };

  const handleSaveChanges = async () => {
    if (!keypair) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    if (!nodeExists || !nodeData) {
      setStatus("ProviderNode not found. Please create a node first.");
      navigate("/create-node");
      return;
    }

    try {
      setStatus("Saving changes...");

      const newBandwidthLimitMB = sliderValue;
      const newBandwidthLimitBytes = new BN(newBandwidthLimitMB).mul(new BN(1_000_000));

      const [providerNode, _] = await findProviderNodePda(keypair.publicKey);

      const updateNodeIx = createUpdateNodeInstruction(
        {
          signer: keypair.publicKey,
          provider_node: providerNode,
        },
        {
          ipv4: nodeData.ipv4,
          proxy_port: nodeData.proxyPort,
          client_port: nodeData.clientPort,
          bandwidth_limit: newBandwidthLimitBytes,
        }
      );

      const tx = new Transaction().add(updateNodeIx);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = keypair.publicKey;
      tx.sign(keypair);
      const signature = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      setBandwidth(newBandwidthLimitMB);
      setStatus(`Bandwidth updated successfully! New limit: ${newBandwidthLimitMB} MB/hour. Transaction: ${signature}`);
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Failed to update node settings:", error);
      if ((error as any).logs) {
        console.error("Transaction Logs:", (error as any).logs);
      }
      setStatus("Failed to update node settings: " + (error as Error).message);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <div className="page-container w-full">
      <div className="header text-center mb-4">
        <h2 className="text-xl font-bold">Node Settings</h2>
      </div>

      <div className="settings-content">
        <div className="setting-item mb-6">
          <div className="setting-label mb-2">
            Bandwidth: {bandwidth} MB/hour
          </div>

          <div className="slider-container">
            <input
              type="range"
              min="1"
              max="100"
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-full"
            />
            <div className="slider-labels flex justify-between text-sm text-gray-500">
              <span>1 MB</span>
              <span>100 MB</span>
            </div>
          </div>
        </div>

        <div className="form-actions flex justify-center gap-4 mt-8">
          <button
            className="save-button bg-blue-500 text-white p-2 rounded"
            onClick={handleSaveChanges}
          >
            Save Changes
          </button>
          <button
            className="cancel-button bg-gray-500 text-white p-2 rounded"
            onClick={handleCancel}
          >
            Cancel
          </button>
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

export default NodeSettingsPage;