"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import GoogleButton from "@/components/GoogleButton";

function LoginForm() {
  const [actionError, action, pending] = useActionState(login, null);
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const message = searchParams.get("message");
  const error = actionError ?? urlError;
  const intent = searchParams.get("intent");
  const code   = searchParams.get("code");
  const setupQuery = (() => {
    const p = new URLSearchParams();
    if (intent) p.set("intent", intent);
    if (code)   p.set("code", code);
    return p.toString();
  })();
  const signupHref = setupQuery ? `/auth/signup?${setupQuery}` : "/auth/signup";

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0B1E0D" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
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
          <h1
            className="font-black text-xl tracking-tight mb-1"
            style={{ color: "#F0EDE6" }}
          >
            Sign in
          </h1>
          <p className="text-sm mb-6" style={{ color: "#7A9B84" }}>
            Welcome back.
          </p>

          {message && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: "rgba(215,255,90,0.08)",
                border: "1px solid rgba(215,255,90,0.2)",
                color: "#D7FF5A",
              }}
            >
              {message}
            </div>
          )}

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#F87171",
              }}
            >
              {error}
            </div>
          )}

          <form action={action} className="space-y-4">
            {setupQuery && <input type="hidden" name="setupQuery" value={setupQuery} />}
            <AuthField label="Email">
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </AuthField>
            <AuthField label="Password">
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </AuthField>
            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-xs font-semibold hover:opacity-80"
                style={{ color: "#4A6B50" }}
              >
                Forgot password?
              </Link>
            </div>
            <AuthButton pending={pending}>Sign in →</AuthButton>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: "#2C4832" }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4A6B50" }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#2C4832" }} />
          </div>

          <GoogleButton label="Sign in with Google" />
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "#4A6B50" }}>
          No account?{" "}
          <Link
            href={signupHref}
            className="font-semibold"
            style={{ color: "#D7FF5A" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function AuthField({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "#4A6B50" }}
      >
        {label}
      </label>
      <style>{`
        .auth-input {
          width: 100%; background: #0F2411; border: 1px solid #2C4832;
          border-radius: 12px; padding: 12px 16px; font-size: 16px;
          color: #F0EDE6; outline: none; transition: border-color 0.15s;
          font-family: inherit;
        }
        .auth-input::placeholder { color: #4A6B50; }
        .auth-input:focus { border-color: #D7FF5A; }
      `}</style>
      <children.type {...children.props} className="auth-input" />
    </div>
  );
}

function AuthButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
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
      {pending ? "Signing in…" : children}
    </button>
  );
}
