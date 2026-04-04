"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

const NETWORKS = {
  ethereum: {
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    rpcUrls: ["https://rpc.ankr.com/eth"],
    blockExplorerUrls: ["https://etherscan.io"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    tokens: {
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    },
  },
  polygon: {
    chainId: "0x89",
    chainName: "Polygon Mainnet",
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    tokens: {
      USDT: "0xc29f3F2A5876c17bF3a7a40AdcC083D028844f8C",
      USDC: "0x2769BD83567C0e703B2aB6488305AAbFD3064247",
    },
  },
};

export default function FiatInPage() {
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [account, setAccount] = useState<string | null>(null);

  const [selectedNetwork, setSelectedNetwork] = useState<"ethereum" | "polygon">("ethereum");
  const [selectedToken, setSelectedToken] = useState<"USDT" | "USDC">("USDT");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const p = new ethers.BrowserProvider((window as any).ethereum);
      setProvider(p);
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) return;
    const accs = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    setSigner(signer);
    setAccount(accs[0]);
  };

  const disconnectWallet = () => {
    setSigner(null);
    setAccount(null);
    setAmount("");
    setReference("");
  };

  const submitFiatIn = async () => {
    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fiat_in",
          from: account,
          network: selectedNetwork,
          token: selectedToken,
          amount,
          reference,
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log("✅ Fiat In saved:", data);

      alert("✅ Fiat In request submitted!");
      setAmount("");
      setReference("");
    } catch (err) {
      console.error("Error submitting fiat in:", err);
      alert("❌ Unexpected error");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>💳 Fiat In</h1>

      <div style={{ marginBottom: 20 }}>
        <label>
          Select Network:
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value as "ethereum" | "polygon")}
            style={{ marginLeft: 10 }}
          >
            <option value="ethereum">Ethereum Mainnet</option>
            <option value="polygon">Polygon Mainnet</option>
          </select>
        </label>
      </div>

      {account ? (
        <>
          <p>🧾 Connected: {account}</p>
          <button onClick={disconnectWallet} style={{ marginTop: 20 }}>
            🔓 Disconnect Wallet
          </button>
        </>
      ) : (
        <button onClick={connectWallet}>🔌 Connect Wallet</button>
      )}

      {account && (
        <>
          <div style={{ marginTop: 20 }}>
            <label>
              Select Token:
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value as "USDT" | "USDC")}
                style={{ marginLeft: 10 }}
              >
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
              </select>
            </label>
          </div>

          <input
            placeholder={`Amount (${selectedToken})`}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ padding: 8, marginTop: 10, width: "200px" }}
          />

          <input
            placeholder="Reference note"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            style={{ padding: 8, marginTop: 10, width: "300px", marginLeft: 10 }}
          />

          <button onClick={submitFiatIn} style={{ marginLeft: 10, padding: 10 }}>
            🚀 Submit Request
          </button>
        </>
      )}
    </div>
  );
}
