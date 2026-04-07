"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { createLeague, joinLeague } from "@/app/actions/league";

function SetupForm() {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const prefillCode = searchParams.get("code") ?? "";
  const prefillLeagueName = searchParams.get("leagueName") ?? "";
  const prefillMode = searchParams.get("mode") ?? "phase_by_phase";
  const [tab, setTab] = useState<"create" | "join">(intent === "join" ? "join" : "create");
  const [createError, createAction, createPending] = useActionState(createLeague, null);
  const [joinError, joinAction, joinPending] = useActionState(joinLeague, null);

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
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: "#1A2E1F", borderColor: "#2C4832" }}
        >
          {/* Tab switcher */}
          <div className="flex border-b" style={{ borderColor: "#2C4832" }}>
            {(["create", "join"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className="flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer border-b-2"
                style={{
                  color: tab === v ? "#D7FF5A" : "#7A9B84",
                  borderBottomColor: tab === v ? "#D7FF5A" : "transparent",
                  backgroundColor: "transparent",
                  fontFamily: "inherit",
                }}
              >
                {v === "create" ? "New league" : "Join league"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "create" ? (
              <>
                <p className="text-sm mb-5" style={{ color: "#7A9B84" }}>
                  Name your league and get a shareable code.
                </p>
                {createError && (
                  <div
                    className="mb-4 px-4 py-3 rounded-xl text-sm"
                    style={{
                      backgroundColor: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.25)",
                      color: "#F87171",
                    }}
                  >
                    {createError}
                  </div>
                )}
                <form action={createAction} className="space-y-4">
                  <input type="hidden" name="mode" value={prefillMode} />
                  <SetupField label="League name">
                    <input
                      type="text"
                      name="leagueName"
                      placeholder="La Banda del Martes"
                      required
                      defaultValue={prefillLeagueName}
                    />
                  </SetupField>
                  <SetupButton pending={createPending}>
                    Create league →
                  </SetupButton>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm mb-5" style={{ color: "#7A9B84" }}>
                  Enter the invite code a friend gave you.
                </p>
                {joinError && (
                  <div
                    className="mb-4 px-4 py-3 rounded-xl text-sm"
                    style={{
                      backgroundColor: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.25)",
                      color: "#F87171",
                    }}
                  >
                    {joinError}
                  </div>
                )}
                <form action={joinAction} className="space-y-4">
                  <SetupField label="Invite code" accent>
                    <input
                      type="text"
                      name="code"
                      placeholder="BANDA26"
                      required
                      maxLength={10}
                      defaultValue={prefillCode}
                      style={{ fontFamily: "monospace", letterSpacing: "0.15em" }}
                    />
                  </SetupField>
                  <SetupButton pending={joinPending}>
                    Join league →
                  </SetupButton>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function SetupField({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
  accent?: boolean;
}) {
  const focusColor = accent ? "#D7FF5A" : "#D7FF5A";
  return (
    <div className="space-y-1.5">
      <label
        className="block text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "#4A6B50" }}
      >
        {label}
      </label>
      <style>{`
        .setup-input {
          width: 100%; background: #0F2411; border: 1px solid #2C4832;
          border-radius: 12px; padding: 12px 16px; font-size: 14px;
          color: #F0EDE6; outline: none; transition: border-color 0.15s;
          font-family: inherit;
        }
        .setup-input::placeholder { color: #4A6B50; }
        .setup-input:focus { border-color: ${focusColor}; }
      `}</style>
      <children.type {...children.props} className="setup-input" />
    </div>
  );
}

function SetupButton({
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
      {pending ? "Please wait…" : children}
    </button>
  );
}

export default function SetupPage() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  );
}
