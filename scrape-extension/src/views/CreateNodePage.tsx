import { useState } from "react";
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
} from "@solana/spl-token";
import BN from "bn.js";
import {
  findProviderNodePda,
  findNodeRegistryPda,
  createCreateNodeInstruction,
  createNodeRegistryInitializeInstruction,
} from "../program/program";

interface CreateNodePageProps {
  keypair: Keypair | null;
}

function CreateNodePage({ keypair }: CreateNodePageProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ipv4: "192.168.1.1",
    proxyPort: "8080",
    clientPort: "9090",
    bandwidthLimit: "50",
  });
  const [status, setStatus] = useState("");
  const [isAirdropLoading, setIsAirdropLoading] = useState(false); // Track airdrop request state
  const [showAirdropButton, setShowAirdropButton] = useState(false); // Show airdrop button if balance is low

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

  // Function to request airdrop
  const handleAirdrop = async () => {
    if (!keypair) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    setIsAirdropLoading(true);
    setStatus("Requesting airdrop...");

    try {
      const airdropAmount = 1 * LAMPORTS_PER_SOL; // Request 1 SOL
      const signature = await connection.requestAirdrop(keypair.publicKey, airdropAmount);
      await connection.confirmTransaction(signature, "confirmed");

      const newBalance = await connection.getBalance(keypair.publicKey);
      setStatus(`Airdrop successful! New balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      setShowAirdropButton(false); // Hide airdrop button after success
    } catch (error) {
      console.error("Airdrop failed:", error);
      setStatus("Airdrop failed: " + (error as Error).message);
    } finally {
      setIsAirdropLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keypair) {
      setStatus("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setStatus("Creating node...");

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

      const balance = await connection.getBalance(keypair.publicKey);
      const minimumBalance = 0.01 * LAMPORTS_PER_SOL;
      if (balance < minimumBalance) {
        setStatus(
          `Insufficient balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL.\n` +
          `Please request an airdrop below or use a faucet like https://solfaucet.com for this address: ${keypair.publicKey.toBase58()}.`
        );
        setShowAirdropButton(true); // Show airdrop button
        return;
      }

      const tokenMint = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");
      let nodeTokenAccount: PublicKey;
      try {
        nodeTokenAccount = await getAssociatedTokenAddress(tokenMint, keypair.publicKey);
        const nodeTokenAccountInfo = await connection.getAccountInfo(nodeTokenAccount);
        if (!nodeTokenAccountInfo) {
          setStatus("Creating node token account...");
          const createAtaTx = new Transaction().add(
            createAssociatedTokenAccountInstruction(
              keypair.publicKey,
              nodeTokenAccount,
              keypair.publicKey,
              tokenMint,
              TOKEN_PROGRAM_ID
            )
          );
          createAtaTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          createAtaTx.feePayer = keypair.publicKey;
          createAtaTx.sign(keypair);
          const ataSignature = await connection.sendRawTransaction(createAtaTx.serialize());
          await connection.confirmTransaction(ataSignature, "confirmed");
          setStatus(`Node token account created! Transaction: ${ataSignature}`);
        }
      } catch (error) {
        throw new Error("Failed to create node token account: " + (error as Error).message);
      }

      const [providerNode, _] = await findProviderNodePda(keypair.publicKey);
      const [nodeRegistry, __] = await findNodeRegistryPda();

      const nodeAccountInfo = await connection.getAccountInfo(providerNode);
      if (nodeAccountInfo) {
        setStatus("ProviderNode already exists. Navigating to settings...");
        navigate("/node-settings");
        return;
      }

      // Check if node_registry is initialized; if not, initialize it
      const nodeRegistryInfo = await connection.getAccountInfo(nodeRegistry);
      if (!nodeRegistryInfo) {
        setStatus("Initializing node registry...");
        const initNodeRegistryIx = createNodeRegistryInitializeInstruction({
          node_registry: nodeRegistry,
          signer: keypair.publicKey,
          system_program: SystemProgram.programId,
        });
        const initTx = new Transaction().add(initNodeRegistryIx);
        initTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        initTx.feePayer = keypair.publicKey;
        initTx.sign(keypair);
        const initSignature = await connection.sendRawTransaction(initTx.serialize());
        await connection.confirmTransaction(initSignature, "confirmed");
        setStatus(`Node registry initialized! Transaction: ${initSignature}`);
      }

      const createNodeIx = createCreateNodeInstruction(
        {
          signer: keypair.publicKey,
          provider_node: providerNode,
          node_registry: nodeRegistry,
          node_token_account: nodeTokenAccount,
          system_program: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        },
        {
          ipv4: ipv4Parts,
          proxy_port: proxyPort,
          client_port: clientPort,
          bandwidth_limit: bandwidthLimitBytes,
        }
      );

      const tx = new Transaction().add(createNodeIx);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = keypair.publicKey;
      tx.sign(keypair);
      const signature = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      setStatus(`Node created successfully! Transaction: ${signature}`);
      setTimeout(() => navigate("/node-settings"), 2000);
    } catch (error) {
      console.error("Failed to create node:", error);
      if ((error as any).logs) {
        console.error("Transaction Logs:", (error as any).logs);
      }
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
            disabled={isAirdropLoading} // Disable during airdrop
          >
            Create Node
          </button>
          <button
            type="button"
            className="cancel-button bg-gray-500 text-white p-2 rounded"
            onClick={handleCancel}
            disabled={isAirdropLoading}
          >
            Cancel
          </button>
        </div>
      </form>

      {showAirdropButton && (
        <div className="airdrop-section flex justify-center mt-4">
          <button
            onClick={handleAirdrop}
            className="airdrop-button bg-green-500 text-white p-2 rounded"
            disabled={isAirdropLoading}
          >
            {isAirdropLoading ? "Requesting Airdrop..." : "Request Airdrop (1 SOL)"}
          </button>
        </div>
      )}

      {status && (
        <div className="status mt-4 text-center text-sm whitespace-pre-line">
          {status}
        </div>
      )}
    </div>
  );
}

export default CreateNodePage;