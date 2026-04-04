"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

// Token contract addresses (Ethereum Mainnet)
const USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDC_CONTRACT_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// Your receiving wallet address
const RECEIVER_ADDRESS = "0x184C2689221B9501331C1074c54Ee7c1bBAd447b";

// ERC-20 ABI
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
];

export default function Home() {
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [selectedToken, setSelectedToken] = useState<"USDT" | "USDC">("USDT");

  // Initialize MetaMask provider
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
    fetchTokenBalance(selectedToken, accs[0], provider);
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setTokenBalance(null);
    setSigner(null);
    setAmount("");
    setReference("");
  };

  // Fetch token balance (USDT or USDC)
  const fetchTokenBalance = async (
    token: "USDT" | "USDC",
    address: string,
    provider: any
  ) => {
    const contractAddress = token === "USDT" ? USDT_CONTRACT_ADDRESS : USDC_CONTRACT_ADDRESS;
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(address);
    setTokenBalance(Number(ethers.formatUnits(balance, decimals)).toFixed(2));
  };

  // Handle token dropdown change
  const handleTokenChange = (token: "USDT" | "USDC") => {
    setSelectedToken(token);
    if (account) fetchTokenBalance(token, account, provider);
  };

  // Send selected token with reference
  const sendToken = async () => {
    if (!signer || !account) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const contractAddress = selectedToken === "USDT" ? USDT_CONTRACT_ADDRESS : USDC_CONTRACT_ADDRESS;
      const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI, signer);
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);

      const tx = await tokenContract.transfer(RECEIVER_ADDRESS, amountInWei);
      await tx.wait();

      alert(`✅ ${selectedToken} sent!`);

      // Log transfer to backend
      await fetch("http://localhost:5000/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: account,
          to: RECEIVER_ADDRESS,
          amount,
          reference,
          txHash: tx.hash,
          token: selectedToken,
        }),
      });

      // Reset form
      setAmount("");
      setReference("");
      fetchTokenBalance(selectedToken, account, provider);
    } catch (err) {
      console.error(err);
      alert("❌ Transfer failed");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>💸 Send {selectedToken} with Reference</h1>

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
                onChange={(e) => handleTokenChange(e.target.value as "USDT" | "USDC")}
                style={{ marginLeft: 10 }}
              >
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
              </select>
            </label>
          </div>

          <p>💰 {selectedToken} Balance: {tokenBalance}</p>

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

          <button onClick={sendToken} style={{ marginLeft: 10, padding: 10 }}>
            🚀 Send {selectedToken}
          </button>
        </>
      )}
    </div>
  );
}
