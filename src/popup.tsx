import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./style.css";

import MainPage from "./views/MainPage";
import WalletPage from "./views/WalletPage";
import CreateTasksPage from "./views/CreateTasksPage";
import NodeSettingsPage from "./views/NodeSettingsPage";
import TaskListPage from "./views/TaskListPage";
import NodeForbesPage from "./views/NodeForbesPage";
import CreateNodePage from "./views/CreateNodePage";
import NodeTasksPage from "./views/NodeTasksPage";


type StoredWallet = {
  publicKey: string;
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
};

async function getKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptPrivateKey(
  secretKey: Uint8Array,
  password: string
): Promise<{ encrypted: string; iv: string; salt: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(bs58.encode(secretKey));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await getKey(password, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return {
    encrypted: Buffer.from(encryptedBuffer).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    salt: Buffer.from(salt).toString("base64"),
  };
}

async function decryptPrivateKey(
  encrypted: string,
  password: string,
  ivBase64: string,
  saltBase64: string
): Promise<Uint8Array> {
  const iv = Uint8Array.from(Buffer.from(ivBase64, "base64"));
  const salt = Uint8Array.from(Buffer.from(saltBase64, "base64"));
  const encryptedBytes = Uint8Array.from(Buffer.from(encrypted, "base64"));

  const key = await getKey(password, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedBytes
  );

  const decoded = new TextDecoder().decode(decryptedBuffer);
  return bs58.decode(decoded);
}

function IndexPopup() {
  const [hasWallet, setHasWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [showMainPage, setShowMainPage] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["solanaWallet"], (result) => {
      const wallet: StoredWallet = result.solanaWallet;
      if (wallet?.publicKey && wallet?.encryptedPrivateKey) {
        setHasWallet(true);
      } else {
        chrome.storage.local.remove("solanaWallet");
        setHasWallet(false);
      }
    });
  }, []);

  useEffect(() => {
    if (walletAddress && keypair) {
      setShowMainPage(true);
    } else {
      setShowMainPage(false);
    }
  }, [walletAddress, keypair]);

  const handleCreateWallet = async (password: string) => {
    try {
      const newKeypair = Keypair.generate();
      const publicKey = newKeypair.publicKey.toString();
      const result = await encryptPrivateKey(newKeypair.secretKey, password);

      await chrome.storage.local.set({
        solanaWallet: {
          publicKey,
          encryptedPrivateKey: result.encrypted,
          iv: result.iv,
          salt: result.salt,
        },
      });

      setWalletAddress(publicKey);
      setKeypair(newKeypair);
      setHasWallet(true);
    } catch (error) {
      console.error("Failed to create wallet:", error);
    }
  };

  const handleUnlockWallet = async (password: string) => {
    try {
      const result = await chrome.storage.local.get(["solanaWallet"]);
      const wallet: StoredWallet = result.solanaWallet;

      if (!wallet?.encryptedPrivateKey || !wallet?.publicKey) {
        throw new Error("Wallet not found");
      }

      const decrypted = await decryptPrivateKey(
        wallet.encryptedPrivateKey,
        password,
        wallet.iv,
        wallet.salt
      );

      const restoredKeypair = Keypair.fromSecretKey(decrypted);
      setWalletAddress(restoredKeypair.publicKey.toString());
      setKeypair(restoredKeypair);
    } catch (error) {
      console.error("Failed to unlock wallet:", error);
      throw error;
    }
  };

  const handleClearWallet = async () => {
    try {
      await chrome.storage.local.remove("solanaWallet");
      setHasWallet(false);
      setWalletAddress(null);
      setKeypair(null);
    } catch (error) {
      console.error("Failed to clear wallet:", error);
    }
  };

  const handleWalletClick = () => {
    setShowMainPage(false);
  };

  return (
    <div className="flex flex-col items-center p-[16px] w-[400px]">
      <Router>
        {showMainPage ? (
          <Routes>
            <Route
              path="/"
              element={
                <MainPage
                  walletAddress={walletAddress}
                  onWalletClick={handleWalletClick}
                  keypair={keypair}
                />
              }
            />
            <Route
              path="/create-tasks"
              element={<CreateTasksPage keypair={keypair} />}
            />
            <Route
              path="/node-settings"
              element={<NodeSettingsPage keypair={keypair} />}
            />
            <Route
              path="/task-list"
              element={<TaskListPage keypair={keypair} />}
            />
            <Route
              path="/node-forbes"
              element={<NodeForbesPage walletAddress={walletAddress} />}
            />
            <Route
              path="/create-node"
              element={<CreateNodePage keypair={keypair} />}
            />
            <Route
              path="/node-tasks"
              element={<NodeTasksPage keypair={keypair} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <WalletPage
            hasWallet={hasWallet}
            walletAddress={walletAddress}
            onCreateWallet={handleCreateWallet}
            onUnlockWallet={handleUnlockWallet}
            onClearWallet={handleClearWallet}
            onBack={() => setShowMainPage(true)}
          />
        )}
      </Router>
    </div>
  );
}

export default IndexPopup;