"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";

type TokenName = "USDT" | "USDC" | "EURC";
type FiatCcy   = "USD" | "GBP" | "EUR" | "CHF";

const TOKEN_LABELS: Record<TokenName, string> = {
  USDT: "USDT — Tether",
  USDC: "USDC — USD Coin",
  EURC: "EURC — Euro Coin",
};

const generateId = () =>
  `FBOX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export default function FiatInPage() {
  const [provider, setProvider]         = useState<ethers.BrowserProvider | null>(null);
  const [account, setAccount]           = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenName>("USDT");
  const [fiatCcy, setFiatCcy]           = useState<FiatCcy>("GBP");
  const [fxRate, setFxRate]             = useState<number | null>(null);
  const [fxLoading, setFxLoading]       = useState(false);
  const [fxError, setFxError]           = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [txId]                          = useState<string>(generateId);

  // Two separate inputs — user types in either one
  const [tokenInput, setTokenInput]     = useState("");   // USDT/USDC/EURC
  const [fiatInput, setFiatInput]       = useState("");   // GBP/EUR/CHF/USD

  // When user types token amount → compute fiat
  const handleTokenChange = (val: string) => {
    setTokenInput(val);
    if (val && fxRate) {
      setFiatInput((parseFloat(val) * fxRate).toFixed(2));
    } else {
      setFiatInput("");
    }
  };

  // When user types fiat amount → compute token
  const handleFiatChange = (val: string) => {
    setFiatInput(val);
    if (val && fxRate) {
      setTokenInput((parseFloat(val) / fxRate).toFixed(4));
    } else {
      setTokenInput("");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      setProvider(new ethers.BrowserProvider((window as any).ethereum));
    }
  }, []);

  // Each token's underlying fiat currency (base for FX lookup)
  const tokenBase: Record<TokenName, string> = { USDT: "USD", USDC: "USD", EURC: "EUR" };

  // Fetch FX rate whenever fiat currency or token changes
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FX_API_KEY;
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      setFxError("FX API key not configured");
      return;
    }
    const base = tokenBase[selectedToken];
    // If token base matches fiat currency (e.g. EURC + EUR) rate is 1:1
    if (base === fiatCcy) {
      setFxRate(1);
      if (tokenInput) setFiatInput(tokenInput);
      return;
    }
    setFxLoading(true);
    setFxError("");
    fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.result !== "success") throw new Error("FX API error");
        const rate = data.conversion_rates[fiatCcy];
        setFxRate(rate);
        // Recalculate fiat side if token already entered
        if (tokenInput) setFiatInput((parseFloat(tokenInput) * rate).toFixed(2));
      })
      .catch(() => setFxError("Could not load FX rate"))
      .finally(() => setFxLoading(false));
  }, [fiatCcy, selectedToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectWallet = async () => {
    if (!provider) return;
    const accs = await provider.send("eth_requestAccounts", []);
    setAccount(accs[0]);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setTokenInput("");
    setFiatInput("");
  };

  const qrData = account
    ? JSON.stringify({
        id: txId,
        address: account,
        token: selectedToken,
        amount: tokenInput || "0",
        fiat_amount: fiatInput || null,
        fiat_currency: fiatCcy,
        fx_rate: fxRate,
        network: "polygon",
      })
    : "";

  const submitFiatIn = () => {
    if (!account) { alert("Please connect your wallet first"); return; }
    if (!tokenInput || Number(tokenInput) <= 0) { alert("Enter a valid amount"); return; }
    if (Number(tokenInput) > 500) { alert("Maximum amount is 500"); return; }

    setSubmitting(true);
    fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "fiat_in",
        from: account,
        network: "polygon",
        token: selectedToken,
        amount: tokenInput,
        fiat_amount: fiatInput || null,
        fiat_currency: fiatCcy,
        fx_rate: fxRate,
        reference: txId,
      }),
    }).catch(() => {});
    alert("Request submitted. Show your QR code to the sender.");
    setTokenInput("");
    setFiatInput("");
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
              {/* Amount inputs */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#5a7a9f] uppercase tracking-wide block">
                  Amount <span className="normal-case font-normal">(max 500)</span>
                </label>

                {/* Token input */}
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={tokenInput}
                    min={0}
                    max={500}
                    onChange={(e) => handleTokenChange(e.target.value)}
                    className="w-full border border-[#c9d9ee] rounded-xl px-4 py-3 pr-20 text-[#0d2948] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56a0] bg-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1a56a0]">
                    {selectedToken}
                  </span>
                </div>

                {/* FX rate line */}
                <p className="text-xs text-[#5a7a9f] min-h-[1rem]">
                  {fxLoading && "Loading rate…"}
                  {fxError && <span className="text-red-500">{fxError}</span>}
                  {fxRate && !fxLoading && !fxError && (
                    <>1 {selectedToken} ≈ {fxRate.toFixed(4)} {fiatCcy}</>
                  )}
                </p>

                {/* Fiat input + currency selector */}
                <div className="flex gap-2">
                  <select
                    value={fiatCcy}
                    onChange={(e) => setFiatCcy(e.target.value as FiatCcy)}
                    className="border border-[#c9d9ee] rounded-xl px-3 py-3 text-[#0d2948] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56a0] bg-white"
                  >
                    {(["USD", "GBP", "EUR", "CHF"] as FiatCcy[]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={fiatInput}
                      min={0}
                      onChange={(e) => handleFiatChange(e.target.value)}
                      className="w-full border border-[#c9d9ee] rounded-xl px-4 py-3 pr-16 text-[#0d2948] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56a0] bg-white"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1a56a0]">
                      {fiatCcy}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-3 py-2">
                <p className="text-xs font-semibold text-[#5a7a9f] uppercase tracking-wide self-start">
                  Your QR Code
                </p>
                <div className="border-2 border-[#c9d9ee] rounded-xl p-4 bg-white">
                  <QRCodeSVG value={qrData || " "} size={180} />
                </div>
                <p className="text-xs text-[#5a7a9f] text-center">
                  Show this to the sender — it contains your wallet, token, amount and FX rate
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
