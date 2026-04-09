"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";

const POLYGON_CHAIN_ID = "0x89";
const SUB_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS as string;
const POL_AMOUNT = "10";

interface SubStatus {
  active: boolean;
  txHash: string;
  paidAt: number;
  expiresAt: number;
  wallet: string;
  name: string;
  nickname: string;
  email: string;
  address: string;
}




type Step = "info" | "form" | "paying" | "done";

export default function SubscribeHeader() {
  const [open, setOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [step, setStep] = useState<Step>("info");
  const [sub, setSub] = useState<SubStatus | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("fiatbox_sub");
    if (stored) setSub(JSON.parse(stored));
  }, []);

  const openModal = () => {
    setFormError("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setStep("info");
    setFormError("");
  };

  const handleFormSubmit = async () => {
    if (!name.trim()) { setFormError("Please enter your name."); return; }
    if (!nickname.trim()) { setFormError("Please choose a nickname."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email."); return;
    }
    if (!address.trim()) { setFormError("Please enter your address."); return; }

    // Check nickname uniqueness
    try {
      const check = await fetch(`/api/subscribe?nickname=${encodeURIComponent(nickname.trim())}`);
      const data = await check.json();
      if (data.taken) { setFormError("This nickname is already taken. Please choose another."); return; }
    } catch {
      // If backend is down, proceed anyway
    }

    setFormError("");
    setStep("paying");
    pay();
  };

  const pay = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("MetaMask not found."); setStep("form"); return;
    }
    const eth = (window as any).ethereum;
    const chainId = await eth.request({ method: "eth_chainId" });
    if (chainId !== POLYGON_CHAIN_ID) {
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: POLYGON_CHAIN_ID }] });
      } catch {
        alert("Please switch to Polygon Network."); setStep("form"); return;
      }
    }

    const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
    const wallet = accounts[0];

    try {
      const value = "0x" + ethers.parseEther(POL_AMOUNT).toString(16);
      const txHash = await eth.request({
        method: "eth_sendTransaction",
        params: [{ from: wallet, to: SUB_ADDRESS, value }],
      });

      const status: SubStatus = {
        active: true,
        txHash,
        paidAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        wallet,
        name: name.trim(),
        nickname: nickname.trim(),
        email: email.trim(),
        address: address.trim(),
      };

      localStorage.setItem("fiatbox_sub", JSON.stringify(status));
      setSub(status);

      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status),
      }).catch(() => {});

      setStep("done");
    } catch (err: any) {
      if (err.code !== 4001) alert("Payment failed. Please try again.");
      setStep("form");
    }
  };

  const isActive = sub?.active ?? false;
  const daysLeft = sub ? Math.max(0, 30 - Math.floor((Date.now() - sub.paidAt) / 86400000)) : 0;
  const expired = isActive && daysLeft === 0;

  return (
    <>
      {/* Header bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-end items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-[#c9d9ee]">
        <button
          onClick={() => setHowOpen(true)}
          className="text-xs font-semibold px-4 py-2 rounded-full border border-[#1a56a0] bg-[#1a56a0] text-white hover:bg-[#154491] transition-all"
        >
          How to use
        </button>
        <button
          onClick={openModal}
          className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
            isActive && !expired
              ? "bg-[#eef4fb] border-[#1a56a0] text-[#1a56a0]"
              : "bg-[#1a56a0] border-[#1a56a0] text-white hover:bg-[#154491]"
          }`}
        >
          {isActive && !expired ? `✓ Subscribed · ${daysLeft}d left` : "Subscribe & Get Rewards"}
        </button>
      </div>

      <div className="h-10" />

      {/* How to use modal */}
      {howOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setHowOpen(false); }}
        >
          <div className="bg-white rounded-2xl border border-[#c9d9ee] w-full max-w-sm shadow-lg overflow-hidden">
            <div className="bg-[#1a56a0] px-6 py-5 flex items-center justify-between">
              <h2 className="text-white text-lg font-bold">How to use</h2>
              <button onClick={() => setHowOpen(false)} className="text-[#a8c8f0] hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-[#F6851B] ml-11">Connect your MetaMask</span>
              </div>
              {[
                { step: "P1", label: "Enter cash ↔ stablecoin terms" },
                { step: "P2", label: "Scan QR and complete the trade" },
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#1a56a0] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {step}
                  </span>
                  <span className="text-sm text-[#0d2948] font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl border border-[#c9d9ee] w-full max-w-sm shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="bg-[#1a56a0] px-6 py-5 flex items-center justify-between sticky top-0">
              <div>
                <h2 className="text-white text-lg font-bold">Join & Get Rewards</h2>
                <p className="text-[#a8c8f0] text-xs mt-0.5">10 POL · Weekly rewards</p>
              </div>
              <button onClick={closeModal} className="text-[#a8c8f0] hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Status badge */}
              <div className={`rounded-xl px-4 py-3 border ${isActive && !expired ? "bg-[#eefaf3] border-[#86efac]" : "bg-[#eef4fb] border-[#c9d9ee]"}`}>
                <p className="text-xs text-[#5a7a9f] font-medium">Status</p>
                <p className={`text-sm font-bold mt-0.5 ${isActive && !expired ? "text-green-700" : "text-[#0d2948]"}`}>
                  {isActive && !expired
                    ? `Active — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`
                    : expired ? "Expired — renew to keep earning"
                    : "Not subscribed"}
                </p>
                {sub && (
                  <p className="text-xs text-[#5a7a9f] mt-1 font-mono">
                    {sub.wallet.slice(0, 6)}…{sub.wallet.slice(-4)}
                    {sub.nickname ? ` · ${sub.nickname}` : ""}
                  </p>
                )}
              </div>

              {/* How it works */}
              <div className="bg-[#eef4fb] border border-[#c9d9ee] rounded-xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-semibold text-[#0d2948]">How it works</p>
                <p className="text-xs text-[#5a7a9f]">1. Fill in your details</p>
                <p className="text-xs text-[#5a7a9f]">2. Pay 10 POL to activate for 30 days</p>
                <p className="text-xs text-[#5a7a9f]">3. Earn weekly rewards (iPhone, laptop, AirPods, physical wallet & more!)</p>
              </div>

              {/* Form */}
              {(step === "info" || step === "form") && (!isActive || expired) && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-[#5a7a9f] uppercase tracking-wide">Your Details</p>

                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-[#c9d9ee] rounded-xl px-4 py-3 text-[#0d2948] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56a0] bg-white"
                  />

                  {/* Nickname — suggestion from list, user can edit, mandatory */}
                  <div>
                    <label className="text-xs text-[#5a7a9f] font-medium block mb-1">
                      Fiatbox nickname <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Choose your nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="flex-1 border border-[#c9d9ee] rounded-xl px-4 py-3 text-[#0d2948] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56a0] bg-white"
                      />
                    </div>
                    <p className="text-xs text-[#5a7a9f] mt-1">This will be your unique Fiatbox identity</p>
                  </div>

                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-[#c9d9ee] rounded-xl px-4 py-3 text-[#0d2948] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56a0] bg-white"
                  />
                  <textarea
                    placeholder="Physical address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full border border-[#c9d9ee] rounded-xl px-4 py-3 text-[#0d2948] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56a0] bg-white resize-none"
                  />

                  {formError && <p className="text-xs text-red-500">{formError}</p>}

                  <button
                    onClick={handleFormSubmit}
                    className="w-full bg-[#1a56a0] hover:bg-[#154491] text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
                  >
                    Continue · Pay 10 POL
                  </button>
                </div>
              )}

              {/* Paying */}
              {step === "paying" && (
                <div className="text-center py-4 space-y-2">
                  <div className="w-8 h-8 border-4 border-[#c9d9ee] border-t-[#1a56a0] rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-[#0d2948] font-medium">Confirm in MetaMask…</p>
                  <p className="text-xs text-[#5a7a9f]">Please approve the 10 POL payment</p>
                </div>
              )}

              {/* Done */}
              {step === "done" && (
                <div className="bg-[#eefaf3] border border-[#86efac] rounded-xl px-4 py-4 text-center space-y-1">
                  <p className="text-green-700 font-bold text-sm">You're subscribed!</p>
                  {sub?.nickname && (
                    <p className="text-xs text-[#5a7a9f]">Your nickname: <span className="font-semibold text-[#0d2948]">{sub.nickname}</span></p>
                  )}
                  <p className="text-xs text-[#5a7a9f]">Rewards will be sent to your wallet weekly.</p>
                </div>
              )}

              {/* Renew */}
              {isActive && !expired && (
                <button
                  onClick={() => { setStep("form"); setName(""); setNickname(""); setEmail(""); setAddress(""); }}
                  className="w-full bg-white hover:bg-[#eef4fb] border border-[#c9d9ee] text-[#1a56a0] font-semibold py-3 rounded-xl transition-all text-sm"
                >
                  Renew Early
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

