import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";
import { findProviderNodePda, findNodeRegistryPda  } from "../program/program";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { supabase } from "../client/supabaseClient";

interface CreateNodePageProps {
  walletAddress: string | null;
}

function CreateNodePage({ walletAddress }: CreateNodePageProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ipv4: "192.168.1.1",
    proxyPort: "8080",
    clientPort: "9090",
    bandwidthLimit: "50",
  });
  const [status, setStatus] = useState("");

  const connection = new Connection("https://devnet.helius-rpc.com/?api-key=2d8978c6-7067-459f-ae97-7ea035f1a0cb", "confirmed");

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
    if (!walletAddress) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setStatus("Preparing to create node...");

      const publicKey = new PublicKey(walletAddress);

      const ipv4Parts = formData.ipv4.split(".").map(Number);
      if (ipv4Parts.length !== 4 || ipv4Parts.some(part => isNaN(part) || part < 0 || part > 255)) {
        throw new Error("Invalid IPv4 address. Please use the format X.X.X.X (e.g., 192.168.1.1).");
      }

      const proxyPort = parseInt(formData.proxyPort);
      const clientPort = parseInt(formData.clientPort);
      const bandwidthLimitMB = parseInt(formData.bandwidthLimit);
      if (isNaN(proxyPort) || proxyPort < 0 || proxyPort > 65535) {
        throw new Error("Invalid proxy port. Must be between 0 and 65535.");
      }
      if (isNaN(clientPort) || clientPort < 0 || clientPort > 65535) {
        throw new Error("Invalid client port. Must be between 0 and 65535.");
      }
      if (isNaN(bandwidthLimitMB) || bandwidthLimitMB < 1 || bandwidthLimitMB > 100) {
        throw new Error("Invalid bandwidth limit. Must be between 1 and 100 MB/hour.");
      }

      const bandwidthLimitBytes = new BN(bandwidthLimitMB).mul(new BN(1_000_000));

      const balance = await connection.getBalance(publicKey);
      const minimumBalance = 0.01 * LAMPORTS_PER_SOL;
      if (balance < minimumBalance) {
        setStatus(
          `Insufficient balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL.\n` +
          `Please fund your wallet using a faucet like https://solfaucet.com for this address: ${publicKey.toBase58()}.`
        );
        return;
      }

      const tokenMint = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
      const nodeTokenAccount = await connection.getAccountInfo(
        await getAssociatedTokenAddress(tokenMint, publicKey)
      );
      if (!nodeTokenAccount) {
        setStatus(
          "Node token account not found. Please create it manually or contact support to proceed."
        );
        throw new Error("Node token account not found and cannot be created without transaction signing.");
      }

      const [providerNode] = await findProviderNodePda(publicKey);
      const [nodeRegistry] = await findNodeRegistryPda();

      const nodeAccountInfo = await connection.getAccountInfo(providerNode);
      if (nodeAccountInfo) {
        setStatus("ProviderNode already exists. Navigating to settings...");
        navigate("/node-settings");
        return;
      }

      const nodeRegistryInfo = await connection.getAccountInfo(nodeRegistry);
      if (!nodeRegistryInfo) {
        setStatus("Node registry not initialized. Please contact support to proceed.");
        throw new Error("Node registry not initialized and cannot be initialized without transaction signing.");
      }

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

      // Delegate node creation to the backend
      setStatus("Creating node via backend...");
      const response = await fetch("http://localhost:3000/create-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          signer: walletAddress,
          providerNode: providerNode.toString(),
          nodeRegistry: nodeRegistry.toString(),
          nodeTokenAccount: (await getAssociatedTokenAddress(tokenMint, publicKey)).toString(),
          ipv4: ipv4Parts,
          proxyPort,
          clientPort,
          bandwidthLimit: bandwidthLimitBytes.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      setStatus(`Node created successfully! Transaction: ${data.signature}`);
      setTimeout(() => navigate("/node-settings"), 2000);
    } catch (error) {
      console.error("Failed to create node:", error);
      setStatus("Failed to create node: " + (error as Error).message);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <div className="page-container w-full">
      <div className="header flex justify-center mb-4">
        <h2 className="text-xl font-bold">Create Node</h2>
      </div>

      <form onSubmit={handleSubmit} className="node-form">
        <div className="form-group mb-4">
          <label className="block mb-1">IPv4 Address:</label>
          <input
            type="text"
            name="ipv4"
            value={formData.ipv4}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="e.g., 192.168.1.1"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Proxy Port:</label>
          <input
            type="number"
            name="proxyPort"
            value={formData.proxyPort}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="e.g., 8080"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Client Port:</label>
          <input
            type="number"
            name="clientPort"
            value={formData.clientPort}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="e.g., 9090"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block mb-1">Bandwidth Limit (MB/hour):</label>
          <input
            type="number"
            name="bandwidthLimit"
            value={formData.bandwidthLimit}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="e.g., 50"
          />
        </div>

        <div className="form-actions flex justify-center gap-4">
          <button
            type="submit"
            className="submit-button bg-blue-500 text-white p-2 rounded"
          >
            Create Node
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
        </div>
      )}
    </div>
  );
}

export default CreateNodePage;