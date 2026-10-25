import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const initWallet = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      setError("MetaMask is not installed. Please install MetaMask to use this app.");
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_accounts", []);

      if (accounts.length > 0) {
        const network = await browserProvider.getNetwork();
        const browserSigner = await browserProvider.getSigner();

        setAccount(accounts[0].toLowerCase());
        setProvider(browserProvider);
        setSigner(browserSigner);
        setChainId(network.chainId.toString());
      }
    } catch (err) {
      console.error("Wallet check error:", err);
    }
  }, []);

  useEffect(() => {
    initWallet();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (accounts.length > 0) {
          setAccount(accounts[0].toLowerCase());
        } else {
          setAccount(null);
          setSigner(null);
        }
        window.location.assign("/login");
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum?.removeAllListeners) {
        window.ethereum.removeAllListeners();
      }
    };
  }, [initWallet]);

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask not found. Please install the MetaMask extension.");
    }

    setIsConnecting(true);
    setError(null);

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const browserSigner = await browserProvider.getSigner();

      setAccount(accounts[0].toLowerCase());
      setProvider(browserProvider);
      setSigner(browserSigner);
      setChainId(network.chainId.toString());

      return {
        account: accounts[0].toLowerCase(),
        signer: browserSigner,
        provider: browserProvider,
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const switchToLocalhost = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x7a69" }], // 31337 in hex
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x7a69",
              chainName: "Hardhat Localhost",
              rpcUrls: ["http://127.0.0.1:8545"],
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
              },
            },
          ],
        });
      }
    }
  };

  return {
    account,
    provider,
    signer,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchToLocalhost,
  };
}

