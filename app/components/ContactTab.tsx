"use client";

import { useState } from "react";

const SUPPORT_EMAIL = "support@fiatbox.com";

export default function ContactTab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Tab button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 bg-[#1a56a0] hover:bg-[#154491] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all"
      >
        Contact Us
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-5 pointer-events-none"
        >
          <div className="pointer-events-auto bg-white border border-[#c9d9ee] rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
            {/* Header */}
            <div className="bg-[#1a56a0] px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white text-sm font-bold">Contact Support</h2>
                <p className="text-[#a8c8f0] text-xs mt-0.5">We're here to help</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[#a8c8f0] hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-5 space-y-3">
              <p className="text-xs text-[#5a7a9f]">
                Have a question or need help? Send us an email and we'll get back to you as soon as possible.
              </p>

              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-3 bg-[#eef4fb] border border-[#c9d9ee] rounded-xl px-4 py-3 hover:border-[#1a56a0] transition-all group"
              >
                <span className="text-[#1a56a0] text-lg">✉</span>
                <span className="text-[#0d2948] text-sm font-semibold group-hover:underline">
                  {SUPPORT_EMAIL}
                </span>
              </a>

              <p className="text-xs text-[#5a7a9f]">
                We aim to respond within 24 hours on business days.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
