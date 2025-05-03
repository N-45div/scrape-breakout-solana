import { useState, useEffect } from "react"
import { Keypair } from "@solana/web3.js"
import bs58 from "bs58";


type StoredWallet = {
  publicKey: string
  encryptedPrivateKey: string
  iv: string
  salt: string
}

async function getKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  )
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
  )
}

async function encryptPrivateKey(secretKey: Uint8Array, password: string): Promise<{ encrypted: string; iv: string; salt: string }> {
  const encoder = new TextEncoder()
  const data = encoder.encode(bs58.encode(secretKey))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const salt = crypto.getRandomValues(new Uint8Array(16))

  const key = await getKey(password, salt)

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  )

  return {
    encrypted: Buffer.from(encryptedBuffer).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    salt: Buffer.from(salt).toString("base64")
  }
}

async function decryptPrivateKey(encrypted: string, password: string, ivBase64: string, saltBase64: string): Promise<Uint8Array> {
  const iv = Uint8Array.from(Buffer.from(ivBase64, "base64"))
  const salt = Uint8Array.from(Buffer.from(saltBase64, "base64"))
  const encryptedBytes = Uint8Array.from(Buffer.from(encrypted, "base64"))

  const key = await getKey(password, salt)

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedBytes
  )

  const decoded = new TextDecoder().decode(decryptedBuffer)
  return bs58.decode(decoded)
}

function IndexPopup() {
  const [hasWallet, setHasWallet] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(["solanaWallet"], (result) => {
      const wallet: StoredWallet = result.solanaWallet
      if (wallet?.publicKey && wallet?.encryptedPrivateKey) {
        setHasWallet(true)
      } else {
        chrome.storage.local.remove("solanaWallet")
        setHasWallet(false)
      }
    })
  }, [])

  const handleCreateWallet = async () => {
    setIsCreating(true)
    try {
      const keypair = Keypair.generate()
      const publicKey = keypair.publicKey.toString()
      const result = await encryptPrivateKey(keypair.secretKey, password)

      await chrome.storage.local.set({
        solanaWallet: {
          publicKey,
          encryptedPrivateKey: result.encrypted,
          iv: result.iv,
          salt: result.salt,
        }
      })

      setWalletAddress(publicKey)
      setHasWallet(true)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to create wallet.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleUnlockWallet = async () => {
    setIsUnlocking(true)
    try {
      const result = await chrome.storage.local.get(["solanaWallet"])
      const wallet: StoredWallet = result.solanaWallet

      if (!wallet?.encryptedPrivateKey || !wallet?.publicKey) {
        throw new Error("No wallet found")
      }

      const decrypted = await decryptPrivateKey(
        wallet.encryptedPrivateKey,
        password,
        wallet.iv,
        wallet.salt
      )

      const restoredKeypair = Keypair.fromSecretKey(decrypted)
      setWalletAddress(restoredKeypair.publicKey.toString())
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Incorrect password or corrupted wallet.")
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleClearWallet = async () => {
    await chrome.storage.local.remove("solanaWallet")
    setHasWallet(false)
    setWalletAddress(null)
    setPassword("")
    setError(null)
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: 400,
        height: 600,
      }}
    >
      <h2>Solana Wallet</h2>

      {walletAddress ? (
        <>
          <p><strong>Wallet Address:</strong><br />{walletAddress}</p>
          <button onClick={handleClearWallet}>Clear Wallet</button>
        </>
      ) : hasWallet ? (
        <>
          <p>Enter your password to unlock wallet:</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleUnlockWallet} disabled={isUnlocking}>
            {isUnlocking ? "Unlocking..." : "Unlock Wallet"}
          </button>
        </>
      ) : (
        <>
          <p>Create a new wallet and set a password:</p>
          <input
            type="password"
            placeholder="Set Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleCreateWallet} disabled={isCreating || !password}>
            {isCreating ? "Creating..." : "Create Wallet"}
          </button>
        </>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
      <footer style={{ marginTop: "auto" }}>Crafted by @PlasmoHQ</footer>
    </div>
  )
}

export default IndexPopup
