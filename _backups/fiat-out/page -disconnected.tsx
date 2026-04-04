"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

// ✅ USDT token contract on Ethereum Mainnet
const USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

// ✅ ERC-20 ABI
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
];

// ✅ Replace with your actual receiving wallet address
const RECEIVER_ADDRESS = "0x1865dae9C431AEBbe81E23f67569aFc44133e13B"; // ⚠️ Replace this!

export default function Home() {
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  // Load MetaMask provider
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);
    }
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    if (!provider) return;
    const accs = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    setSigner(signer);
    setAccount(accs[0]);
    fetchUSDTBalance(accs[0], provider);
  };

const disconnectWallet = () => {
  setAccount(null);
  setUsdtBalance(null);
  setSigner(null);
  setAmount("");
  setReference("");
};
  // Fetch USDT balance
  const fetchUSDTBalance = async (address: string, provider: any) => {
    const usdt = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, provider);
    const decimals = await usdt.decimals();
    const bal = await usdt.balanceOf(address);
    setUsdtBalance(Number(ethers.formatUnits(bal, decimals)).toFixed(2));
  };

  // Send USDT and reference
  const sendUSDT = async () => {
    if (!signer) {
      alert("Please connect wallet first");
      return;
    }

    try {
      const usdt = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, signer);
      const decimals = await usdt.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);

      const tx = await usdt.transfer(RECEIVER_ADDRESS, amountInWei);
      await tx.wait();

      alert("✅ USDT sent!");

      // ✅ Save to backend API (Step 3)
      await fetch("http://localhost:5000/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: account,
          to: RECEIVER_ADDRESS,
          amount,
          reference,
          txHash: tx.hash,
        }),
      });

      // Clear form and refresh
      setAmount("");
      setReference("");
      fetchUSDTBalance(account!, provider);
    } catch (err) {
      console.error(err);
      alert("Transfer failed ❌");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>💸 USDT Transfer with Reference</h1>

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
          <p>💰 USDT Balance: {usdtBalance}</p>

          <input
            placeholder="Amount (USDT)"
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

          <button onClick={sendUSDT} style={{ marginLeft: 10, padding: 10 }}>
            🚀 Send USDT
          </button>
        </>
      )}
    </div>
  );
}