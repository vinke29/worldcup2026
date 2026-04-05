"use client";

import { useState, useMemo } from "react";
import { MATCHES } from "@/lib/mock-data";
import { computeGroupTables } from "@/lib/group-standings";

interface QualifiersViewProps {
  scorePicks: Record<string, { home: number; away: number }>;
  mono: boolean;
}

// WC2026 R32 bracket structure
// 12 groups × top 2 = 24 guaranteed qualifiers
// 8 best 3rd-place teams fill the remaining 8 slots (shown as TBD)
type GroupSlot = { kind: "group"; group: string; pos: 1 | 2 };
type ThirdSlot = { kind: "third"; label: string };
type BracketSlot = GroupSlot | ThirdSlot;

interface R32Match {
  id: string;
  home: BracketSlot;
  away: BracketSlot;
}

interface Section {
  label: string;
  matches: R32Match[];
}

const SECTIONS: Section[] = [
  {
    label: "Section 1 · Groups A – D",
    matches: [
      { id: "r32-1", home: { kind: "group", group: "A", pos: 1 }, away: { kind: "group", group: "B", pos: 2 } },
      { id: "r32-2", home: { kind: "group", group: "C", pos: 1 }, away: { kind: "group", group: "D", pos: 2 } },
      { id: "r32-3", home: { kind: "group", group: "B", pos: 1 }, away: { kind: "group", group: "A", pos: 2 } },
      { id: "r32-4", home: { kind: "group", group: "D", pos: 1 }, away: { kind: "group", group: "C", pos: 2 } },
    ],
  },
  {
    label: "Section 2 · Groups E – H",
    matches: [
      { id: "r32-5", home: { kind: "group", group: "E", pos: 1 }, away: { kind: "group", group: "F", pos: 2 } },
      { id: "r32-6", home: { kind: "group", group: "G", pos: 1 }, away: { kind: "group", group: "H", pos: 2 } },
      { id: "r32-7", home: { kind: "group", group: "F", pos: 1 }, away: { kind: "group", group: "E", pos: 2 } },
      { id: "r32-8", home: { kind: "group", group: "H", pos: 1 }, away: { kind: "group", group: "G", pos: 2 } },
    ],
  },
  {
    label: "Section 3 · Groups I – L",
    matches: [
      { id: "r32-9",  home: { kind: "group", group: "I", pos: 1 }, away: { kind: "group", group: "J", pos: 2 } },
      { id: "r32-10", home: { kind: "group", group: "K", pos: 1 }, away: { kind: "group", group: "L", pos: 2 } },
      { id: "r32-11", home: { kind: "group", group: "J", pos: 1 }, away: { kind: "group", group: "I", pos: 2 } },
      { id: "r32-12", home: { kind: "group", group: "L", pos: 1 }, away: { kind: "group", group: "K", pos: 2 } },
    ],
  },
  {
    label: "3rd Place · Best 8 of 12",
    matches: [
      { id: "r32-13", home: { kind: "third", label: "3rd A/B" }, away: { kind: "third", label: "3rd C/D" } },
      { id: "r32-14", home: { kind: "third", label: "3rd E/F" }, away: { kind: "third", label: "3rd G/H" } },
      { id: "r32-15", home: { kind: "third", label: "3rd I/J" }, away: { kind: "third", label: "3rd K/L" } },
      { id: "r32-16", home: { kind: "third", label: "3rd (best remaining)" }, away: { kind: "third", label: "3rd (best remaining)" } },
    ],
  },
];

type TeamInfo = { team: string; flag: string; pts: number } | null;

function resolveSlot(
  slot: BracketSlot,
  tables: Record<string, ReturnType<typeof computeGroupTables>[string]>,
): TeamInfo {
  if (slot.kind === "third") return null;
  const rows = tables[`Group ${slot.group}`] ?? [];
  const row = rows[slot.pos - 1];
  return row ? { team: row.team, flag: row.flag, pts: row.pts } : null;
}

export default function QualifiersView({ scorePicks, mono }: QualifiersViewProps) {
  const [view, setView] = useState<"predicted" | "actual">("predicted");

  const t = mono
    ? { card: "#EDE8DE", border: "#DDD9D0", text: "#1A1208", textSec: "#6B5E4E", textMuted: "#A89E8E", accent: "#1A1208", accentText: "#F7F4EE", sectionBg: "#E5E0D6", vs: "#A89E8E" }
    : { card: "#1A2E1F", border: "#2C4832", text: "#F0EDE6", textSec: "#B3C9B7", textMuted: "#7A9B84", accent: "#D7FF5A", accentText: "#0B1E0D", sectionBg: "#0F2411", vs: "#2C4832" };

  const hasActual = useMemo(() => MATCHES.some(m => m.homeScore !== null), []);

  const predictedTables = useMemo(() => computeGroupTables(MATCHES, scorePicks, false), [scorePicks]);
  const actualTables    = useMemo(() => computeGroupTables(MATCHES, scorePicks, true), []);

  const tables = view === "predicted" ? predictedTables : actualTables;

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center gap-3 mb-5">
        {(["predicted", "actual"] as const).map((v) => {
          const active = view === v;
          const disabled = v === "actual" && !hasActual;
          return (
            <button
              key={v}
              onClick={() => !disabled && setView(v)}
              disabled={disabled}
              className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: active ? t.accent : "transparent",
                color: active ? t.accentText : disabled ? t.textMuted : t.textSec,
                border: `1px solid ${active ? t.accent : t.border}`,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {v === "predicted" ? "My Picks" : "Actual"}
            </button>
          );
        })}
        {!hasActual && (
          <span className="text-[11px]" style={{ color: t.textMuted }}>
            Actual unlocks once results are in
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>
              {section.label}
            </p>
            <div className="space-y-2">
              {section.matches.map((match) => {
                const home = resolveSlot(match.home, tables);
                const away = resolveSlot(match.away, tables);
                return (
                  <MatchupCard
                    key={match.id}
                    matchId={match.id}
                    homeSlot={match.home}
                    awaySlot={match.away}
                    home={home}
                    away={away}
                    mono={mono}
                    t={t}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] mt-6" style={{ color: t.textMuted }}>
        3rd place slots: 8 of 12 third-place teams advance based on points, GD, and GF. Exact pairings confirmed after group stage.
      </p>
    </div>
  );
}

function MatchupCard({
  matchId, homeSlot, awaySlot, home, away, mono, t,
}: {
  matchId: string;
  homeSlot: BracketSlot;
  awaySlot: BracketSlot;
  home: TeamInfo;
  away: TeamInfo;
  mono: boolean;
  t: Record<string, string>;
}) {
  const slotLabel = (slot: BracketSlot) =>
    slot.kind === "group" ? `${slot.group}${slot.pos}` : slot.label;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: t.card, borderColor: t.border }}
    >
      <TeamRow
        team={home}
        slotLabel={slotLabel(homeSlot)}
        isTbd={homeSlot.kind === "third"}
        mono={mono}
        t={t}
      />
      <div style={{ height: 1, backgroundColor: t.border }} />
      <TeamRow
        team={away}
        slotLabel={slotLabel(awaySlot)}
        isTbd={awaySlot.kind === "third"}
        mono={mono}
        t={t}
      />
    </div>
  );
}

function TeamRow({
  team, slotLabel, isTbd, mono, t,
}: {
  team: TeamInfo;
  slotLabel: string;
  isTbd: boolean;
  mono: boolean;
  t: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {/* Slot label */}
      <span
        className="text-[9px] font-black uppercase tracking-wider w-10 flex-shrink-0"
        style={{ color: t.textMuted }}
      >
        {slotLabel}
      </span>

      {isTbd || !team ? (
        <span className="text-xs italic" style={{ color: t.textMuted }}>TBD</span>
      ) : (
        <>
          <span className="text-sm leading-none flex-shrink-0">{team.flag}</span>
          <span className="text-sm font-semibold flex-1 truncate" style={{ color: t.text }}>
            {team.team}
          </span>
          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: t.textMuted }}>
            {team.pts}p
          </span>
        </>
      )}
    </div>
  );
}
