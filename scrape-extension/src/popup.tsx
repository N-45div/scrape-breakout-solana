import { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./client/supabaseClient";
import "./style.css";

import MainPage from "./views/MainPage";
import WalletPage from "./views/WalletPage";
import CreateTasksPage from "./views/CreateTasksPage";
import NodeSettingsPage from "./views/NodeSettingsPage";
import TaskListPage from "./views/TaskListPage";
import NodeForbesPage from "./views/NodeForbesPage";
import CreateNodePage from "./views/CreateNodePage";
import NodeTasksPage from "./views/NodeTasksPage";

function IndexPopup() {
  const [hasWallet, setHasWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showMainPage, setShowMainPage] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setHasWallet(false);
          setWalletAddress(null);
          setUserEmail(null);
          setShowMainPage(false);
          console.log("No authenticated user.");
          setIsLoadingWallet(false);
          return;
        }

        const userEmail = session.user.email;
        if (!userEmail) {
          throw new Error("Authenticated user has no email.");
        }

        const { data, error } = await supabase
          .from("users")
          .select("wallet_address")
          .eq("auth_user_id", session.user.id)
          .single();

        if (error || !data) {
          setHasWallet(false);
          setWalletAddress(null);
          setUserEmail(userEmail);
          setShowMainPage(false);
          console.log("No user found in Supabase users table.");
        } else {
          setHasWallet(true);
          setWalletAddress(data.wallet_address);
          setUserEmail(userEmail);
          setShowMainPage(true);
          console.log("User found with wallet address:", data.wallet_address);
        }
      } catch (error) {
        console.error("Failed to fetch user data from Supabase:", error);
        setHasWallet(false);
        setWalletAddress(null);
        setUserEmail(null);
        setShowMainPage(false);
      } finally {
        setIsLoadingWallet(false);
      }
    };

    fetchUserData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        fetchUserData();
      } else if (event === "SIGNED_OUT") {
        setHasWallet(false);
        setWalletAddress(null);
        setUserEmail(null);
        setShowMainPage(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (walletAddress) {
      setShowMainPage(true);
      console.log("Wallet state updated - walletAddress:", walletAddress);
    } else {
      setShowMainPage(false);
      console.log("Wallet state cleared - walletAddress:", walletAddress);
    }
  }, [walletAddress]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoadingWallet(true);
      setErrorMessage(null);

      const manifest = chrome.runtime.getManifest();
      const url = new URL("https://accounts.google.com/o/oauth2/auth");
      url.searchParams.set("client_id", manifest.oauth2.client_id);
      url.searchParams.set("response_type", "code"); // Use authorization code flow
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent"); // Ensure refresh token is provided
      url.searchParams.set("redirect_uri", `https://${chrome.runtime.id}.chromiumapp.org`);
      url.searchParams.set("scope", manifest.oauth2.scopes.join(" "));
      
      // Add state parameter for CSRF protection
      const state = Math.random().toString(36).substring(7);
      url.searchParams.set("state", state);
      
      console.log("OAuth URL:", url.href); // Debugging

      chrome.identity.launchWebAuthFlow(
        {
          url: url.href,
          interactive: true,
        },
        async (redirectedTo) => {
          if (chrome.runtime.lastError || !redirectedTo) {
            setErrorMessage("Google sign-in failed: " + (chrome.runtime.lastError?.message || "Unknown error"));
            setIsLoadingWallet(false);
            return;
          }

          // Parse the redirect URL to get the authorization code
          const redirectUrl = new URL(redirectedTo);
          const params = new URLSearchParams(redirectUrl.search);
          const code = params.get("code");
          const returnedState = params.get("state");

          if (!code) {
            setErrorMessage("No authorization code found in redirect URL");
            setIsLoadingWallet(false);
            return;
          }

          if (returnedState !== state) {
            setErrorMessage("State mismatch: Possible CSRF attack");
            setIsLoadingWallet(false);
            return;
          }

          // Exchange the authorization code for tokens via the backend
          const response = await fetch("http://127.0.0.1:3000/exchange-code", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code,
              redirect_uri: `https://${chrome.runtime.id}.chromiumapp.org`,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage("Failed to exchange code: " + errorData.error);
            setIsLoadingWallet(false);
            return;
          }

          const { access_token, id_token, refresh_token } = await response.json();

          if (!id_token) {
            setErrorMessage("No ID token received from backend");
            setIsLoadingWallet(false);
            return;
          }

          // Use the ID token to sign in with Supabase
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: id_token,
          });

          if (error) {
            setErrorMessage("Supabase sign-in failed: " + error.message);
            setIsLoadingWallet(false);
            return;
          }

          const { user } = data;
          if (!user || !user.email) {
            setErrorMessage("Failed to retrieve user email from Supabase");
            setIsLoadingWallet(false);
            return;
          }

          // Call the backend to create the user and wallet
          const createUserResponse = await fetch("http://127.0.0.1:3000/create-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: user.email,
              accessToken: access_token,
            }),
          });

          if (!createUserResponse.ok) {
            const error = await createUserResponse.json();
            setErrorMessage("Failed to create user: " + error.error);
            setIsLoadingWallet(false);
            return;
          }

          const { userId, walletAddress } = await createUserResponse.json();
          console.log("User created:", { userId, walletAddress });

          setWalletAddress(walletAddress);
          setHasWallet(true);
          setUserEmail(user.email);
          setShowMainPage(true);
          setIsLoadingWallet(false);
        }
      );
    } catch (error: any) {
      console.error("Error during Google sign-in:", error);
      setErrorMessage("Sign-in failed: " + error.message);
      setIsLoadingWallet(false);
    }
  };

  const handleClearWallet = async () => {
    if (isCreatingTask) {
      setErrorMessage("Cannot log out while a task is being created.");
      return;
    }
    try {
      setIsLoadingWallet(true);
      setErrorMessage(null);
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("Failed to log out:", error);
      setErrorMessage("Logout failed: " + error.message);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const handleWalletClick = () => {
    setShowMainPage(false);
  };

  if (isLoadingWallet) {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-[350px] bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="flex flex-col items-center space-y-6">
        <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-xl font-medium text-gray-700">Loading wallet...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we set up your wallet</p>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-[400px] w-[350px] bg-gradient-to-br from-blue-50 to-gray-100 p-5 flex flex-col">
      <Router>
        <div className="flex-1">
          {showMainPage ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <h1 className="text-xl font-bold text-gray-800 mb-3">Scrape Dashboard</h1>
                {userEmail && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Logged in as:</span> {userEmail}
                  </p>
                )}
                {walletAddress && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Wallet:</span>{" "}
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                )}
              </div>
              {errorMessage && (
                <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{errorMessage}</p>
              )}
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <MainPage
                        walletAddress={walletAddress}
                        onWalletClick={handleWalletClick}
                      />
                    }
                  />
                  <Route
                    path="/create-tasks"
                    element={<CreateTasksPage walletAddress={walletAddress} setIsCreatingTask={setIsCreatingTask} />}
                  />
                  <Route
                    path="/node-settings"
                    element={<NodeSettingsPage walletAddress={walletAddress} />}
                  />
                  <Route
                    path="/task-list"
                    element={<TaskListPage walletAddress={walletAddress} />}
                  />
                  <Route
                    path="/node-forbes"
                    element={<NodeForbesPage walletAddress={walletAddress} />}
                  />
                  <Route
                    path="/create-node"
                    element={<CreateNodePage walletAddress={walletAddress} />}
                  />
                  <Route
                    path="/node-tasks"
                    element={<NodeTasksPage walletAddress={walletAddress} />}
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {errorMessage && (
                <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{errorMessage}</p>
              )}
              <WalletPage
                hasWallet={hasWallet}
                walletAddress={walletAddress}
                onGoogleSignIn={handleGoogleSignIn}
                onClearWallet={handleClearWallet}
                onBack={() => setShowMainPage(true)}
                isCreatingTask={isCreatingTask}
              />
            </div>
          )}
        </div>
      </Router>
    </div>
  );
}

export default IndexPopup;