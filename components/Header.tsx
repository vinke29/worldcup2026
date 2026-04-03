"use client";

import Link from "next/link";
import { useState } from "react";

interface HeaderProps {
  leagueName?: string;
  leagueCode?: string;
  mono?: boolean;
  onToggleMono?: () => void;
}

export default function Header({ leagueName, leagueCode, mono = false, onToggleMono }: HeaderProps) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (!leagueCode) return;
    navigator.clipboard.writeText(leagueCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: mono ? "rgba(245,240,232,0.95)" : "rgba(11,30,13,0.92)",
        borderColor: mono ? "#DDD9D0" : "#2C4832",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: mono ? "#1A1208" : "#D7FF5A" }}
          >
            <span className="text-[10px] font-black" style={{ color: mono ? "#F7F4EE" : "#0B1E0D" }}>Q</span>
          </div>
          <span className="font-black text-base tracking-tight" style={{ color: mono ? "#1A1208" : "#F0EDE6" }}>
            quiniel<span style={{ color: mono ? "#6B5E4E" : "#D7FF5A" }}>a</span>
          </span>
        </Link>

        {/* League name */}
        {leagueName && (
          <span className="hidden sm:block text-sm font-medium truncate" style={{ color: mono ? "#6B5E4E" : "#7A9B84" }}>
            {leagueName}
          </span>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Style toggle */}
          {onToggleMono && (
            <button
              onClick={onToggleMono}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 border cursor-pointer transition-all duration-200"
              style={{
                borderColor: mono ? "#C8C0B0" : "#2C4832",
                backgroundColor: mono ? "rgba(26,18,8,0.08)" : "transparent",
              }}
            >
              <span className="text-sm" style={{ lineHeight: 1 }}>
                {mono ? "🎨" : "◑"}
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: mono ? "#1A1208" : "#7A9B84" }}>
                {mono ? "Color" : "Ink"}
              </span>
            </button>
          )}

          {/* Invite code */}
          {leagueCode && (
            <button
              onClick={copyCode}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 border cursor-pointer transition-all duration-150"
              style={{
                borderColor: copied
                  ? mono ? "#1A1208" : "#D7FF5A"
                  : mono ? "#DDD9D0" : "#2C4832",
                backgroundColor: copied
                  ? mono ? "rgba(26,18,8,0.08)" : "rgba(215,255,90,0.08)"
                  : "transparent",
              }}
            >
              <span className="font-mono text-xs font-bold tracking-widest" style={{ color: mono ? "#1A1208" : "#D7FF5A" }}>
                {leagueCode}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: mono ? "#6B5E4E" : (copied ? "#D7FF5A" : "#7A9B84") }}>
                {copied ? "Copied!" : "Copy"}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
