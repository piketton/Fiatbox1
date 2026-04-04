"use client";

import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", textAlign: "center" }}>
      <h1>FIATBOX 🚀</h1>
      

      <div style={{ marginTop: 30 }}>
        <button
          onClick={() => router.push("/fiat-in")}
          style={{
            padding: "15px 30px",
            margin: "10px",
            fontSize: "18px",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          💳 Fiat In
        </button>

        <button
          onClick={() => router.push("/fiat-out")}
          style={{
            padding: "15px 30px",
            margin: "10px",
            fontSize: "18px",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          💸 Fiat Out
        </button>
      </div>
    </div>
  );
}
