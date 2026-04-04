"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Connection, PublicKey, clusterApiUrl, Transaction, SystemProgram } from "@solana/web3.js";

// ---------------- Ethereum Setup ---------------- //
const USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDC_CONTRACT_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const RECEIVER_ADDRESS_ETH = "0x184C2689221B9501331C1074c54Ee7c1bBAd447b";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
];

// ---------------- Solana Setup ---------------- //
const RECEIVER_ADDRESS_SOL = "FwT1ssS5dSLxnR7VaYEuA1T9fSApnKtxi9FtmtRVHmsJ"; // <-- replace with your Solana receiving wallet
const SOLANA_NETWORK = clusterApiUrl("devnet"); // use "mainnet-beta" for production

export default function Home() {
  // Shared
  const [chain, setChain] = useState<"ethereum" | "solana">("ethereum");

  // Ethereum state
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [ethAccount, setEthAccount] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [selectedToken, setSelectedToken] = useState<"USDT" | "USDC">("USDT");

  // Solana state
  const [solanaAccount, setSolanaAccount] = useState<string | null>(null);
  const [solConnection] = useState(new Connection(SOLANA_NETWORK));

  // ---------------- Ethereum Logic ---------------- //
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);
    }
  }, []);

  const connectEthWallet = async () => {
    if (!provider) return;
    const accs = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    setSigner(signer);
    setEthAccount(accs[0]);
    fetchTokenBalance(selectedToken, accs[0], provider);
  };

  const disconnectEthWallet = () => {
    setEthAccount(null);
    setTokenBalance(null);
    setSigner(null);
    setAmount("");
    setReference("");
  };

  const fetchTokenBalance = async (token: "USDT" | "USDC", address: string, provider: any) => {
    const contractAddress = token === "USDT" ? USDT_CONTRACT_ADDRESS : USDC_CONTRACT_ADDRESS;
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(address);
    setTokenBalance(Number(ethers.formatUnits(balance, decimals)).toFixed(2));
  };

  const sendEthToken = async () => {
    if (!signer || !ethAccount) {
      alert("Please connect your Ethereum wallet first");
      return;
    }
    try {
      const contractAddress = selectedToken === "USDT" ? USDT_CONTRACT_ADDRESS : USDC_CONTRACT_ADDRESS;
      const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI, signer);
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);

      const tx = await tokenContract.transfer(RECEIVER_ADDRESS_ETH, amountInWei);
      await tx.wait();

      alert(`✅ ${selectedToken} sent on Ethereum!`);
      setAmount("");
      setReference("");
      fetchTokenBalance(selectedToken, ethAccount, provider);
    } catch (err) {
      console.error(err);
      alert("❌ Transfer failed");
    }
  };

  // ---------------- Solana Logic ---------------- //
  const connectSolanaWallet = async () => {
    try {
      const resp = await (window as any).solana.connect();
      setSolanaAccount(resp.publicKey.toString());
    } catch (err) {
      console.error("Phantom connect error:", err);
    }
  };

  const disconnectSolanaWallet = async () => {
    try {
      await (window as any).solana.disconnect();
      setSolanaAccount(null);
    } catch (err) {
      console.error("Phantom disconnect error:", err);
    }
  };

  const sendSol = async () => {
    if (!solanaAccount) {
      alert("Connect your Solana wallet first!");
      return;
    }
    try {
      const fromPubkey = new PublicKey(solanaAccount);
      const toPubkey = new PublicKey(RECEIVER_ADDRESS_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: parseFloat(amount) * 1e9, // 1 SOL = 10^9 lamports
        })
      );

      const { blockhash } = await solConnection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signed = await (window as any).solana.signTransaction(transaction);
      const txid = await solConnection.sendRawTransaction(signed.serialize());
      await solConnection.confirmTransaction(txid);

      alert(`✅ Sent ${amount} SOL on Solana! Tx: ${txid}`);
      setAmount("");
      setReference("");
    } catch (err) {
      console.error(err);
      alert("❌ Solana transfer failed");
    }
  };

  // ---------------- UI ---------------- //
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>💸 Multi-Chain Payment DApp</h1>

      <div style={{ marginBottom: 20 }}>
        <label>
          Select Chain:{" "}
          <select value={chain} onChange={(e) => setChain(e.target.value as any)}>
            <option value="ethereum">Ethereum</option>
            <option value="solana">Solana</option>
          </select>
        </label>
      </div>

      {chain === "ethereum" ? (
        <>
          {ethAccount ? (
            <>
              <p>🧾 Connected (ETH): {ethAccount}</p>
              <button onClick={disconnectEthWallet}>🔓 Disconnect</button>
              <div style={{ marginTop: 20 }}>
                <label>
                  Select Token:
                  <select
                    value={selectedToken}
                    onChange={(e) => fetchTokenBalance(e.target.value as any, ethAccount, provider)}
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
              />
              <input
                placeholder="Reference note"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <button onClick={sendEthToken}>🚀 Send {selectedToken}</button>
            </>
          ) : (
            <button onClick={connectEthWallet}>🔌 Connect MetaMask</button>
          )}
        </>
      ) : (
        <>
          {solanaAccount ? (
            <>
              <p>🧾 Connected (SOL): {solanaAccount}</p>
              <button onClick={disconnectSolanaWallet}>🔓 Disconnect</button>
              <div style={{ marginTop: 20 }}>
                <input
                  placeholder="Amount (SOL)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <input
                  placeholder="Reference note"
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <button onClick={sendSol}>🚀 Send SOL</button>
              </div>
            </>
          ) : (
            <button onClick={connectSolanaWallet}>🔌 Connect Phantom</button>
          )}
        </>
      )}
    </div>
  );
}
