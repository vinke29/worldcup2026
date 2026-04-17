"use client";

import Link from "next/link";
import { useState } from "react";

interface HeaderProps {
  leagueName?: string;
  leagueCode?: string;
  mono?: boolean;
  onToggleMono?: () => void;
  onLogout?: () => void;
  showLeagueSwitcher?: boolean;
}

export default function Header({ leagueName, leagueCode, mono = false, onToggleMono, onLogout, showLeagueSwitcher = false }: HeaderProps) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (!leagueCode) return;
    const url = `${window.location.origin}/auth/setup?intent=join&code=${leagueCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <header
      className="sticky top-0 z-50 border-b overflow-hidden"
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
          {/* League switcher */}
          {showLeagueSwitcher && (
            <Link
              href="/"
              className="text-[10px] font-bold uppercase tracking-widest transition-opacity hover:opacity-60"
              style={{ color: mono ? "#A09080" : "#4A6B50" }}
            >
              ← My Leagues
            </Link>
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

          {/* Style toggle */}
          {onToggleMono && (
            <button
              onClick={onToggleMono}
              className="flex items-center justify-center rounded-lg w-8 h-8 border cursor-pointer transition-all duration-200"
              style={{
                borderColor: mono ? "#C8C0B0" : "#2C4832",
                backgroundColor: mono ? "rgba(26,18,8,0.08)" : "transparent",
              }}
            >
              {mono ? (
                /* Sun — click to go back to dark/green */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#1A1208" }}>
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                /* Moon — click to go to light/mono */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#7A9B84" }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          )}

          {/* New / join league */}
          {onLogout && (
            <Link
              href="/auth/setup"
              className="text-[10px] font-bold uppercase tracking-widest transition-opacity hover:opacity-60"
              style={{ color: mono ? "#A09080" : "#4A6B50" }}
            >
              + League
            </Link>
          )}

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-[10px] font-bold uppercase tracking-widest transition-opacity hover:opacity-60 cursor-pointer"
              style={{ color: mono ? "#A09080" : "#4A6B50" }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
