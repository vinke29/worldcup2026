"use client";

import { useState, useMemo, useTransition } from "react";
import type { Match, Phase, PhaseId } from "@/lib/mock-data";
import { saveScore } from "@/app/actions/scores";
import {
  R32_LABELS, R16_IDS, QF_IDS, SF_IDS, FINAL_ID,
  type KnockoutMatchInfo,
} from "@/lib/bracket";

interface AdminClientProps {
  matches: Match[];
  phases: Phase[];
  initialScores: Record<string, { home: number; away: number; pens?: "home" | "away" }>;
}

// Knockout match definitions for admin display
const R16_LABELS: KnockoutMatchInfo[] = [
  { id: "r16-0", homeLabel: "W m74", awayLabel: "W m77" },
  { id: "r16-1", homeLabel: "W m73", awayLabel: "W m75" },
  { id: "r16-2", homeLabel: "W m83", awayLabel: "W m84" },
  { id: "r16-3", homeLabel: "W m81", awayLabel: "W m82" },
  { id: "r16-4", homeLabel: "W m76", awayLabel: "W m78" },
  { id: "r16-5", homeLabel: "W m79", awayLabel: "W m80" },
  { id: "r16-6", homeLabel: "W m86", awayLabel: "W m88" },
  { id: "r16-7", homeLabel: "W m85", awayLabel: "W m87" },
];
const QF_LABELS: KnockoutMatchInfo[] = [
  { id: "qf-0", homeLabel: "W r16-0", awayLabel: "W r16-1" },
  { id: "qf-1", homeLabel: "W r16-2", awayLabel: "W r16-3" },
  { id: "qf-2", homeLabel: "W r16-4", awayLabel: "W r16-5" },
  { id: "qf-3", homeLabel: "W r16-6", awayLabel: "W r16-7" },
];
const SF_LABELS: KnockoutMatchInfo[] = [
  { id: "sf-0", homeLabel: "W qf-0", awayLabel: "W qf-1" },
  { id: "sf-1", homeLabel: "W qf-2", awayLabel: "W qf-3" },
];
const FINAL_LABELS: KnockoutMatchInfo[] = [
  { id: FINAL_ID, homeLabel: "W sf-0", awayLabel: "W sf-1" },
];

const KNOCKOUT_LABELS: Record<string, KnockoutMatchInfo[]> = {
  r32: R32_LABELS,
  r16: R16_LABELS,
  qf:  QF_LABELS,
  sf:  SF_LABELS,
  final: FINAL_LABELS,
};

const T = {
  bg:       "#0B1E0D",
  card:     "#1A2E1F",
  border:   "#2C4832",
  inner:    "#1F3A24",
  text:     "#F0EDE6",
  textSec:  "#7A9B84",
  textMuted:"#4A6B50",
  accent:   "#D7FF5A",
  accentTx: "#0B1E0D",
};

function parseDateStr(date: string): Date {
  const months: Record<string, number> = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
  };
  const [mon, day] = date.split(" ");
  return new Date(2026, months[mon], Number(day));
}

export default function AdminClient({ matches, phases, initialScores }: AdminClientProps) {
  const [activePhase, setActivePhase] = useState<PhaseId>("group-md1");
  const [activeDay, setActiveDay] = useState<string>(() => {
    const first = matches.find(m => m.phase === "group-md1");
    return first?.date ?? "";
  });
  // Local score state: matchId → { home, away }
  const allKnockoutIds = [
    ...R32_LABELS, ...R16_LABELS, ...QF_LABELS, ...SF_LABELS, ...FINAL_LABELS,
  ].map(m => m.id);

  const [scores, setScores] = useState<Record<string, { home: number; away: number }>>(
    () => {
      const init: Record<string, { home: number; away: number }> = {};
      for (const m of matches) {
        init[m.id] = initialScores[m.id] ?? { home: 0, away: 0 };
      }
      for (const id of allKnockoutIds) {
        init[id] = initialScores[id] ?? { home: 0, away: 0 };
      }
      return init;
    }
  );
  const [saved, setSaved] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    for (const id of Object.keys(initialScores)) s[id] = true;
    return s;
  });
  const [pensWinners, setPensWinners] = useState<Record<string, "home" | "away" | null>>(() => {
    const p: Record<string, "home" | "away" | null> = {};
    for (const [id, s] of Object.entries(initialScores)) p[id] = s.pens ?? null;
    return p;
  });
  const [, startTransition] = useTransition();

  const isGroupPhase = activePhase.startsWith("group");

  const phaseMatches = useMemo(
    () => matches.filter(m => m.phase === activePhase),
    [matches, activePhase]
  );

  const days = useMemo((): string[] => {
    if (!isGroupPhase) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const m of phaseMatches) {
      if (!seen.has(m.date)) { seen.add(m.date); result.push(m.date); }
    }
    return result.sort((a, b) => parseDateStr(a).getTime() - parseDateStr(b).getTime());
  }, [phaseMatches, isGroupPhase]);

  const visibleMatches = useMemo(
    () => isGroupPhase ? phaseMatches.filter(m => m.date === activeDay) : phaseMatches,
    [phaseMatches, isGroupPhase, activeDay]
  );

  const knockoutLabels: KnockoutMatchInfo[] = isGroupPhase ? [] : (KNOCKOUT_LABELS[activePhase] ?? []);

  function handlePhaseChange(phase: PhaseId) {
    setActivePhase(phase);
    const first = matches.find(m => m.phase === phase);
    if (first) setActiveDay(first.date);
  }

  function setScore(matchId: string, side: "home" | "away", value: number) {
    setSaved(prev => ({ ...prev, [matchId]: false }));
    setScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: Math.max(0, Math.min(20, value)) },
    }));
  }

  function setPensWinner(matchId: string, winner: "home" | "away" | null) {
    setSaved(prev => ({ ...prev, [matchId]: false }));
    setPensWinners(prev => ({ ...prev, [matchId]: winner }));
  }

  function handleSave(matchId: string) {
    const s = scores[matchId];
    const pens = pensWinners[matchId] ?? undefined;
    startTransition(async () => {
      await saveScore(matchId, s.home, s.away, pens);
      setSaved(prev => ({ ...prev, [matchId]: true }));
    });
  }

  // Group by group name for group phases
  const matchesByGroup = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    for (const m of visibleMatches) {
      const key = m.group || "Matches";
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return groups;
  }, [visibleMatches]);

  const groupKeys = useMemo(() => Object.keys(matchesByGroup).sort(), [matchesByGroup]);

  const savedCount = Object.values(saved).filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-3 border-b flex items-center justify-between"
        style={{ backgroundColor: T.bg, borderColor: T.border }}
      >
        <div>
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: T.accent }}>
            Admin
          </span>
          <span className="text-xs font-bold ml-2" style={{ color: T.textSec }}>
            Score Entry
          </span>
        </div>
        <span className="text-xs" style={{ color: T.textMuted }}>
          {savedCount} scores saved
        </span>
      </div>

      {/* Phase tabs */}
      <div
        className="flex overflow-x-auto border-b"
        style={{ borderColor: T.border, backgroundColor: T.card }}
      >
        {phases.map(phase => {
          const active = phase.id === activePhase;
          return (
            <button
              key={phase.id}
              onClick={() => handlePhaseChange(phase.id as PhaseId)}
              className="flex-shrink-0 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
              style={{
                color: active ? T.accent : T.textSec,
                borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
                backgroundColor: "transparent",
              }}
            >
              {phase.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Day tabs (group phases only) */}
      {isGroupPhase && (
        <div
          className="flex overflow-x-auto border-b px-4 gap-2 py-2"
          style={{ borderColor: T.border }}
        >
          {days.map(day => {
            const active = day === activeDay;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                style={{
                  backgroundColor: active ? T.accent : "transparent",
                  color: active ? T.accentTx : T.textSec,
                  border: `1px solid ${active ? T.accent : T.border}`,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      )}

      {/* Matches */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {isGroupPhase ? (
          <>
            {groupKeys.map(groupKey => (
              <div key={groupKey}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: T.textSec }}>
                    {groupKey}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: T.inner }} />
                </div>
                <div className="space-y-2">
                  {matchesByGroup[groupKey].map(match => (
                    <MatchScoreRow
                      key={match.id}
                      match={match}
                      score={scores[match.id] ?? { home: 0, away: 0 }}
                      isSaved={!!saved[match.id]}
                      onChangeHome={val => setScore(match.id, "home", val)}
                      onChangeAway={val => setScore(match.id, "away", val)}
                      onSave={() => handleSave(match.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          /* Knockout phase — use bracket match labels */
          <div className="space-y-2">
            {knockoutLabels.map(m => (
              <KnockoutScoreRow
                key={m.id}
                info={m}
                score={scores[m.id] ?? { home: 0, away: 0 }}
                pensWinner={pensWinners[m.id] ?? null}
                isSaved={!!saved[m.id]}
                onChangeHome={val => setScore(m.id, "home", val)}
                onChangeAway={val => setScore(m.id, "away", val)}
                onPensWinner={winner => setPensWinner(m.id, winner)}
                onSave={() => handleSave(m.id)}
              />
            ))}
            {knockoutLabels.length === 0 && (
              <p className="text-center py-16 text-sm" style={{ color: T.textMuted }}>
                No matches in this phase.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Knockout score row ────────────────────────────────────────────────────────
function KnockoutScoreRow({
  info, score, pensWinner, isSaved, onChangeHome, onChangeAway, onPensWinner, onSave,
}: {
  info: KnockoutMatchInfo;
  score: { home: number; away: number };
  pensWinner: "home" | "away" | null;
  isSaved: boolean;
  onChangeHome: (v: number) => void;
  onChangeAway: (v: number) => void;
  onPensWinner: (winner: "home" | "away" | null) => void;
  onSave: () => void;
}) {
  const tied = score.home === score.away;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: T.card, borderColor: isSaved ? "rgba(215,255,90,0.3)" : T.border }}
    >
      {/* Score row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 text-xs font-bold truncate text-right" style={{ color: T.textSec }}>
          {info.homeLabel}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <ScoreInput value={score.home} onChange={onChangeHome} />
          <span className="text-xs font-black" style={{ color: T.textMuted }}>—</span>
          <ScoreInput value={score.away} onChange={onChangeAway} />
        </div>
        <span className="flex-1 text-xs font-bold truncate" style={{ color: T.textSec }}>
          {info.awayLabel}
        </span>
        <button
          onClick={onSave}
          disabled={isSaved}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:cursor-default"
          style={{
            backgroundColor: isSaved ? "transparent" : T.accent,
            color: isSaved ? T.accent : T.accentTx,
            border: `1px solid ${isSaved ? "rgba(215,255,90,0.4)" : T.accent}`,
            opacity: isSaved ? 0.7 : 1,
          }}
        >
          {isSaved ? "✓" : "Set"}
        </button>
      </div>

      {/* Penalty winner — only shown when tied */}
      {tied && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-t"
          style={{ borderColor: T.border }}
        >
          <span className="text-[10px] font-black uppercase tracking-widest flex-shrink-0" style={{ color: T.textMuted }}>
            Pens
          </span>
          <div className="flex gap-2 flex-1">
            {(["home", "away"] as const).map(side => {
              const label = side === "home" ? info.homeLabel : info.awayLabel;
              const active = pensWinner === side;
              return (
                <button
                  key={side}
                  onClick={() => onPensWinner(active ? null : side)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all"
                  style={{
                    backgroundColor: "transparent",
                    color: active ? T.accent : T.textSec,
                    border: `1px solid ${active ? T.accent : T.border}`,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Match score row ───────────────────────────────────────────────────────────
function MatchScoreRow({
  match, score, isSaved, onChangeHome, onChangeAway, onSave,
}: {
  match: Match;
  score: { home: number; away: number };
  isSaved: boolean;
  onChangeHome: (v: number) => void;
  onChangeAway: (v: number) => void;
  onSave: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border"
      style={{
        backgroundColor: T.card,
        borderColor: isSaved ? "rgba(215,255,90,0.3)" : T.border,
      }}
    >
      {/* Home team */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-xl leading-none flex-shrink-0">{match.homeFlag}</span>
        <span className="text-xs font-bold truncate" style={{ color: T.text }}>
          {match.homeTeam.split(" ").slice(-1)[0]}
        </span>
      </div>

      {/* Score inputs */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ScoreInput value={score.home} onChange={onChangeHome} />
        <span className="text-xs font-black" style={{ color: T.textMuted }}>—</span>
        <ScoreInput value={score.away} onChange={onChangeAway} />
      </div>

      {/* Away team */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className="text-xs font-bold truncate text-right" style={{ color: T.text }}>
          {match.awayTeam.split(" ").slice(-1)[0]}
        </span>
        <span className="text-xl leading-none flex-shrink-0">{match.awayFlag}</span>
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={isSaved}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:cursor-default"
        style={{
          backgroundColor: isSaved ? "transparent" : T.accent,
          color: isSaved ? T.accent : T.accentTx,
          border: `1px solid ${isSaved ? "rgba(215,255,90,0.4)" : T.accent}`,
          opacity: isSaved ? 0.7 : 1,
        }}
      >
        {isSaved ? "✓" : "Set"}
      </button>
    </div>
  );
}

// ── Score input ───────────────────────────────────────────────────────────────
function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="w-6 h-6 rounded flex items-center justify-center text-sm font-black cursor-pointer transition-colors hover:opacity-70"
        style={{ color: T.textSec, border: `1px solid ${T.border}`, backgroundColor: "transparent" }}
      >
        −
      </button>
      <input
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-8 text-center font-black text-sm bg-transparent border-0 outline-none tabular-nums"
        style={{ color: T.text }}
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded flex items-center justify-center text-sm font-black cursor-pointer transition-colors hover:opacity-70"
        style={{ color: T.textSec, border: `1px solid ${T.border}`, backgroundColor: "transparent" }}
      >
        +
      </button>
    </div>
  );
}
