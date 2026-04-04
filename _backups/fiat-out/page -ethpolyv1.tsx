"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

// ---------------- Contract Addresses ---------------- //
const CONTRACTS: any = {
  ethereum: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    rpcUrls: ["https://mainnet.infura.io/v3/"],
    blockExplorerUrls: ["https://etherscan.io/"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  polygon: {
    USDT: "0xc29f3F2A5876c17bF3a7a40AdcC083D028844f8C",
    USDC: "0x2769BD83567C0e703B2aB6488305AAbFD3064247",
    chainId: "0x89",
    chainName: "Polygon Mainnet",
    rpcUrls: ["https://polygon-rpc.com/"],
    blockExplorerUrls: ["https://polygonscan.com/"],
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
};

// Your receiving wallet (use same one for both)
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
  const [selectedNetwork, setSelectedNetwork] = useState<"ethereum" | "polygon">("ethereum");

  // Initialize MetaMask provider
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);
    }
  }, []);

  // Switch network in MetaMask
  const switchNetwork = async (network: "ethereum" | "polygon") => {
    const net = CONTRACTS[network];
    try {
      await (window as any).ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: net.chainId,
            chainName: net.chainName,
            rpcUrls: net.rpcUrls,
            blockExplorerUrls: net.blockExplorerUrls,
            nativeCurrency: net.nativeCurrency,
          },
        ],
      });
      setSelectedNetwork(network);
      if (account) fetchTokenBalance(selectedToken, account, provider, network);
    } catch (err) {
      console.error("Failed to switch network:", err);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!provider) return;
    const accs = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    setSigner(signer);
    setAccount(accs[0]);
    fetchTokenBalance(selectedToken, accs[0], provider, selectedNetwork);
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setTokenBalance(null);
    setSigner(null);
    setAmount("");
    setReference("");
  };

  // Fetch token balance
  const fetchTokenBalance = async (
    token: "USDT" | "USDC",
    address: string,
    provider: any,
    network: "ethereum" | "polygon"
  ) => {
    const contractAddress = CONTRACTS[network][token];
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(address);
    setTokenBalance(Number(ethers.formatUnits(balance, decimals)).toFixed(2));
  };

  // Handle token change
  const handleTokenChange = (token: "USDT" | "USDC") => {
    setSelectedToken(token);
    if (account) fetchTokenBalance(token, account, provider, selectedNetwork);
  };

  // Send token
  const sendToken = async () => {
    if (!signer || !account) {
      alert("Please connect your wallet first");
      return;
    }
    try {
      const contractAddress = CONTRACTS[selectedNetwork][selectedToken];
      const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI, signer);
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);

      const tx = await tokenContract.transfer(RECEIVER_ADDRESS, amountInWei);
      await tx.wait();

      alert(`✅ ${selectedToken} sent on ${selectedNetwork}!`);

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
          network: selectedNetwork,
        }),
      });

      setAmount("");
      setReference("");
      fetchTokenBalance(selectedToken, account, provider, selectedNetwork);
    } catch (err) {
      console.error(err);
      alert("❌ Transfer failed");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>💸 Multi-Network DApp</h1>

      {/* Network Selector */}
      <div style={{ marginBottom: 20 }}>
        <label>
          Select Network:{" "}
          <select
            value={selectedNetwork}
            onChange={(e) => switchNetwork(e.target.value as "ethereum" | "polygon")}
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
