"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

// Networks config
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

// Receiving wallet address
const RECEIVER_ADDRESS = "0x184C2689221B9501331C1074c54Ee7c1bBAd447b";

// ERC20 ABI
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
];

export default function FiatOutPage() {
  const router = useRouter();

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
    fetchTokenBalance(selectedToken, accs[0], provider, selectedNetwork);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setTokenBalance(null);
    setAmount("");
    setReference("");
  };

  const switchNetwork = async (network: "ethereum" | "polygon") => {
    const net = NETWORKS[network];
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: net.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: net.chainId,
              chainName: net.chainName,
              rpcUrls: net.rpcUrls,
              blockExplorerUrls: net.blockExplorerUrls,
              nativeCurrency: net.nativeCurrency,
            }],
          });
        } catch (addError) {
          console.error("Failed to add network:", addError);
          return;
        }
      } else {
        console.error("Failed to switch network:", switchError);
        return;
      }
    }

    const newProvider = new ethers.BrowserProvider((window as any).ethereum);
    setProvider(newProvider);
    if (account) {
      const newSigner = await newProvider.getSigner();
      setSigner(newSigner);
      fetchTokenBalance(selectedToken, account, newProvider, network);
    }

    setSelectedNetwork(network);
  };

  const fetchTokenBalance = async (
    token: "USDT" | "USDC",
    address: string,
    provider: any,
    network: "ethereum" | "polygon"
  ) => {
    try {
      const contractAddress = NETWORKS[network].tokens[token];
      if (!ethers.isAddress(contractAddress)) {
        setTokenBalance("0");
        return;
      }
      const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
      let decimals = 18;
      try { decimals = await contract.decimals(); } catch {}
      const balanceRaw = await contract.balanceOf(address);
      setTokenBalance(Number(ethers.formatUnits(balanceRaw, decimals)).toFixed(2));
    } catch (err) {
      console.warn(
      `Failed to fetch ${token} balance on ${network}, possibly wrong contract address.`,
      err
    );
      setTokenBalance("0");
    }
  };

  const handleTokenChange = (token: "USDT" | "USDC") => {
    setSelectedToken(token);
    if (account) fetchTokenBalance(token, account, provider, selectedNetwork);
  };

  const sendToken = async () => {
  if (!signer || !account) {
    alert("Please connect your wallet first");
    return;
  }

  try {
    const contractAddress = NETWORKS[selectedNetwork].tokens[selectedToken];
    const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI, signer);

    let decimals = 18;
    try { decimals = await tokenContract.decimals(); } catch {}

    const amountInWei = ethers.parseUnits(amount, decimals);

    const tx = await tokenContract.transfer(RECEIVER_ADDRESS, amountInWei);
    await tx.wait();

    alert(`✅ ${selectedToken} sent on ${selectedNetwork}!`);
    setAmount("");
    setReference("");
    fetchTokenBalance(selectedToken, account, provider, selectedNetwork);

  } catch (err: any) {
    // User rejected transaction
    if (err.code === 4001 || err.code === "ACTION_REJECTED") {
      alert("❌ Transaction canceled by user");
    } else {
      console.error("Transaction error:", err);
      alert("❌ Transfer failed");
    }
  }
};



  return (
    <div className="min-h-screen bg-black bg-gradient-to-br from-black to-purple-900 flex items-center justify-center p-6">
      <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl max-w-xl w-full shadow-lg text-center">
        <h1 className="text-3xl font-bold text-yellow-300 mb-8">
          💸 Send {selectedToken} with Reference
        </h1>

        {/* Network Selector */}
        <div className="mb-6 text-left">
          <label className="block text-gray-300 font-medium mb-2">Select Network:</label>
          <select
            value={selectedNetwork}
            onChange={(e) => switchNetwork(e.target.value as "ethereum" | "polygon")}
            className="w-full p-3 rounded-lg bg-gray-900/70 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <option value="ethereum">Ethereum Mainnet</option>
            <option value="polygon">Polygon Mainnet</option>
          </select>
        </div>

        {/* Wallet */}
        {account ? (
          <>
            <p className="text-gray-300 mb-4">
              🧾 Connected: <span className="font-mono text-white break-all">{account}</span>
            </p>
            <button
              onClick={disconnectWallet}
              className="bg-yellow-300 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 mb-6"
            >
              🔓 Disconnect Wallet
            </button>
          </>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-yellow-300 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 mb-6"
          >
            🔌 Connect Wallet
          </button>
        )}

        {/* Token Form */}
        {account && (
          <div className="text-left">
            <label className="block text-gray-300 font-medium mb-2">Select Token:</label>
            <select
              value={selectedToken}
              onChange={(e) => handleTokenChange(e.target.value as "USDT" | "USDC")}
              className="w-full p-3 rounded-lg bg-gray-900/70 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 mb-4"
            >
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
            </select>

            <p className="text-gray-300 mb-4">
              💰 {selectedToken} Balance ({selectedNetwork}):{" "}
              <span className="text-white font-bold">{tokenBalance}</span>
            </p>

            <input
              placeholder={`Amount (${selectedToken})`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-900/70 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 mb-4"
            />

            <input
              placeholder="Reference note"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-900/70 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 mb-6"
            />

            <button
              onClick={sendToken}
              className="w-full bg-yellow-300 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-full transition-all transform hover:scale-105"
            >
              🚀 Send {selectedToken}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
