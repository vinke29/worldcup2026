"use client";

import { useState, useEffect } from "react";
import type { Member, Match, LeagueMode } from "@/lib/mock-data";
import GroupsView from "@/components/GroupsView";
import QualifiersView from "@/components/QualifiersView";

interface MemberPicksModalProps {
  member: Member;
  matches: Match[];
  actualScores: Record<string, { home: number; away: number }>;
  mono: boolean;
  mode: LeagueMode;
  onClose: () => void;
}

export default function MemberPicksModal({
  member,
  matches,
  actualScores,
  mono,
  mode,
  onClose,
}: MemberPicksModalProps) {
  const [tab, setTab] = useState<"groups" | "bracket">("groups");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const bg     = mono ? "#F5F0E8" : "#0B1E0D";
  const card   = mono ? "#F7F4EE" : "#1A2E1F";
  const border = mono ? "#DDD9D0" : "#2C4832";
  const accent = mono ? "#1A1208" : "#D7FF5A";
  const accentText = mono ? "#F7F4EE" : "#0B1E0D";
  const textPrimary = mono ? "#1A1208" : "#F0EDE6";
  const textSec  = mono ? "#6B5E4E" : "#7A9B84";
  const textMuted = mono ? "#A09080" : "#4A6B50";
  const avatar   = mono ? "#E0DAD0" : "#1F3A24";
  const avatarText = mono ? "#6B5E4E" : "#7A9B84";

  const scorePicks = member.scorePicks ?? {};

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ backgroundColor: bg }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b flex-shrink-0"
        style={{ backgroundColor: card, borderColor: border }}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{ backgroundColor: avatar, color: avatarText }}
        >
          {member.avatar}
        </div>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-base leading-tight truncate" style={{ color: textPrimary }}>
            {member.name}
          </p>
          <p className="text-[11px]" style={{ color: textMuted }}>
            {member.points} pts · {member.picked} picks made
          </p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer transition-opacity hover:opacity-70"
          style={{ backgroundColor: mono ? "#DDD9D0" : "#2C4832", color: textSec }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Tab switcher */}
      <div
        className="flex border-b flex-shrink-0"
        style={{ backgroundColor: card, borderColor: border }}
      >
        {([
          { id: "groups" as const, label: "Groups" },
          { id: "bracket" as const, label: "Bracket" },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer"
            style={{
              color: tab === id ? accent : textSec,
              borderBottomColor: tab === id ? accent : "transparent",
              backgroundColor: "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5">
          {tab === "groups" && (
            <GroupsView
              matches={matches}
              scorePicks={scorePicks}
              mono={mono}
              mode={mode}
            />
          )}
          {tab === "bracket" && (
            <QualifiersView
              matches={matches}
              scorePicks={scorePicks}
              actualScores={actualScores}
              mono={mono}
              mode={mode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
