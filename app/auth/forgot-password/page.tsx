"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, null);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0B1E0D" }}
    >
      <div className="w-full max-w-sm">
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
          className="rounded-2xl border p-6"
          style={{ backgroundColor: "#1A2E1F", borderColor: "#2C4832" }}
        >
          {state?.ok ? (
            <div className="text-center py-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: "rgba(215,255,90,0.1)", border: "1px solid rgba(215,255,90,0.2)" }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 5l7 7 7-7M3 5v10a1 1 0 001 1h12a1 1 0 001-1V5" stroke="#D7FF5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="font-black text-xl tracking-tight mb-2" style={{ color: "#F0EDE6" }}>
                Check your email
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "#7A9B84" }}>
                If an account exists for that email, we sent a password reset link.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-black text-xl tracking-tight mb-1" style={{ color: "#F0EDE6" }}>
                Forgot password?
              </h1>
              <p className="text-sm mb-6" style={{ color: "#7A9B84" }}>
                Enter your email and we'll send you a reset link.
              </p>

              <form action={action} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4A6B50" }}>
                    Email
                  </label>
                  <style>{`
                    .auth-input {
                      width: 100%; background: #0F2411; border: 1px solid #2C4832;
                      border-radius: 12px; padding: 12px 16px; font-size: 14px;
                      color: #F0EDE6; outline: none; transition: border-color 0.15s;
                      font-family: inherit;
                    }
                    .auth-input::placeholder { color: #4A6B50; }
                    .auth-input:focus { border-color: #D7FF5A; }
                  `}</style>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="auth-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full mt-2 font-black text-sm uppercase tracking-widest rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    backgroundColor: "#D7FF5A",
                    color: "#0B1E0D",
                    padding: "13px 24px",
                    border: "none",
                    fontFamily: "inherit",
                    opacity: pending ? 0.6 : 1,
                    cursor: pending ? "default" : "pointer",
                  }}
                >
                  {pending ? "Sending…" : "Send reset link →"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "#4A6B50" }}>
          <Link href="/auth/login" className="font-semibold hover:opacity-80" style={{ color: "#4A6B50" }}>
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
