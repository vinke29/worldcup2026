"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0B1E0D" }}
    >
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="flex items-center gap-2 mb-10 justify-center">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#D7FF5A" }}
          >
            <span className="text-xs font-black" style={{ color: "#0B1E0D" }}>Q</span>
          </div>
          <span className="font-black text-base tracking-tight" style={{ color: "#F0EDE6" }}>
            quiniel<span style={{ color: "#D7FF5A" }}>a</span>
          </span>
        </Link>

        <div
          className="rounded-2xl border p-8"
          style={{ backgroundColor: "#1A2E1F", borderColor: "#2C4832" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "rgba(215,255,90,0.1)", border: "1px solid rgba(215,255,90,0.2)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 5l7 7 7-7M3 5v10a1 1 0 001 1h12a1 1 0 001-1V5" stroke="#D7FF5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1
            className="font-black text-xl tracking-tight mb-2"
            style={{ color: "#F0EDE6" }}
          >
            Check your email
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#7A9B84" }}>
            We sent a confirmation link
            {email && (
              <> to <span className="font-semibold" style={{ color: "#B3C9B7" }}>{email}</span></>
            )}.
            {" "}Click it to activate your account.
          </p>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "#4A6B50" }}>
          Already confirmed?{" "}
          <Link
            href="/auth/login"
            className="font-semibold"
            style={{ color: "#D7FF5A" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
