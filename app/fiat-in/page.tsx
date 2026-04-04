"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";

type TokenName = "USDT" | "USDC" | "EURC";

const TOKEN_LABELS: Record<TokenName, string> = {
  USDT: "USDT — Tether",
  USDC: "USDC — USD Coin",
  EURC: "EURC — Euro Coin",
};

const generateId = () =>
  `FBOX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export default function FiatInPage() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenName>("USDT");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Unique ID per page load — changes every time the page is opened
  const [txId] = useState<string>(generateId);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      setProvider(new ethers.BrowserProvider((window as any).ethereum));
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) return;
    const accs = await provider.send("eth_requestAccounts", []);
    setAccount(accs[0]);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setAmount("");
  };

  // QR payload — unique per session, updates live with token/amount changes
  const qrData = account
    ? JSON.stringify({
        id: txId,
        address: account,
        token: selectedToken,
        amount: amount || "0",
        network: "polygon",
      })
    : "";

  const submitFiatIn = () => {
    if (!account) { alert("Please connect your wallet first"); return; }
    if (!amount || Number(amount) <= 0) { alert("Enter a valid amount"); return; }
    if (Number(amount) > 500) { alert("Maximum amount is 500"); return; }

    setSubmitting(true);
    fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "fiat_in",
        from: account,
        network: "polygon",
        token: selectedToken,
        amount,
        reference: txId,
      }),
    }).catch(() => {});
    alert("Request submitted. Show your QR code to the sender.");
    setAmount("");
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#eef4fb] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm mb-4">
        <a href="/" className="text-[#1a56a0] text-sm font-medium hover:underline">← Back</a>
      </div>

      <div className="bg-white border border-[#c9d9ee] rounded-2xl w-full max-w-sm shadow-sm overflow-hidden">
        <div className="bg-[#1a56a0] px-6 py-5">
          <h1 className="text-white text-xl font-bold">Receive Stablecoin</h1>
          <p className="text-[#a8c8f0] text-sm mt-1">Deposit fiat · Receive stablecoin</p>
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
                  onClick={() => setSelectedToken(t)}
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
              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-[#5a7a9f] uppercase tracking-wide block mb-2">
                  Amount <span className="normal-case font-normal">(max 500)</span>
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

              {/* QR Code */}
              <div className="flex flex-col items-center gap-3 py-2">
                <p className="text-xs font-semibold text-[#5a7a9f] uppercase tracking-wide self-start">
                  Your QR Code
                </p>
                <div className="border-2 border-[#c9d9ee] rounded-xl p-4 bg-white">
                  <QRCodeSVG value={qrData} size={180} />
                </div>
                <p className="text-xs text-[#5a7a9f] text-center">
                  Show this to the sender — it contains your wallet address, token and amount
                </p>
              </div>

              {/* Submit */}
              <button
                onClick={submitFiatIn}
                disabled={submitting}
                className="w-full bg-[#1a56a0] hover:bg-[#154491] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
              >
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
