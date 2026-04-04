"use client";

import { useState, useMemo } from "react";
import { MATCHES } from "@/lib/mock-data";
import { computeGroupTables, countCorrectPositions, hasAnyActualResults, type TeamRow } from "@/lib/group-standings";

interface GroupsViewProps {
  scorePicks: Record<string, { home: number; away: number }>;
  mono: boolean;
}

const GROUP_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export default function GroupsView({ scorePicks, mono }: GroupsViewProps) {
  const [view, setView] = useState<"predicted" | "actual">("predicted");

  const hasActual = useMemo(() => hasAnyActualResults(MATCHES), []);

  const predictedTables = useMemo(
    () => computeGroupTables(MATCHES, scorePicks, false),
    [scorePicks],
  );

  const actualTables = useMemo(
    () => computeGroupTables(MATCHES, scorePicks, true),
    [],
  );

  const t = mono
    ? { bg: "#F5F0E8", card: "#EDE8DE", border: "#DDD9D0", text: "#1A1208", textSec: "#6B5E4E", textMuted: "#A89E8E", accent: "#1A1208", accentText: "#F7F4EE", qualify: "rgba(26,18,8,0.08)", qualifyBorder: "#C8C0B0" }
    : { bg: "#0B1E0D", card: "#1A2E1F", border: "#2C4832", text: "#F0EDE6", textSec: "#B3C9B7", textMuted: "#7A9B84", accent: "#D7FF5A", accentText: "#0B1E0D", qualify: "rgba(215,255,90,0.07)", qualifyBorder: "rgba(215,255,90,0.25)" };

  const activeTables = view === "predicted" ? predictedTables : actualTables;

  return (
    <div>
      {/* View toggle */}
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
        {view === "actual" && !hasActual && (
          <span className="text-[11px]" style={{ color: t.textMuted }}>No results yet</span>
        )}
      </div>

      {/* Groups grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GROUP_LETTERS.map((letter) => {
          const groupKey = `Group ${letter}`;
          const rows = activeTables[groupKey];
          if (!rows) return null;

          const predicted = predictedTables[groupKey] ?? [];
          const actual = actualTables[groupKey] ?? [];
          const correct = hasActual ? countCorrectPositions(predicted, actual) : null;

          return (
            <GroupCard
              key={groupKey}
              letter={letter}
              rows={rows}
              correct={correct}
              hasActual={hasActual}
              view={view}
              mono={mono}
              t={t}
            />
          );
        })}
      </div>
    </div>
  );
}

function GroupCard({
  letter, rows, correct, hasActual, view, mono, t,
}: {
  letter: string;
  rows: TeamRow[];
  correct: number | null;
  hasActual: boolean;
  view: "predicted" | "actual";
  mono: boolean;
  t: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ backgroundColor: t.card, borderColor: t.border }}
    >
      {/* Group header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: t.border }}
      >
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
          Group {letter}
        </span>
        <div className="flex items-center gap-2">
          {correct !== null && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: correct === 4 ? (mono ? "rgba(26,18,8,0.12)" : "rgba(215,255,90,0.12)") : "transparent",
                color: correct === 4 ? t.accent : correct >= 2 ? t.textSec : t.textMuted,
                border: `1px solid ${correct >= 2 ? t.border : "transparent"}`,
              }}
            >
              {correct}/4 correct
            </span>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] font-bold transition-opacity hover:opacity-60 cursor-pointer"
            style={{ color: t.textMuted }}
          >
            {expanded ? "Less" : "More"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 py-3 space-y-1">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-4" />
          <span className="flex-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>Team</span>
          {expanded && (
            <>
              <span className="w-5 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>W</span>
              <span className="w-5 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>D</span>
              <span className="w-5 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>L</span>
            </>
          )}
          <span className="w-7 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>GD</span>
          <span className="w-7 text-right text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>Pts</span>
        </div>

        {rows.map((row, i) => {
          const qualifies = i < 2;
          return (
            <div
              key={row.team}
              className="flex items-center gap-2 rounded-xl px-2 py-2"
              style={{
                backgroundColor: qualifies ? t.qualify : "transparent",
                border: qualifies ? `1px solid ${t.qualifyBorder}` : "1px solid transparent",
              }}
            >
              {/* Position */}
              <span
                className="w-4 text-center text-xs font-black"
                style={{ color: qualifies ? t.accent : t.textMuted }}
              >
                {i + 1}
              </span>

              {/* Flag + name */}
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <span className="text-sm leading-none">{row.flag}</span>
                <span className="text-xs font-semibold truncate" style={{ color: t.text }}>
                  {row.team}
                </span>
              </div>

              {/* Expanded stats */}
              {expanded && (
                <>
                  <span className="w-5 text-center text-xs tabular-nums" style={{ color: t.textSec }}>{row.w}</span>
                  <span className="w-5 text-center text-xs tabular-nums" style={{ color: t.textSec }}>{row.d}</span>
                  <span className="w-5 text-center text-xs tabular-nums" style={{ color: t.textSec }}>{row.l}</span>
                </>
              )}

              {/* GD */}
              <span
                className="w-7 text-center text-xs tabular-nums font-medium"
                style={{ color: row.gd > 0 ? (mono ? "#1A1208" : "#4ADE80") : row.gd < 0 ? "#F87171" : t.textMuted }}
              >
                {row.gd > 0 ? `+${row.gd}` : row.gd}
              </span>

              {/* Pts */}
              <span className="w-7 text-right text-xs font-black tabular-nums" style={{ color: t.text }}>
                {row.pts}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
