"use client";

import { useState, useMemo, useTransition, useRef, useCallback } from "react";
import type { Match, Phase, PhaseId } from "@/lib/mock-data";
import { saveScore, saveAllScores, clearAllScores } from "@/app/actions/scores";
import { saveIllustrationSetting, type IllustrationSetting } from "@/app/actions/illustrations";
import { saveBonusAnswer } from "@/app/actions/bonuses";
import { BONUS_QUESTIONS, playerListForQuestion } from "@/lib/bonus-data";
import {
  R32_LABELS, R16_IDS, QF_IDS, SF_IDS, THIRD_PLACE_ID, FINAL_ID,
  type KnockoutMatchInfo,
} from "@/lib/bracket";

interface AdminClientProps {
  matches: Match[];
  phases: Phase[];
  initialScores: Record<string, { home: number; away: number; pens?: "home" | "away" }>;
  initialIllustrationSettings: Record<string, IllustrationSetting>;
  initialBonusAnswers?: Record<string, string>;
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
const THIRD_LABELS: KnockoutMatchInfo[] = [
  { id: THIRD_PLACE_ID, homeLabel: "L sf-0", awayLabel: "L sf-1" },
];
const FINAL_LABELS: KnockoutMatchInfo[] = [
  { id: FINAL_ID, homeLabel: "W sf-0", awayLabel: "W sf-1" },
];

const KNOCKOUT_LABELS: Record<string, KnockoutMatchInfo[]> = {
  r32: R32_LABELS,
  r16: R16_LABELS,
  qf:  QF_LABELS,
  sf:  SF_LABELS,
  third: THIRD_LABELS,
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

type AdminView = "scores" | "illustrations" | "bonuses";

export default function AdminClient({ matches, phases, initialScores, initialIllustrationSettings, initialBonusAnswers = {} }: AdminClientProps) {
  const [adminView, setAdminView] = useState<AdminView>("scores");
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
  const [illustrationSettings, setIllustrationSettings] = useState<Record<string, IllustrationSetting>>(
    initialIllustrationSettings
  );
  const [illustrationSaved, setIllustrationSaved] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    for (const id of Object.keys(initialIllustrationSettings)) s[id] = true;
    return s;
  });

  const illustratedMatches = useMemo(
    () => matches.filter(m => m.illustration),
    [matches]
  );

  const [bonusAnswers, setBonusAnswers] = useState<Record<string, string>>(initialBonusAnswers);
  const [bonusSaved, setBonusSaved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.keys(initialBonusAnswers).map(k => [k, true]))
  );

  function handleBonusAnswer(key: string, value: string) {
    setBonusSaved(prev => ({ ...prev, [key]: false }));
    setBonusAnswers(prev => ({ ...prev, [key]: value }));
    startTransition(async () => {
      await saveBonusAnswer(key, value);
      setBonusSaved(prev => ({ ...prev, [key]: true }));
    });
  }

  function handleIllustrationChange(matchId: string, setting: IllustrationSetting) {
    setIllustrationSaved(prev => ({ ...prev, [matchId]: false }));
    setIllustrationSettings(prev => ({ ...prev, [matchId]: setting }));
  }

  function handleIllustrationSave(matchId: string) {
    const s = illustrationSettings[matchId];
    if (!s) return;
    startTransition(async () => {
      await saveIllustrationSetting(matchId, s.x, s.y, s.scale);
      setIllustrationSaved(prev => ({ ...prev, [matchId]: true }));
    });
  }

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

  // Rotating score patterns — varied enough to produce interesting group standings
  const SEED_PATTERNS = [
    { home: 2, away: 1 }, { home: 1, away: 0 }, { home: 1, away: 1 },
    { home: 0, away: 1 }, { home: 2, away: 0 }, { home: 0, away: 2 },
    { home: 3, away: 1 }, { home: 1, away: 2 }, { home: 0, away: 0 },
    { home: 2, away: 2 }, { home: 1, away: 3 }, { home: 3, away: 0 },
  ];

  // Non-tied patterns (home ≠ away) so knockout seeds always produce a clear winner
  const KO_SEED_PATTERNS = SEED_PATTERNS.filter(p => p.home !== p.away);

  function handleSeedScores() {
    const bulk: Record<string, { home: number; away: number }> = {};
    // Group + R32 matches (all Match objects)
    matches.forEach((m, i) => {
      bulk[m.id] = SEED_PATTERNS[i % SEED_PATTERNS.length];
    });
    // R16 → Final: use non-tied patterns so no penalty winner needed
    const koIds = [...R16_LABELS, ...QF_LABELS, ...SF_LABELS, ...THIRD_LABELS, ...FINAL_LABELS].map(m => m.id);
    koIds.forEach((id, i) => {
      bulk[id] = KO_SEED_PATTERNS[i % KO_SEED_PATTERNS.length];
    });
    // Flatten local state
    setScores(prev => ({ ...prev, ...bulk }));
    const allSaved: Record<string, boolean> = {};
    for (const id of Object.keys(bulk)) allSaved[id] = false;
    setSaved(prev => ({ ...prev, ...allSaved }));
    startTransition(async () => {
      await saveAllScores(bulk);
      setSaved(prev => {
        const next = { ...prev };
        for (const id of Object.keys(bulk)) next[id] = true;
        return next;
      });
    });
  }

  function handleClearScores() {
    setScores(() => {
      const init: Record<string, { home: number; away: number }> = {};
      for (const m of matches) init[m.id] = { home: 0, away: 0 };
      for (const id of allKnockoutIds) init[id] = { home: 0, away: 0 };
      return init;
    });
    setSaved({});
    setPensWinners({});
    startTransition(async () => { await clearAllScores(); });
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
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: T.accent }}>
            Admin
          </span>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: T.border }}>
            {(["scores", "illustrations", "bonuses"] as AdminView[]).map(v => (
              <button
                key={v}
                onClick={() => setAdminView(v)}
                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors"
                style={{
                  backgroundColor: adminView === v ? T.accent : "transparent",
                  color: adminView === v ? T.accentTx : T.textSec,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {adminView === "scores" && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: T.textMuted }}>
              {savedCount} saved
            </span>
            <button
              onClick={handleSeedScores}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer"
              style={{ backgroundColor: T.accent, color: T.accentTx, border: "none" }}
            >
              Seed scores
            </button>
            <button
              onClick={handleClearScores}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer"
              style={{ backgroundColor: "transparent", color: T.textSec, border: `1px solid ${T.border}` }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Bonuses view */}
      {adminView === "bonuses" && (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <p className="text-xs" style={{ color: T.textMuted }}>
            Set the correct answer for each bonus question. Once saved, all users will see their score.
          </p>
          {BONUS_QUESTIONS.filter(q => q.type !== "auto").map(q => {
            const players = playerListForQuestion(q.key);
            return (
              <div
                key={q.key}
                className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{q.icon}</span>
                    <div>
                      <p className="text-sm font-black" style={{ color: T.text }}>{q.label}</p>
                      <p className="text-[11px]" style={{ color: T.textMuted }}>{q.description}</p>
                    </div>
                  </div>
                  {bonusSaved[q.key] && (
                    <span className="text-[10px] font-bold" style={{ color: "#4ADE80" }}>✓ Saved</span>
                  )}
                </div>

                {q.type === "player" ? (
                  <div className="space-y-1">
                    <select
                      value={bonusAnswers[q.key] ?? ""}
                      onChange={e => handleBonusAnswer(q.key, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer"
                      style={{
                        backgroundColor: T.inner,
                        border: `1px solid ${T.border}`,
                        color: bonusAnswers[q.key] ? T.text : T.textMuted,
                      }}
                    >
                      <option value="">— Select winner —</option>
                      {players.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        placeholder="Or type custom name…"
                        className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ backgroundColor: T.inner, border: `1px solid ${T.border}`, color: T.text }}
                        onBlur={e => { if (e.target.value.trim()) handleBonusAnswer(q.key, e.target.value.trim()); }}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (v) handleBonusAnswer(q.key, v);
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleBonusAnswer(q.key, String(Math.max(0, (parseInt(bonusAnswers[q.key] ?? "0") || 0) - 1)))}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xl font-black cursor-pointer"
                      style={{ backgroundColor: T.inner, border: `1px solid ${T.border}`, color: T.textSec }}
                    >−</button>
                    <span className="flex-1 text-center text-2xl font-black tabular-nums" style={{ color: T.text }}>
                      {bonusAnswers[q.key] ?? "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBonusAnswer(q.key, String((parseInt(bonusAnswers[q.key] ?? "0") || 0) + 1))}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xl font-black cursor-pointer"
                      style={{ backgroundColor: T.inner, border: `1px solid ${T.border}`, color: T.textSec }}
                    >+</button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Worst Group Team — informational only, auto-calculated per user */}
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📉</span>
              <div>
                <p className="text-sm font-black" style={{ color: T.text }}>Worst Group Stage Team</p>
                <p className="text-[11px]" style={{ color: T.textMuted }}>Auto-calculated per user from their score picks. No input needed.</p>
              </div>
            </div>
            <p className="text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: T.inner, color: T.textSec }}>
              Each user&apos;s predicted worst team is derived from their group stage score picks. When results are final, set the actual worst team below.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                placeholder="Actual worst team (e.g. Qatar)…"
                value={bonusAnswers["worst_group_team"] ?? ""}
                onChange={e => handleBonusAnswer("worst_group_team", e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: T.inner, border: `1px solid ${T.border}`, color: T.text }}
              />
              {bonusSaved["worst_group_team"] && (
                <span className="self-center text-[10px] font-bold" style={{ color: "#4ADE80" }}>✓</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Illustrations view */}
      {adminView === "illustrations" && (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {illustratedMatches.length === 0 && (
            <p className="text-center py-16 text-sm" style={{ color: T.textMuted }}>
              No illustrated matches found.
            </p>
          )}
          {illustratedMatches.map(match => (
            <IllustrationEditor
              key={match.id}
              match={match}
              setting={illustrationSettings[match.id] ?? { x: 50, y: 50, scale: 1 }}
              isSaved={!!illustrationSaved[match.id]}
              onChange={s => handleIllustrationChange(match.id, s)}
              onSave={() => handleIllustrationSave(match.id)}
            />
          ))}
        </div>
      )}

      {/* Scores view: phase tabs + day tabs + match rows */}
      {adminView === "scores" && (
        <>
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
        </>
      )}
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

// ── Illustration editor ───────────────────────────────────────────────────────
function IllustrationEditor({
  match,
  setting,
  isSaved,
  onChange,
  onSave,
}: {
  match: Match;
  setting: IllustrationSetting;
  isSaved: boolean;
  onChange: (s: IllustrationSetting) => void;
  onSave: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: setting.x,
      startY: setting.y,
    };
  }, [setting.x, setting.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragState.current.mouseX) / rect.width * 100;
    const dy = (e.clientY - dragState.current.mouseY) / rect.height * 100;
    // Dragging right reveals left → focal point moves left (x decreases)
    const newX = Math.max(0, Math.min(100, dragState.current.startX - dx));
    const newY = Math.max(0, Math.min(100, dragState.current.startY - dy));
    onChange({ ...setting, x: newX, y: newY });
  }, [setting, onChange]);

  const handleMouseUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const handleScaleChange = useCallback((delta: number) => {
    const newScale = Math.max(1, Math.min(3, parseFloat((setting.scale + delta).toFixed(2))));
    onChange({ ...setting, scale: newScale });
  }, [setting, onChange]);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: T.card, borderColor: isSaved ? "rgba(215,255,90,0.3)" : T.border }}
    >
      {/* Match label */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.inner }}>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{match.homeFlag}</span>
          <span className="text-xs font-black uppercase tracking-tight" style={{ color: T.text }}>
            {match.homeTeam} vs {match.awayTeam}
          </span>
          <span className="text-base leading-none">{match.awayFlag}</span>
        </div>
        <button
          onClick={onSave}
          disabled={isSaved}
          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:cursor-default"
          style={{
            backgroundColor: isSaved ? "transparent" : T.accent,
            color: isSaved ? T.accent : T.accentTx,
            border: `1px solid ${isSaved ? "rgba(215,255,90,0.4)" : T.accent}`,
            opacity: isSaved ? 0.7 : 1,
          }}
        >
          {isSaved ? "✓ Saved" : "Save"}
        </button>
      </div>

      {/* Draggable image preview */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden select-none"
        style={{ aspectRatio: "3/2", maxHeight: "240px", cursor: dragState.current ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={match.illustration}
          alt={`${match.homeTeam} vs ${match.awayTeam}`}
          className="w-full h-full object-cover pointer-events-none"
          style={{
            objectPosition: `${setting.x}% ${setting.y}%`,
            transform: `scale(${setting.scale})`,
            transformOrigin: `${setting.x}% ${setting.y}%`,
          }}
          draggable={false}
        />
        {/* Crosshair overlay */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${setting.x}%`,
            top: `${setting.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: T.accent, opacity: 0.8 }} />
        </div>
        <div
          className="absolute bottom-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", color: T.accent }}
        >
          drag to pan
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-4 px-4 py-3 border-t" style={{ borderColor: T.inner }}>
        {/* Position readout */}
        <div className="flex gap-3 text-[10px] font-bold" style={{ color: T.textSec }}>
          <span>X: <span style={{ color: T.text }}>{Math.round(setting.x)}%</span></span>
          <span>Y: <span style={{ color: T.text }}>{Math.round(setting.y)}%</span></span>
        </div>

        <div className="flex-1" />

        {/* Scale control */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold" style={{ color: T.textSec }}>
            Zoom: <span style={{ color: T.text }}>{setting.scale.toFixed(2)}×</span>
          </span>
          <button
            type="button"
            onClick={() => handleScaleChange(-0.1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black cursor-pointer hover:opacity-70"
            style={{ color: T.textSec, border: `1px solid ${T.border}`, backgroundColor: "transparent" }}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => handleScaleChange(0.1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black cursor-pointer hover:opacity-70"
            style={{ color: T.textSec, border: `1px solid ${T.border}`, backgroundColor: "transparent" }}
          >
            +
          </button>
        </div>

        {/* Reset button */}
        <button
          type="button"
          onClick={() => onChange({ x: 50, y: 50, scale: 1 })}
          className="text-[10px] font-bold cursor-pointer hover:opacity-70"
          style={{ color: T.textMuted }}
        >
          Reset
        </button>
      </div>
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
