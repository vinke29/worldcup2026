"use client";

import { useState, useMemo, useTransition } from "react";
import type { Match, Phase, PhaseId } from "@/lib/mock-data";
import { saveScore } from "@/app/actions/scores";

interface AdminClientProps {
  matches: Match[];
  phases: Phase[];
  initialScores: Record<string, { home: number; away: number }>;
}

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
  const [scores, setScores] = useState<Record<string, { home: number; away: number }>>(
    () => {
      const init: Record<string, { home: number; away: number }> = {};
      for (const m of matches) {
        init[m.id] = initialScores[m.id] ?? { home: 0, away: 0 };
      }
      return init;
    }
  );
  const [saved, setSaved] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    for (const id of Object.keys(initialScores)) s[id] = true;
    return s;
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

  function handleSave(matchId: string) {
    const s = scores[matchId];
    startTransition(async () => {
      await saveScore(matchId, s.home, s.away);
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
        {groupKeys.map(groupKey => (
          <div key={groupKey}>
            {isGroupPhase && (
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: T.textSec }}>
                  {groupKey}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: T.inner }} />
              </div>
            )}
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

        {visibleMatches.length === 0 && (
          <p className="text-center py-16 text-sm" style={{ color: T.textMuted }}>
            No matches in this phase.
          </p>
        )}
      </div>
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
