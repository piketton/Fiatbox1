"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";

// Replace with your contract ABI and address
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "getNumber",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_num", "type": "uint256" }],
    "name": "setNumber",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
const CONTRACT_ADDRESS = "0xYourContractAddressHere";

export default function Home() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [network, setNetwork] = useState(null);
  const [provider, setProvider] = useState(null);

  // State for contract interaction
  const [storedNumber, setStoredNumber] = useState(null);
  const [newNumber, setNewNumber] = useState("");

  // Initialize provider on mount
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(newProvider);

      // Listen for account/network changes
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          fetchBalance(accounts[0], newProvider);
        } else {
          setAccount(null);
          setBalance(null);
        }
      });

      window.ethereum.on("chainChanged", async () => {
        await fetchNetwork(newProvider);
        if (account) fetchBalance(account, newProvider);
      });
    }
  }, []);

  // Connect Wallet
  const connectWallet = async () => {
    if (!provider) {
      alert("MetaMask is not installed!");
      return;
    }

    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      const selectedAccount = accounts[0];
      setAccount(selectedAccount);

      await fetchBalance(selectedAccount, provider);
      await fetchNetwork(provider);
    } catch (err) {
      console.error("User rejected request:", err);
    }
  };

  // Fetch Balance
  const fetchBalance = async (wallet, prov) => {
    const balanceWei = await prov.getBalance(wallet);
    const balanceInEth = ethers.formatEther(balanceWei);
    setBalance(parseFloat(balanceInEth).toFixed(4));
  };

  // Fetch Network
  const fetchNetwork = async (prov) => {
    const net = await prov.getNetwork();
    setNetwork(net.name);
  };

  // Contract: Read stored number
  const getStoredNumber = async () => {
    if (!provider) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const value = await contract.getNumber();
    setStoredNumber(value.toString());
  };

  // Contract: Write new number
  const setStoredNumberOnChain = async (e) => {
    e.preventDefault();
    if (!provider || !account) {
      alert("Connect your wallet first!");
      return;
    }

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.setNumber(newNumber);
      await tx.wait(); // wait for confirmation
      alert("Transaction confirmed!");
      setNewNumber("");
      getStoredNumber(); // refresh value
    } catch (err) {
      console.error("Transaction failed:", err);
      alert("Failed to write to contract.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4">
        🚀 Web3 DApp with Next.js & MetaMask
      </h1>

      {/* Connect Wallet Button */}
      <button
        onClick={connectWallet}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700"
      >
        {account
          ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`
          : "Connect Wallet"}
      </button>

      {/* Account Info */}
      {account && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-md text-center">
          <p className="text-lg">
            💰 Balance: <span className="font-semibold">{balance} ETH</span>
          </p>
          <p className="text-lg">
            🌐 Network:{" "}
            <span className="font-semibold">
              {network ? network : "Loading..."}
            </span>
          </p>
        </div>
      )}

      {/* Contract Interaction */}
      {account && (
        <div className="mt-6 p-4 bg-white rounded-lg shadow-md flex flex-col gap-3 w-96">
          <h2 className="text-xl font-semibold text-center">📜 Smart Contract</h2>
          
          <button
            onClick={getStoredNumber}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Get Stored Number
          </button>

          {storedNumber !== null && (
            <p className="text-center">
              🔢 Stored Number: <span className="font-semibold">{storedNumber}</span>
            </p>
          )}

          <form onSubmit={setStoredNumberOnChain} className="flex gap-2 mt-4">
            <input
              type="number"
              placeholder="New Number"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="flex-1 border p-2 rounded"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Set
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

