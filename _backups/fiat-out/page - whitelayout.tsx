"use client";
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
  const [selectedNetwork, setSelectedNetwork] = useState<"ethereum" | "polygon">("ethereum");

  // Initialize MetaMask provider
  useEffect(() => {
    if (typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined") {
      const p = new ethers.BrowserProvider((window as any).ethereum);
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

  // Switch network and recreate provider & signer
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
        } catch (addError) {
          console.error("Failed to add network:", addError);
          return;
        }
      } else {
        console.error("Failed to switch network:", switchError);
        return;
      }
    }

    // Recreate provider & signer after network switch
    const newProvider = new ethers.BrowserProvider((window as any).ethereum);
    setProvider(newProvider);
    if (account) {
      const newSigner = await newProvider.getSigner();
      setSigner(newSigner);
      // Fetch balance after network switch
      fetchTokenBalance(selectedToken, account, newProvider, network);
    }

    setSelectedNetwork(network);
  };

  // Fetch token balance safely
  const fetchTokenBalance = async (
    token: "USDT" | "USDC",
    address: string,
    provider: any,
    network: "ethereum" | "polygon"
  ) => {
    try {
      const contractAddress = NETWORKS[network].tokens[token];
      if (!ethers.isAddress(contractAddress)) {
        console.warn(`Invalid contract address for ${token} on ${network}`);
        setTokenBalance("0");
        return;
      }


      

      //if (!ethers.isAddress(contractAddress)) {
        //console.warn(`Invalid contract address for ${token} on ${network}: ${contractAddress}`);
        //setTokenBalance("0");
        //return;
      //}

      const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

      // Safe decimals()
      let decimals = 18;
      try {
        decimals = await contract.decimals();
      } catch (err) {
        console.warn(`Could not fetch decimals for ${token} on ${network}, assuming 18`, err);
      }

      // Safe balanceOf()
      let balanceRaw;
      try {
        balanceRaw = await contract.balanceOf(address);
      } catch (err) {
        console.error(`Failed to fetch balance for ${token} on ${network}:`, err);
        setTokenBalance("0");
        return;
      }

      setTokenBalance(Number(ethers.formatUnits(balanceRaw, decimals)).toFixed(2));
    } catch (err) {
      console.error(`Unexpected error fetching balance for ${token} on ${network}:`, err);
      setTokenBalance("0");
    }
  };

  // Handle token dropdown change
  const handleTokenChange = (token: "USDT" | "USDC") => {
    setSelectedToken(token);
    if (account) fetchTokenBalance(token, account, provider, selectedNetwork);
  };

  // Send token with reference
  const sendToken = async () => {
    if (!signer || !account) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const contractAddress = NETWORKS[selectedNetwork].tokens[selectedToken];
      const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI, signer);

      let decimals = 18;
      try {
        decimals = await tokenContract.decimals();
      } catch (err) {
        console.warn(`Could not fetch decimals for ${selectedToken} on ${selectedNetwork}, assuming 18`, err);
      }

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
      <h1>💸 Send {selectedToken} with Reference</h1>

      <div style={{ marginBottom: 20 }}>
        <label>
          Select Network:
          <select
            value={selectedNetwork}
            onChange={(e) => switchNetwork(e.target.value as "ethereum" | "polygon")}
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
                onChange={(e) => handleTokenChange(e.target.value as "USDT" | "USDC")}
                style={{ marginLeft: 10 }}
              >
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
              </select>
            </label>
          </div>

          <p>
            💰 {selectedToken} Balance ({selectedNetwork}): {tokenBalance}
          </p>

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

