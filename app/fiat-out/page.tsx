"use client";

import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";

const POLYGON_CHAIN_ID = "0x89";

const TOKEN_ADDRESSES: Record<TokenName, string> = {
  USDT: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  USDC: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  EURC: "0x37e4e3db4b629d7db95b2c36b5be11e31efddb0f",
};

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
];

type TokenName = "USDT" | "USDC" | "EURC";

const TOKEN_LABELS: Record<TokenName, string> = {
  USDT: "USDT — Tether",
  USDC: "USDC — USD Coin",
  EURC: "EURC — Euro Coin",
};

// Dedicated read-only provider — staticNetwork skips auto-detection calls
const READ_PROVIDER = new ethers.JsonRpcProvider(
  "https://polygon.gateway.tenderly.co",
  137,
  { staticNetwork: true }
);

interface QRPayload {
  id?: string;
  address: string;
  token?: TokenName;
  amount?: string;
  network?: string;
}

export default function FiatOutPage() {
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenName>("USDT");
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<QRPayload | null>(null);
  const [scanning, setScanning] = useState(false);
  const [sending, setSending] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      setProvider(new ethers.BrowserProvider(eth));
      eth.on("chainChanged", (chainId: string) => {
        if (chainId === POLYGON_CHAIN_ID) setProvider(new ethers.BrowserProvider(eth));
      });
    }
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, []);

  const fetchBalance = async (token: TokenName, address: string) => {
    try {
      const rawAddr = TOKEN_ADDRESSES[token];
      if (!rawAddr || !ethers.isAddress(rawAddr)) { setTokenBalance("0"); return; }
      const contract = new ethers.Contract(ethers.getAddress(rawAddr), ERC20_ABI, READ_PROVIDER);
      let decimals = 6;
      try { decimals = await contract.decimals(); } catch {}
      const raw = await contract.balanceOf(address);
      setTokenBalance(Number(ethers.formatUnits(raw, decimals)).toFixed(2));
    } catch {
      setTokenBalance("0");
    }
  };

  const switchToPolygon = async (eth: any) => {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: POLYGON_CHAIN_ID }] });
    } catch (err: any) {
      if (err.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: POLYGON_CHAIN_ID,
            chainName: "Polygon Mainnet",
            rpcUrls: ["https://polygon-bor-rpc.publicnode.com", "https://1rpc.io/matic"],
            blockExplorerUrls: ["https://polygonscan.com"],
            nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
          }],
        });
      } else throw err;
    }
  };

  const connectWallet = async () => {
    if (!provider) return;
    const eth = (window as any).ethereum;
    const chainId = await eth.request({ method: "eth_chainId" });
    if (chainId !== POLYGON_CHAIN_ID) {
      try { await switchToPolygon(eth); } catch {
        alert("Please switch to Polygon Network to continue.");
        return;
      }
    }
    const newProvider = new ethers.BrowserProvider(eth);
    const accs = await newProvider.send("eth_requestAccounts", []);
    const s = await newProvider.getSigner();
    setProvider(newProvider);
    setSigner(s);
    setAccount(accs[0]);
    await fetchBalance(selectedToken, accs[0]);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setTokenBalance(null);
    setAmount("");
    setRecipientAddress(null);
    setQrPayload(null);
  };

  const handleTokenChange = (token: TokenName) => {
    setSelectedToken(token);
    if (account) fetchBalance(token, account);
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded: string) => {
          handleQrResult(decoded);
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          setScanning(false);
        },
        undefined
      );
    } catch {
      setScanning(false);
      alert("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleQrResult = (decoded: string) => {
    try {
      const payload = JSON.parse(decoded) as QRPayload;
      if (!ethers.isAddress(payload.address)) { alert("Invalid QR code."); return; }
      setQrPayload(payload);
      setRecipientAddress(payload.address);
      if (payload.token && (["USDT", "USDC", "EURC"] as string[]).includes(payload.token)) {
        setSelectedToken(payload.token as TokenName);
        if (account) fetchBalance(payload.token as TokenName, account);
      }
      if (payload.amount && Number(payload.amount) > 0) setAmount(payload.amount);
    } catch {
      if (ethers.isAddress(decoded.trim())) {
        setRecipientAddress(decoded.trim());
      } else {
        alert("Invalid QR code.");
      }
    }
  };

  const sendToken = async () => {
    if (!signer || !account) { alert("Please connect your wallet first"); return; }
    if (!recipientAddress) { alert("Please scan a QR code first"); return; }
    if (!amount || Number(amount) <= 0) { alert("Enter a valid amount"); return; }
    if (Number(amount) > 500) { alert("Maximum amount is 500"); return; }

    setSending(true);
    try {
      const rawAddr = TOKEN_ADDRESSES[selectedToken];
      if (!rawAddr) { alert("Token address not configured"); return; }

      const contractAddress = ethers.getAddress(rawAddr);
      const readContract = new ethers.Contract(contractAddress, ERC20_ABI, READ_PROVIDER);
      let decimals = 6;
      try { decimals = await readContract.decimals(); } catch {}

      const iface = new ethers.Interface(ERC20_ABI);
      const data = iface.encodeFunctionData("transfer", [
        ethers.getAddress(recipientAddress),
        ethers.parseUnits(amount, decimals),
      ]);

      const txHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: contractAddress, data }],
      });

      fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fiat_out",
          from: account,
          to: recipientAddress,
          network: "polygon",
          token: selectedToken,
          amount,
          reference: qrPayload?.id ?? "",
          txHash,
        }),
      }).catch(() => {});

      alert(`${selectedToken} sent successfully.`);
      setAmount("");
      setRecipientAddress(null);
      setQrPayload(null);
      await fetchBalance(selectedToken, account);
    } catch (err: any) {
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        alert("Transaction cancelled.");
      } else {
        console.error(err);
        alert("Transfer failed. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef4fb] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm mb-4">
        <a href="/" className="text-[#1a56a0] text-sm font-medium hover:underline">← Back</a>
      </div>

      <div className="bg-white border border-[#c9d9ee] rounded-2xl w-full max-w-sm shadow-sm overflow-hidden">
        <div className="bg-[#1a56a0] px-6 py-5">
          <h1 className="text-white text-xl font-bold">Cash Out</h1>
          <p className="text-[#a8c8f0] text-sm mt-1">Send stablecoin · Receive fiat</p>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Network badge */}
          <span className="inline-flex items-center gap-1.5 bg-[#eef4fb] border border-[#c9d9ee] text-[#1a56a0] text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-[#1a56a0] rounded-full inline-block" />
            Polygon Network
          </span>

          {/* Token selector */}
          <div>
            <p className="text-xs font-semibold text-[#5a7a9f] uppercase tracking-wide mb-2">Token</p>
            <div className="flex gap-2">
              {(["USDT", "USDC", "EURC"] as TokenName[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTokenChange(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    selectedToken === t
                      ? "bg-[#1a56a0] text-white border-[#1a56a0]"
                      : "bg-white text-[#5a7a9f] border-[#c9d9ee] hover:border-[#1a56a0] hover:text-[#1a56a0]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#5a7a9f] mt-1.5">{TOKEN_LABELS[selectedToken]}</p>
          </div>

          {/* Wallet */}
          {!account ? (
            <button
              onClick={connectWallet}
              className="w-full bg-[#1a56a0] hover:bg-[#154491] text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="bg-[#eef4fb] border border-[#c9d9ee] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[#5a7a9f] font-medium">Connected</p>
                <p className="text-[#0d2948] text-xs font-mono truncate">{account}</p>
              </div>
              <button onClick={disconnectWallet} className="shrink-0 text-xs text-[#1a56a0] hover:underline font-medium">
                Disconnect
              </button>
            </div>
          )}

          {account && (
            <>
              {/* Balance */}
              <div className="bg-[#eef4fb] border border-[#c9d9ee] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-[#5a7a9f] font-medium">Available balance</span>
                <span className="text-[#0d2948] text-sm font-bold">{tokenBalance ?? "—"} {selectedToken}</span>
              </div>

              {/* QR Scanner */}
              <div>
                <p className="text-xs font-semibold text-[#5a7a9f] uppercase tracking-wide mb-2">Recipient</p>

                {!scanning && !recipientAddress && (
                  <button
                    onClick={startScanner}
                    className="w-full border-2 border-dashed border-[#c9d9ee] hover:border-[#1a56a0] rounded-xl py-5 text-sm text-[#5a7a9f] hover:text-[#1a56a0] font-medium transition-all"
                  >
                    Scan QR Code
                  </button>
                )}

                {scanning && (
                  <div className="space-y-2">
                    <div id="qr-reader" className="w-full rounded-xl overflow-hidden" />
                    <button onClick={stopScanner} className="w-full text-xs text-[#1a56a0] hover:underline py-1">
                      Cancel
                    </button>
                  </div>
                )}

                {recipientAddress && !scanning && (
                  <div className="bg-[#eef4fb] border border-[#c9d9ee] rounded-xl px-4 py-3 space-y-1">
                    <p className="text-xs text-[#5a7a9f] font-medium">Sending to</p>
                    <p className="text-[#0d2948] text-xs font-mono break-all">{recipientAddress}</p>
                    <button
                      onClick={() => { setRecipientAddress(null); setQrPayload(null); }}
                      className="text-xs text-[#1a56a0] hover:underline"
                    >
                      Scan again
                    </button>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-[#5a7a9f] uppercase tracking-wide block mb-2">
                  You send <span className="normal-case font-normal">(max 500)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    max={500}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAmount(val > 500 ? "500" : e.target.value);
                    }}
                    className="w-full border border-[#c9d9ee] rounded-xl px-4 py-3 pr-16 text-[#0d2948] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56a0] bg-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1a56a0]">
                    {selectedToken}
                  </span>
                </div>
              </div>

              {/* Send button */}
              <button
                onClick={sendToken}
                disabled={sending || !recipientAddress}
                className="w-full bg-[#1a56a0] hover:bg-[#154491] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
              >
                {sending ? "Sending…" : `Send ${selectedToken}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
