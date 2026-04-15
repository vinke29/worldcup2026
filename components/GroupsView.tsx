"use client";

import { useState, useMemo } from "react";
import type { Match, LeagueMode } from "@/lib/mock-data";
import { computeGroupTables, rankThirdPlaceTeams, countCorrectPositions, hasAnyActualResults, type TeamRow } from "@/lib/group-standings";
import FlagImage from "@/lib/flag-image";

interface GroupsViewProps {
  matches: Match[];
  scorePicks: Record<string, { home: number; away: number }>;
  mono: boolean;
  mode?: LeagueMode;
}

const GROUP_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export default function GroupsView({ matches, scorePicks, mono, mode = "phase_by_phase" }: GroupsViewProps) {
  const hasActual = useMemo(() => hasAnyActualResults(matches), [matches]);
  // When actual results exist, default to compare; otherwise show predicted (no toggle)
  const defaultView = hasActual ? "compare" : "predicted";
  const [view, setView] = useState<"predicted" | "actual" | "compare">(defaultView);

  const predictedTables = useMemo(
    () => computeGroupTables(matches, scorePicks, false),
    [matches, scorePicks],
  );

  const actualTables = useMemo(
    () => computeGroupTables(matches, scorePicks, true),
    [matches],
  );

  const t = mono
    ? { bg: "#F5F0E8", card: "#EDE8DE", border: "#DDD9D0", text: "#1A1208", textSec: "#6B5E4E", textMuted: "#A89E8E", accent: "#1A1208", accentText: "#F7F4EE", qualify: "rgba(26,18,8,0.08)", qualifyBorder: "#C8C0B0", qualify3rd: "rgba(26,18,8,0.04)", qualify3rdBorder: "#DDD9D0" }
    : { bg: "#0B1E0D", card: "#1A2E1F", border: "#2C4832", text: "#F0EDE6", textSec: "#B3C9B7", textMuted: "#7A9B84", accent: "#D7FF5A", accentText: "#0B1E0D", qualify: "rgba(215,255,90,0.07)", qualifyBorder: "rgba(215,255,90,0.25)", qualify3rd: "rgba(215,255,90,0.03)", qualify3rdBorder: "rgba(215,255,90,0.12)" };

  const activeTables = view === "actual" ? actualTables : predictedTables;

  // Top 8 third-place qualifiers for predicted and actual standings
  const predictedQ3rds = useMemo(() => new Set(rankThirdPlaceTeams(predictedTables).slice(0, 8).map(e => e.row.team)), [predictedTables]);
  const actualQ3rds    = useMemo(() => new Set(rankThirdPlaceTeams(actualTables).slice(0, 8).map(e => e.row.team)), [actualTables]);

  return (
    <div>

      {/* Groups grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {GROUP_LETTERS.map((letter) => {
          const groupKey = `Group ${letter}`;
          const rows = activeTables[groupKey];
          if (!rows) return null;

          const predicted = predictedTables[groupKey] ?? [];
          const actual = actualTables[groupKey] ?? [];
          const correct = hasActual ? countCorrectPositions(predicted, actual) : null;

          if (view === "compare" && hasActual) {
            return (
              <CompareCard
                key={groupKey}
                letter={letter}
                predicted={predicted}
                actual={actual}
                correct={correct}
                predictedQ3rds={predictedQ3rds}
                actualQ3rds={actualQ3rds}
                mono={mono}
                t={t}
              />
            );
          }

          const activeQ3rds = view === "actual" ? actualQ3rds : predictedQ3rds;
          return (
            <GroupCard
              key={groupKey}
              letter={letter}
              rows={rows}
              correct={correct}
              hasActual={hasActual}
              view={view}
              qualifiedQ3rds={activeQ3rds}
              mono={mono}
              t={t}
            />
          );
        })}
      </div>

      {/* Third-place comparison table — shown when actuals exist */}
      {hasActual && (
        <ThirdPlaceTable
          predictedTables={predictedTables}
          actualTables={actualTables}
          predictedQ3rds={predictedQ3rds}
          actualQ3rds={actualQ3rds}
          mono={mono}
          t={t}
        />
      )}
    </div>
  );
}

// ── Third-place qualifiers table ──────────────────────────────────────────────

function ThirdPlaceTable({
  predictedTables, actualTables, predictedQ3rds, actualQ3rds, mono, t,
}: {
  predictedTables: Record<string, TeamRow[]>;
  actualTables: Record<string, TeamRow[]>;
  predictedQ3rds: Set<string>;
  actualQ3rds: Set<string>;
  mono: boolean;
  t: Record<string, string>;
}) {
  const predRanked = rankThirdPlaceTeams(predictedTables);
  const actualRanked = rankThirdPlaceTeams(actualTables);
  // Only show the table once we have at least some actual 3rd-place data
  if (actualRanked.length === 0) return null;

  const colorGreen  = mono ? "#16A34A" : "#4ADE80";
  const colorYellow = mono ? "#B45309" : "#FCD34D";

  function GdCell({ gd }: { gd: number }) {
    return (
      <span className="text-xs tabular-nums w-8 text-right flex-shrink-0" style={{
        color: gd > 0 ? colorGreen : gd < 0 ? "#F87171" : t.textMuted,
      }}>
        {gd > 0 ? `+${gd}` : gd}
      </span>
    );
  }

  function PtsCell({ pts }: { pts: number }) {
    return (
      <span className="text-xs font-black tabular-nums w-6 text-right flex-shrink-0" style={{ color: t.textMuted }}>
        {pts}p
      </span>
    );
  }

  const rows = Math.max(predRanked.length, actualRanked.length);

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: t.card, borderColor: t.border }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: t.border }}>
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
          3rd Place Qualifiers
        </span>
        <span className="text-[10px] font-bold" style={{ color: t.textSec }}>
          Best 8 of 12 advance
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 gap-0 border-b" style={{ borderColor: t.border }}>
        <div className="flex items-center px-4 py-1.5 gap-1">
          <span className="flex-1 text-[9px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>Predicted</span>
          <span className="text-[9px] font-black uppercase tracking-widest w-8 text-right" style={{ color: t.textMuted }}>GD</span>
          <span className="text-[9px] font-black uppercase tracking-widest w-6 text-right" style={{ color: t.textMuted }}>Pts</span>
        </div>
        <div className="flex items-center px-4 py-1.5 border-l gap-1" style={{ borderColor: t.border }}>
          <span className="flex-1 text-[9px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>Actual</span>
          <span className="text-[9px] font-black uppercase tracking-widest w-8 text-right" style={{ color: t.textMuted }}>GD</span>
          <span className="text-[9px] font-black uppercase tracking-widest w-6 text-right" style={{ color: t.textMuted }}>Pts</span>
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }, (_, i) => {
        const pred   = predRanked[i];
        const actual = actualRanked[i];

        // Divider after rank 8
        const showDivider = i === 8;

        const predQualifies   = i < 8;
        const actualQualifies = i < 8;

        // Colour for predicted row
        const predInActualTop8  = pred   && actualQ3rds.has(pred.row.team);
        const actualInPredTop8  = actual && predictedQ3rds.has(actual.row.team);
        const predExact         = pred && actual && pred.row.team === actual.row.team;
        const predColor = !pred ? t.textMuted
          : predExact        ? colorGreen
          : predInActualTop8 ? colorYellow
          : predQualifies    ? "#F87171"   // predicted to qualify, didn't
          : t.textMuted;

        return (
          <div key={i}>
            {showDivider && (
              <div className="flex items-center gap-2 px-4 py-1" style={{ backgroundColor: t.qualify3rd, borderTop: `1px solid ${t.qualify3rdBorder}`, borderBottom: `1px solid ${t.qualify3rdBorder}` }}>
                <div style={{ flex: 1, height: 1, backgroundColor: t.qualify3rdBorder }} />
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>eliminated</span>
                <div style={{ flex: 1, height: 1, backgroundColor: t.qualify3rdBorder }} />
              </div>
            )}
            <div
              className="grid grid-cols-2 gap-0"
              style={{ borderBottom: i < rows - 1 ? `1px solid ${t.border}` : "none" }}
            >
              {/* Predicted */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ backgroundColor: pred && predQualifies ? t.qualify : "transparent" }}
              >
                <span className="text-xs font-black w-4 text-center flex-shrink-0" style={{ color: predQualifies ? t.accent : t.textMuted }}>{i + 1}</span>
                {pred ? (
                  <>
                    <span className="text-[10px] font-black w-4 text-center flex-shrink-0" style={{ color: t.textMuted }}>{pred.group}</span>
                    <FlagImage emoji={pred.row.flag} size={14} team={pred.row.team} />
                    <span className="text-xs font-semibold truncate flex-1" style={{ color: predColor, textDecoration: predQualifies && !predInActualTop8 && !predExact ? "line-through" : "none", opacity: predQualifies && !predInActualTop8 && !predExact ? 0.55 : 1 }}>
                      {pred.row.team}
                    </span>
                    <GdCell gd={pred.row.gd} />
                    <PtsCell pts={pred.row.pts} />
                  </>
                ) : <span className="text-xs italic flex-1" style={{ color: t.textMuted }}>TBD</span>}
              </div>

              {/* Actual */}
              <div
                className="flex items-center gap-2 px-3 py-2 border-l"
                style={{ backgroundColor: actual && actualQualifies ? t.qualify : "transparent", borderColor: t.border }}
              >
                <span className="text-xs font-black w-4 text-center flex-shrink-0" style={{ color: actualQualifies ? t.accent : t.textMuted }}>{i + 1}</span>
                {actual ? (
                  <>
                    <span className="text-[10px] font-black w-4 text-center flex-shrink-0" style={{ color: t.textMuted }}>{actual.group}</span>
                    <FlagImage emoji={actual.row.flag} size={14} team={actual.row.team} />
                    <span className="text-xs font-semibold truncate flex-1" style={{ color: actualInPredTop8 ? colorGreen : t.text }}>
                      {actual.row.team}
                    </span>
                    {actualInPredTop8 && actualQualifies && <span className="text-[10px] flex-shrink-0" style={{ color: colorGreen }}>✓</span>}
                    <GdCell gd={actual.row.gd} />
                    <PtsCell pts={actual.row.pts} />
                  </>
                ) : <span className="text-xs italic flex-1" style={{ color: t.textMuted }}>TBD</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Compare card: predicted vs actual side by side ────────────────────────────

function CompareCard({
  letter, predicted, actual, correct, predictedQ3rds, actualQ3rds, mono, t,
}: {
  letter: string;
  predicted: TeamRow[];
  actual: TeamRow[];
  correct: number | null;
  predictedQ3rds: Set<string>;
  actualQ3rds: Set<string>;
  mono: boolean;
  t: Record<string, string>;
}) {
  // Build a lookup: team → actual rank
  const actualRankByTeam: Record<string, number> = {};
  actual.forEach((row, i) => { actualRankByTeam[row.team] = i + 1; });

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ backgroundColor: t.card, borderColor: t.border }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: t.border }}>
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
          Group {letter}
        </span>
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
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 gap-0 border-b" style={{ borderColor: t.border }}>
        <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
          Predicted
        </div>
        <div className="flex items-center px-4 py-1.5 border-l gap-1" style={{ borderColor: t.border }}>
          <span className="flex-1 text-[9px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>Actual</span>
          <span className="text-[9px] font-black uppercase tracking-widest w-8 text-right" style={{ color: t.textMuted }}>GD</span>
          <span className="text-[9px] font-black uppercase tracking-widest w-6 text-right" style={{ color: t.textMuted }}>Pts</span>
        </div>
      </div>

      {/* Rows — predicted on left, actual on right */}
      <div>
        {predicted.map((predRow, predIdx) => {
          const actualIdx = actualRankByTeam[predRow.team] != null ? actualRankByTeam[predRow.team] - 1 : -1;
          const actualRow = actual[predIdx]; // team in actual at same rank position
          const predIs3rdQ  = predIdx === 2 && predictedQ3rds.has(predRow.team);
          const actualIs3rdQ = actual[predIdx] && predIdx === 2 && actualQ3rds.has(actual[predIdx].team);
          const predQualifies  = predIdx < 2 || predIs3rdQ;
          const actualQualifies = (actualIdx >= 0 && actualIdx < 2) || (actualIdx === 2 && actualQ3rds.has(predRow.team));
          const correct = actualIdx === predIdx;

          // Colour convention for predicted column:
          //   green  = exact slot match
          //   yellow = team advanced (top 2) but in wrong slot — still earns R32 pts
          //   muted  = predicted to advance but didn't (or vice versa)
          const qualifiedWrongSlot = predQualifies && actualQualifies && !correct;
          const missedQualify = predQualifies && actualIdx >= 0 && !actualQualifies;
          const colorGreen  = mono ? "#16A34A" : "#4ADE80";
          const colorYellow = mono ? "#B45309" : "#FCD34D";
          const predColor = correct ? colorGreen : qualifiedWrongSlot ? colorYellow : t.textMuted;

          return (
            <div
              key={predRow.team}
              className="grid grid-cols-2 gap-0"
              style={{ borderBottom: predIdx < predicted.length - 1 ? `1px solid ${t.border}` : "none" }}
            >
              {/* Predicted position */}
              <div
                className="flex items-center gap-2 px-3 py-2.5"
                style={{ backgroundColor: predIs3rdQ ? t.qualify3rd : predQualifies ? t.qualify : "transparent" }}
              >
                <span className="text-xs font-black w-4 text-center flex-shrink-0" style={{ color: predColor }}>
                  {predIdx + 1}
                </span>
                <FlagImage emoji={predRow.flag} size={14} team={predRow.team} />
                <span
                  className="text-xs font-semibold truncate flex-1"
                  style={{
                    color: predColor,
                    textDecoration: missedQualify ? "line-through" : "none",
                    opacity: missedQualify ? 0.55 : 1,
                  }}
                >
                  {predRow.team}
                </span>
                {correct && <span className="text-[10px] flex-shrink-0" style={{ color: colorGreen }}>✓</span>}
                {qualifiedWrongSlot && <span className="text-[10px] flex-shrink-0" style={{ color: colorYellow }}>~</span>}
              </div>

              {/* Actual position (team at same rank slot) */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 border-l"
                style={{
                  backgroundColor: actualRow && actualIs3rdQ ? t.qualify3rd : actualRow && actualQualifies && actualRow.team === predRow.team ? t.qualify : "transparent",
                  borderColor: t.border,
                }}
              >
                <span className="text-xs font-black w-4 text-center flex-shrink-0" style={{ color: actualRow && (predIdx < 2 || actualIs3rdQ) ? t.accent : t.textMuted }}>
                  {predIdx + 1}
                </span>
                {actualRow ? (
                  <>
                    <FlagImage emoji={actualRow.flag} size={14} team={actualRow.team} />
                    <span
                      className="text-xs font-semibold truncate flex-1"
                      style={{ color: actualRow.team === predRow.team ? t.accent : t.text }}
                    >
                      {actualRow.team}
                    </span>
                    {actualIs3rdQ && (
                      <span className="text-[9px] font-black flex-shrink-0 px-1 py-0.5 rounded" style={{ color: t.textMuted, border: `1px solid ${t.qualify3rdBorder}` }}>3Q</span>
                    )}
                    <span className="text-xs tabular-nums flex-shrink-0" style={{ color: actualRow.gd > 0 ? (mono ? "#16A34A" : "#4ADE80") : actualRow.gd < 0 ? "#F87171" : t.textMuted }}>
                      {actualRow.gd > 0 ? `+${actualRow.gd}` : actualRow.gd}
                    </span>
                    <span className="text-xs font-black tabular-nums flex-shrink-0" style={{ color: t.textMuted }}>
                      {actualRow.pts}p
                    </span>
                  </>
                ) : (
                  <span className="text-xs italic" style={{ color: t.textMuted }}>TBD</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Standard group card ───────────────────────────────────────────────────────

function GroupCard({
  letter, rows, correct, hasActual, view, qualifiedQ3rds, mono, t,
}: {
  letter: string;
  rows: TeamRow[];
  correct: number | null;
  hasActual: boolean;
  view: "predicted" | "actual" | "compare";
  qualifiedQ3rds: Set<string>;
  mono: boolean;
  t: Record<string, string>;
}) {
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
      </div>

      {/* Table */}
      <div className="px-4 py-3 space-y-1">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-4" />
          <span className="flex-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>Team</span>
          <span className="w-5 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>W</span>
          <span className="w-5 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>D</span>
          <span className="w-5 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>L</span>
          <span className="w-7 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>GD</span>
          <span className="w-7 text-right text-[9px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>Pts</span>
        </div>

        {rows.map((row, i) => {
          const qualifies   = i < 2;
          const is3rdQ      = i === 2 && qualifiedQ3rds.has(row.team);
          return (
            <div
              key={row.team}
              className="flex items-center gap-2 rounded-xl px-2 py-2"
              style={{
                backgroundColor: qualifies ? t.qualify : is3rdQ ? t.qualify3rd : "transparent",
                border: qualifies ? `1px solid ${t.qualifyBorder}` : is3rdQ ? `1px solid ${t.qualify3rdBorder}` : "1px solid transparent",
              }}
            >
              {/* Position */}
              <span
                className="w-4 text-center text-xs font-black"
                style={{ color: qualifies ? t.accent : is3rdQ ? t.textSec : t.textMuted }}
              >
                {i + 1}
              </span>

              {/* Flag + name */}
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <FlagImage emoji={row.flag} size={16} team={row.team} />
                <span className="text-xs font-semibold truncate" style={{ color: t.text }}>
                  {row.team}
                </span>
                {is3rdQ && <span className="text-[9px] font-black px-1 py-0.5 rounded flex-shrink-0" style={{ color: t.textMuted, border: `1px solid ${t.qualify3rdBorder}` }}>3Q</span>}
              </div>

              <span className="w-5 text-center text-xs tabular-nums" style={{ color: t.textSec }}>{row.w}</span>
              <span className="w-5 text-center text-xs tabular-nums" style={{ color: t.textSec }}>{row.d}</span>
              <span className="w-5 text-center text-xs tabular-nums" style={{ color: t.textSec }}>{row.l}</span>
              <span className="w-7 text-center text-xs tabular-nums font-medium" style={{ color: row.gd > 0 ? (mono ? "#1A1208" : "#4ADE80") : row.gd < 0 ? "#F87171" : t.textMuted }}>
                {row.gd > 0 ? `+${row.gd}` : row.gd}
              </span>
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
