import { useState } from "react";
import { FcGoogle } from "react-icons/fc";

interface WalletPageProps {
  hasWallet: boolean;
  walletAddress: string | null;
  onGoogleSignIn: () => Promise<void>;
  onClearWallet: () => Promise<void>;
  onBack: () => void;
  isCreatingTask: boolean;
}

function WalletPage({
  hasWallet,
  walletAddress,
  onGoogleSignIn,
  onClearWallet,
  onBack,
  isCreatingTask,
}: WalletPageProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await onGoogleSignIn();
    } catch (e) {
      console.error(e);
      setError("Failed to sign in: " + (e as Error).message);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Scrape</h2>
        <p className="text-sm text-gray-500">Manage your decentralized scraping tasks</p>
      </div>

      {walletAddress ? (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 font-semibold mb-1">Wallet Address:</p>
            <p className="text-gray-800 text-sm break-all">{walletAddress}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClearWallet}
              disabled={isCreatingTask}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-white transition-colors duration-200 ${
                isCreatingTask
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              Log Out
            </button>
            <button
              onClick={onBack}
              disabled={isCreatingTask}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-white transition-colors duration-200 ${
                isCreatingTask
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-gray-600 text-sm">
            Sign in to access your Scrape wallet and start managing your tasks.
          </p>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn || isCreatingTask}
            className={`w-full flex items-center justify-center py-3 rounded-lg font-semibold transition-colors duration-200 shadow-md ${
              isSigningIn || isCreatingTask
                ? "bg-gray-300 cursor-not-allowed text-gray-600"
                : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-800"
            }`}
          >
            <FcGoogle className="mr-2 text-2xl" />
            <span>{isSigningIn ? "Signing In..." : "Sign in with Google"}</span>
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>
      )}
    </div>
  );
}

export default WalletPage;