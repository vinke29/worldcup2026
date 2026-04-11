"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { Match } from "@/lib/mock-data";
import { computeGroupTables, type TeamRow } from "@/lib/group-standings";
import FlagImage from "@/lib/flag-image";

interface GroupStandingsWidgetProps {
  groupName: string;
  allGroupMatches: Match[];          // all 6 matches for this group across all matchdays
  scorePicks: Record<string, { home: number; away: number }>;
  mono: boolean;
  onAllPicked?: () => void;          // called once when group first becomes fully picked
  nextGroupName?: string;            // label of the next group to scroll to
  onNext?: () => void;               // scroll to the next group
}

export default function GroupStandingsWidget({
  groupName,
  allGroupMatches,
  scorePicks,
  mono,
  onAllPicked,
  nextGroupName,
  onNext,
}: GroupStandingsWidgetProps) {
  const [open, setOpen] = useState(false);
  const prevAllPickedRef = useRef(false);

  // Only show when all 6 matches have score picks
  const allPicked = useMemo(
    () => allGroupMatches.length === 6 && allGroupMatches.every((m) => scorePicks[m.id] !== undefined),
    [allGroupMatches, scorePicks]
  );

  const rows: TeamRow[] | undefined = useMemo(() => {
    if (!allPicked) return undefined;
    const tables = computeGroupTables(allGroupMatches, scorePicks, false);
    return tables[groupName];
  }, [allPicked, allGroupMatches, scorePicks, groupName]);

  // Auto-open and notify parent the first time all picks are made
  useEffect(() => {
    if (allPicked && !prevAllPickedRef.current) {
      setOpen(true);
      onAllPicked?.();
    }
    prevAllPickedRef.current = allPicked;
  }, [allPicked, onAllPicked]);

  if (!allPicked || !rows) return null;

  const t = mono
    ? {
        border: "#DDD9D0",
        borderInner: "#E5E1D8",
        textMuted: "#A89E8E",
        textSec: "#6B5E4E",
        textPrimary: "#1A1208",
        cardBg: "#EDE8E0",
        qualify: "rgba(26,18,8,0.06)",
        qualifyBorder: "#C8C0B0",
        accent: "#1A1208",
        toggleBg: "rgba(26,18,8,0.04)",
      }
    : {
        border: "#2C4832",
        borderInner: "#1F3A24",
        textMuted: "#4A6B50",
        textSec: "#7A9B84",
        textPrimary: "#F0EDE6",
        cardBg: "#0F2411",
        qualify: "rgba(74,222,128,0.07)",
        qualifyBorder: "rgba(74,222,128,0.25)",
        accent: "#4ADE80",
        toggleBg: "rgba(74,222,128,0.05)",
      };

  return (
    <div
      id={`standings-${groupName.replace(" ", "-").toLowerCase()}`}
      className="mt-3 rounded-2xl overflow-hidden border"
      style={{ borderColor: t.border, backgroundColor: t.cardBg }}
    >
      {/* Toggle row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ backgroundColor: t.toggleBg }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: t.accent }}>
            Predicted standings
          </span>
          {!open && (
            <div className="flex items-center gap-0.5">
              {rows.slice(0, 2).map((r) => (
                <span key={r.team} className="text-[9px] font-bold" style={{ color: t.textSec }}>
                  {r.team.split(" ")[0]}
                </span>
              )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} style={{ color: t.textMuted }}>·</span>, el], [])}
              <span className="text-[9px] ml-0.5" style={{ color: t.textMuted }}>advance</span>
            </div>
          )}
        </div>
        <span className="text-[10px] font-bold" style={{ color: t.textSec }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Table */}
      {open && (
        <div className="px-3 pb-3 pt-1">
          {/* Header */}
          <div className="flex items-center gap-1 px-2 mb-1">
            <span className="w-4" />
            <span className="flex-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>Team</span>
            <span className="w-5 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>W</span>
            <span className="w-5 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>D</span>
            <span className="w-5 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>L</span>
            <span className="w-7 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>GD</span>
            <span className="w-7 text-right text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>Pts</span>
          </div>

          <div className="space-y-1">
            {rows.map((row, i) => {
              const qualifies = i < 2;
              return (
                <div
                  key={row.team}
                  className="flex items-center gap-1 rounded-xl px-2 py-2"
                  style={{
                    backgroundColor: qualifies ? t.qualify : "transparent",
                    border: `1px solid ${qualifies ? t.qualifyBorder : "transparent"}`,
                  }}
                >
                  {/* Rank */}
                  <span
                    className="w-4 text-center text-xs font-black"
                    style={{ color: qualifies ? t.accent : t.textMuted }}
                  >
                    {i + 1}
                  </span>

                  {/* Flag + name */}
                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    <FlagImage emoji={row.flag} size={14} team={row.team} />
                    <span
                      className="text-xs font-bold truncate"
                      style={{ color: qualifies ? t.textPrimary : t.textSec }}
                    >
                      {row.team}
                    </span>
                  </div>

                  {/* Stats */}
                  <span className="w-5 text-center text-xs tabular-nums" style={{ color: t.textSec }}>{row.w}</span>
                  <span className="w-5 text-center text-xs tabular-nums" style={{ color: t.textSec }}>{row.d}</span>
                  <span className="w-5 text-center text-xs tabular-nums" style={{ color: t.textSec }}>{row.l}</span>
                  <span
                    className="w-7 text-center text-xs font-bold tabular-nums"
                    style={{ color: row.gd > 0 ? t.accent : row.gd < 0 ? (mono ? "#A08080" : "#F87171") : t.textMuted }}
                  >
                    {row.gd > 0 ? `+${row.gd}` : row.gd}
                  </span>
                  <span
                    className="w-7 text-right text-xs font-black tabular-nums"
                    style={{ color: qualifies ? t.accent : t.textPrimary }}
                  >
                    {row.pts}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="mt-2 px-2 text-[9px]" style={{ color: t.textMuted }}>
            FIFA 2026 rules · H2H before overall GD · Top 2 advance
          </p>

          {/* Next group banner */}
          {nextGroupName && onNext && (
            <button
              onClick={onNext}
              className="mt-3 w-full flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
              style={{
                backgroundColor: mono ? "rgba(26,18,8,0.06)" : "rgba(215,255,90,0.08)",
                border: `1px solid ${mono ? "rgba(26,18,8,0.15)" : "rgba(215,255,90,0.2)"}`,
              }}
            >
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: mono ? "#1A1208" : "#D7FF5A" }}>
                {nextGroupName}
              </span>
              <span className="text-xs font-bold" style={{ color: mono ? "#1A1208" : "#D7FF5A" }}>→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
