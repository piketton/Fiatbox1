"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

// ✅ ERC-20 USDT Token contract address (Ethereum mainnet)
const USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

// ✅ Minimal ERC-20 ABI to interact with USDT
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)"
];

// ✅ Your receiving wallet address
const RECEIVER_ADDRESS = "0x1865dae9C431AEBbe81E23f67569aFc44133e13B"; // Replace with your web wallet

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) return;
    const accs = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    setSigner(signer);
    setAccount(accs[0]);
    fetchUSDTBalance(accs[0], provider);
  };

  const fetchUSDTBalance = async (address, provider) => {
    const usdt = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, provider);
    const decimals = await usdt.decimals();
    const bal = await usdt.balanceOf(address);
    setUsdtBalance(Number(ethers.formatUnits(bal, decimals)).toFixed(2));
  };

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
      alert("USDT sent successfully ✅");
      setAmount("");
      fetchUSDTBalance(account, provider);
    } catch (err) {
      console.error(err);
      alert("Transfer failed");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>💸 USDT Transfer with MetaMask</h1>

      {!account ? (
        <button onClick={connectWallet}>🔌 Connect Wallet</button>
      ) : (
        <p>🧾 Connected: {account}</p>
      )}

      {account && (
        <>
          <p>💰 USDT Balance: {usdtBalance}</p>

          <input
            placeholder="Amount in USDT"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ padding: 8, marginTop: 10 }}
          />

          <button onClick={sendUSDT} style={{ marginLeft: 10 }}>
            🚀 Send
          </button>
        </>
      )}
    </div>
  );
}
