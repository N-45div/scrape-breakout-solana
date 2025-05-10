import { useState } from "react"

interface WalletPageProps {
  hasWallet: boolean;
  walletAddress: string | null;
  onCreateWallet: (password: string) => Promise<void>;
  onUnlockWallet: (password: string) => Promise<void>;
  onClearWallet: () => Promise<void>;
  onBack: () => void;
  isCreatingTask: boolean;
}

const MAX_PASSWORD_LENGTH = 6

function PasswordInput({
  password,
  setPassword,
  placeholder = "Password"
}: {
  password: string
  setPassword: (value: string) => void
  placeholder?: string
}) {
  const codeList = new Array(MAX_PASSWORD_LENGTH)
    .fill("")
    .map((_, i) => password[i])

  return (
    <div className="code-wrap">
      <div className="code-list">
        {codeList.map((item, index) => (
          <div className="code-item" key={index}>
            <div className="code-desc all-center">
              {item ? <i className="code-dot"></i> : null}
            </div>
          </div>
        ))}
      </div>
      <input
        className="opacity-0 absolute w-[302px] h-[70px] p-0 left-0 -top-[11px]"
        type="password"
        placeholder={placeholder}
        value={password}
        onChange={(e) => {
          if (e.target.value.length > MAX_PASSWORD_LENGTH) return
          setPassword(e.target.value)
        }}
      />
    </div>
  )
}

function WalletPage({
  hasWallet,
  walletAddress,
  onCreateWallet,
  onUnlockWallet,
  onClearWallet,
  onBack
}: WalletPageProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)

  const handleCreateWallet = async () => {
    setIsCreating(true)
    setError(null)
    try {
      await onCreateWallet(password)
    } catch (e) {
      console.error(e)
      setError("Failed to create wallet.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleUnlockWallet = async () => {
    setIsUnlocking(true)
    setError(null)
    try {
      await onUnlockWallet(password)
    } catch (e) {
      console.error(e)
      setError("Incorrect password or wallet is corrupted.")
    } finally {
      setIsUnlocking(false)
    }
  }

  return (
    <div className="wallet-page">
      <h2 className="text-[20px] text-center">Welcome to Scrape</h2>

      {walletAddress ? (
        <>
          <p>
            <strong>Wallet Address:</strong>
            <br />
            {walletAddress}
          </p>
          <div className="button-group">
            <button onClick={onClearWallet}>Clear Wallet</button>
            <button className="back-button" onClick={onBack}>
              Back
            </button>
          </div>
        </>
      ) : hasWallet ? (
        <>
          <p>Enter your password to unlock wallet:</p>
          <PasswordInput
            password={password}
            setPassword={setPassword}
            placeholder="Enter password"
          />
          <button
            onClick={handleUnlockWallet}
            disabled={isUnlocking || password.length !== MAX_PASSWORD_LENGTH}>
            {isUnlocking ? "Unlocking..." : "Unlock Wallet"}
          </button>
        </>
      ) : (
        <>
          <p>Create a new wallet and set a password:</p>
          <PasswordInput
            password={password}
            setPassword={setPassword}
            placeholder="Set password"
          />
          <button
            onClick={handleCreateWallet}
            disabled={isCreating || password.length !== MAX_PASSWORD_LENGTH}>
            {isCreating ? "Creating..." : "Create Wallet"}
          </button>
        </>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  )
}

export default WalletPage
