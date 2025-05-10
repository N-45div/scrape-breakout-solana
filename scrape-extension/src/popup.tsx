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

type StrictBufferSource = ArrayBuffer | Uint8Array;

async function getKey(password: string, salt: StrictBufferSource): Promise<CryptoKey> {
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
  const saltBuffer = new ArrayBuffer(16);
  const salt = new Uint8Array(saltBuffer);
  crypto.getRandomValues(salt);

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
  const saltBytes = Buffer.from(saltBase64, "base64");
  const saltBuffer = new ArrayBuffer(saltBytes.length);
  const salt = new Uint8Array(saltBuffer);
  salt.set(saltBytes);
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
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["solanaWallet"], (result) => {
      const wallet: StoredWallet = result.solanaWallet;
      if (wallet?.publicKey && wallet?.encryptedPrivateKey) {
        setHasWallet(true);
        console.log("Stored wallet found with public key:", wallet.publicKey);
        // Check for consistency with expected public key
        if (wallet.publicKey !== "GqKRY5hDTFDNX69iwXjwVvWTi4FjoXfipMt9akPtHijz") {
          console.error("Stored wallet public key does not match expected key. Clearing wallet.");
          chrome.storage.local.remove("solanaWallet");
          setHasWallet(false);
          setWalletAddress(null);
          setKeypair(null);
          setShowMainPage(false);
        } else {
          setWalletAddress(null);
          setKeypair(null);
          setShowMainPage(false);
        }
      } else {
        chrome.storage.local.remove("solanaWallet");
        setHasWallet(false);
        setWalletAddress(null);
        setKeypair(null);
        setShowMainPage(false);
        console.log("No stored wallet found.");
      }
      setIsLoadingWallet(false);
    });
  }, []);

  useEffect(() => {
    if (walletAddress && keypair) {
      if (walletAddress !== keypair.publicKey.toString()) {
        console.error(
          "Wallet mismatch! walletAddress:",
          walletAddress,
          "keypair.publicKey:",
          keypair.publicKey.toString()
        );
        setWalletAddress(null);
        setKeypair(null);
        setShowMainPage(false);
      } else {
        setShowMainPage(true);
        console.log("Wallet state updated - walletAddress:", walletAddress, "keypair:", keypair.publicKey.toString());
      }
    } else {
      setShowMainPage(false);
      console.log("Wallet state cleared - walletAddress:", walletAddress, "keypair:", keypair);
    }
  }, [walletAddress, keypair]);

  const handleCreateWallet = async (password: string) => {
    if (isCreatingTask) {
      throw new Error("Cannot create wallet while a task is being created.");
    }
    try {
      setIsLoadingWallet(true);
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
      console.log("Wallet created with public key:", publicKey);
    } catch (error) {
      console.error("Failed to create wallet:", error);
      throw error;
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const handleUnlockWallet = async (password: string) => {
    if (isCreatingTask) {
      throw new Error("Cannot unlock wallet while a task is being created.");
    }
    try {
      setIsLoadingWallet(true);
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
      if (restoredKeypair.publicKey.toString() !== wallet.publicKey) {
        throw new Error(
          `Decrypted keypair does not match stored public key! Stored: ${wallet.publicKey}, Decrypted: ${restoredKeypair.publicKey.toString()}`
        );
      }

      setWalletAddress(restoredKeypair.publicKey.toString());
      setKeypair(restoredKeypair);
      console.log("Wallet unlocked with public key:", restoredKeypair.publicKey.toString());
    } catch (error) {
      console.error("Failed to unlock wallet:", error);
      throw error;
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const handleClearWallet = async () => {
    if (isCreatingTask) {
      throw new Error("Cannot clear wallet while a task is being created.");
    }
    try {
      setIsLoadingWallet(true);
      await chrome.storage.local.remove("solanaWallet");
      setHasWallet(false);
      setWalletAddress(null);
      setKeypair(null);
      console.log("Wallet cleared.");
    } catch (error) {
      console.error("Failed to clear wallet:", error);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const handleWalletClick = () => {
    setShowMainPage(false);
  };

  if (isLoadingWallet) {
    return <div>Loading wallet...</div>;
  }

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
              element={<CreateTasksPage key={walletAddress} keypair={keypair} setIsCreatingTask={setIsCreatingTask} />}
            />
            <Route
              path="/node-settings"
              element={<NodeSettingsPage key={walletAddress} keypair={keypair} />}
            />
            <Route
              path="/task-list"
              element={<TaskListPage key={walletAddress} keypair={keypair} />}
            />
            <Route
              path="/node-forbes"
              element={<NodeForbesPage walletAddress={walletAddress} />}
            />
            <Route
              path="/create-node"
              element={<CreateNodePage key={walletAddress} keypair={keypair} />}
            />
            <Route
              path="/node-tasks"
              element={<NodeTasksPage key={walletAddress} keypair={keypair} />}
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
            isCreatingTask={isCreatingTask}
          />
        )}
      </Router>
    </div>
  );
}

export default IndexPopup;