"use client";

import { useState, useTransition } from "react";
import { BONUS_QUESTIONS, playerListForQuestion } from "@/lib/bonus-data";
import { scoreBonusQuestion } from "@/lib/bonus-scoring";
import { saveBonusPick } from "@/app/actions/bonuses";

const BONUS_ILLUSTRATIONS: Record<string, string> = {
  golden_ball:       "/bonuses/golden-ball.png",
  golden_boot:       "/bonuses/golden-boot.png",
  golden_glove:      "/bonuses/golden-glove.png",
  best_young_player: "/bonuses/best-young-player.png",
  total_goals:       "/bonuses/total-goals.png",
  worst_group_team:  "/bonuses/worst-group-team.png",
  red_cards:         "/bonuses/red-cards.png",
};

interface BonusTabProps {
  bonusPicks: Record<string, string>;          // current user's picks
  bonusAnswers: Record<string, string>;         // admin-set actual answers (empty if not revealed)
  worstGroupTeam: string | null;               // auto-calculated from user's score picks
  isPreview?: boolean;
  tournamentStarted?: boolean;                  // true once any match score is set or past Jun 11
  mono?: boolean;
  onPickChange?: (key: string, value: string) => void;
}

const T_DARK = {
  bg:       "#0B1E0D",
  card:     "#1A2E1F",
  border:   "#2C4832",
  inner:    "#1F3A24",
  accent:   "#D7FF5A",
  green:    "#4ADE80",
  red:      "#F87171",
  textPrimary: "#F0EDE6",
  textBody:    "#C8D8CC",
  textSec:     "#7A9B84",
  textMuted:   "#4A6B50",
};

const T_MONO = {
  bg:       "#F7F4EE",
  card:     "#FFFFFF",
  border:   "#E5E1D8",
  inner:    "#F0EDE6",
  accent:   "#1A1208",
  green:    "#16A34A",
  red:      "#DC2626",
  textPrimary: "#1A1208",
  textBody:    "#3A2E1E",
  textSec:     "#6B5E4E",
  textMuted:   "#A89E8E",
};

export default function BonusTab({
  bonusPicks: initialPicks,
  bonusAnswers,
  worstGroupTeam,
  isPreview = false,
  tournamentStarted = false,
  mono = false,
  onPickChange,
}: BonusTabProps) {
  const t = mono ? T_MONO : T_DARK;
  const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
  const [, startTransition] = useTransition();

  const isLocked = !isPreview && tournamentStarted;

  function handlePick(key: string, value: string) {
    if (isPreview || isLocked) return;
    setPicks((prev) => ({ ...prev, [key]: value }));
    onPickChange?.(key, value);
    startTransition(() => {
      saveBonusPick(key, value);
    });
  }

  const totalEarned = BONUS_QUESTIONS.reduce((acc, q) => {
    const actual = bonusAnswers[q.key];
    if (!actual) return acc;
    const userAnswer = q.type === "auto" ? (worstGroupTeam ?? "") : (picks[q.key] ?? "");
    return acc + scoreBonusQuestion(q.key, userAnswer, actual);
  }, 0);

  const answeredCount = BONUS_QUESTIONS.filter((q) =>
    q.type === "auto" ? !!worstGroupTeam : !!picks[q.key]
  ).length;

  const hasAnyAnswers = Object.keys(bonusAnswers).length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}
      >
        <div>
          <p className="text-sm font-black uppercase tracking-widest" style={{ color: t.textPrimary }}>
            Bonus Questions
          </p>
          <p className="text-xs mt-0.5" style={{ color: t.textSec }}>
            {answeredCount}/{BONUS_QUESTIONS.length} answered · 5 pts each · {isLocked ? "Locked" : "Locks Jun 11"}
          </p>
        </div>
        {hasAnyAnswers && (
          <div className="text-right">
            <p className="text-2xl font-black" style={{ color: t.green }}>+{totalEarned}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>
              pts earned
            </p>
          </div>
        )}
      </div>

      {/* Question cards */}
      {BONUS_QUESTIONS.map((q) => {
        const userAnswer = q.type === "auto" ? (worstGroupTeam ?? "") : (picks[q.key] ?? "");
        const actual = bonusAnswers[q.key];
        const isAnswered = !!userAnswer;
        const isRevealed = !!actual;
        const pts = isRevealed ? scoreBonusQuestion(q.key, userAnswer, actual) : null;
        const isCorrect = pts !== null && pts > 0;
        const isWrong = pts !== null && pts === 0 && isAnswered;

        const illustration = BONUS_ILLUSTRATIONS[q.key];

        return (
          <div
            key={q.key}
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: t.card,
              border: `1px solid ${
                isCorrect ? (mono ? "#C8C0B0" : "rgba(74,222,128,0.35)")
                : isWrong  ? (mono ? "#DDD9D0" : "rgba(248,113,113,0.2)")
                : t.border
              }`,
              boxShadow: isCorrect
                ? mono ? "0 4px 24px rgba(74,222,128,0.15)" : "0 0 0 1px rgba(74,222,128,0.15), 0 8px 32px rgba(74,222,128,0.12)"
                : isWrong
                ? mono ? "none" : "0 2px 12px rgba(0,0,0,0.3)"
                : "none",
            }}
          >
            {/* Illustration */}
            {illustration && (
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/2", maxHeight: "180px" }}>
                <img
                  src={illustration}
                  alt={q.label}
                  className="w-full h-full object-cover"
                  style={{ filter: mono ? "grayscale(1) contrast(1.2) brightness(1.05)" : "none" }}
                />
                {/* Bottom gradient fade into card bg */}
                <div
                  className="absolute inset-x-0 bottom-0"
                  style={{ height: "70px", background: `linear-gradient(to bottom, transparent, ${mono ? "#FFFFFF" : "#1A2E1F"})` }}
                />
                {/* Correct/wrong verdict badge — shown after admin reveals */}
                {isRevealed && (
                  <div
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                    style={{
                      backgroundColor: isCorrect
                        ? mono ? "rgba(22,163,74,0.9)" : "rgba(74,222,128,0.9)"
                        : mono ? "rgba(220,38,38,0.85)" : "rgba(248,113,113,0.85)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <span className="text-xs font-black" style={{ color: isCorrect ? (mono ? "#fff" : "#0B1E0D") : "#fff" }}>
                      {isCorrect ? `✓ +${pts} pts` : "✗ 0 pts"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Question header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: `1px solid ${t.inner}` }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{q.icon}</span>
                <div>
                  <p className="text-sm font-black" style={{ color: t.textPrimary }}>{q.label}</p>
                  <p className="text-[11px]" style={{ color: t.textMuted }}>{q.description}</p>
                </div>
              </div>
              {isRevealed && (
                <div className="text-right flex-shrink-0 ml-3">
                  <p
                    className="text-sm font-black"
                    style={{ color: isCorrect ? t.green : t.red }}
                  >
                    {isCorrect ? `+${pts} pts` : "0 pts"}
                  </p>
                </div>
              )}
            </div>

            {/* Answer area */}
            <div className="px-4 py-3 flex flex-col gap-2">
              {/* Hide picker once answer is revealed — result row below replaces it */}
              {!isRevealed && (
                q.type === "auto" ? (
                  <AutoAnswer team={worstGroupTeam} t={t} />
                ) : q.type === "player" ? (
                  <PlayerPicker
                    questionKey={q.key}
                    players={playerListForQuestion(q.key)}
                    value={picks[q.key] ?? ""}
                    onChange={(v) => handlePick(q.key, v)}
                    disabled={isPreview || isLocked}
                    t={t}
                  />
                ) : (
                  <NumberPicker
                    value={picks[q.key] ?? ""}
                    onChange={(v) => handlePick(q.key, v)}
                    disabled={isPreview || isLocked}
                    t={t}
                  />
                )
              )}

              {/* Result row — show after admin reveals answers */}
              {isRevealed && (
                <div
                  className="flex flex-col gap-1 px-3 py-2.5 rounded-xl mt-1"
                  style={{
                    backgroundColor: isCorrect
                      ? mono ? "rgba(22,163,74,0.06)" : "rgba(74,222,128,0.08)"
                      : mono ? "rgba(220,38,38,0.04)" : "rgba(248,113,113,0.06)",
                    border: `1px solid ${isCorrect
                      ? mono ? "#C8C0B0" : "rgba(74,222,128,0.2)"
                      : mono ? "#DDD9D0" : "rgba(248,113,113,0.15)"}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: t.textMuted }}>
                        Your pick
                      </p>
                      <p className="text-xs font-bold" style={{ color: t.textBody }}>
                        {isAnswered ? userAnswer : "No pick"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: t.textMuted }}>
                        Correct answer
                      </p>
                      <p className="text-xs font-bold" style={{ color: isCorrect ? t.green : t.textPrimary }}>
                        {actual}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Auto answer (Worst Group Team) ────────────────────────────────────────────
function AutoAnswer({ team, t }: { team: string | null; t: typeof T_DARK }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ backgroundColor: t.inner, border: `1px solid ${t.border}` }}
    >
      <div className="flex-1">
        {team ? (
          <>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: t.textMuted }}>
              Auto-calculated from your picks
            </p>
            <p className="text-sm font-black" style={{ color: t.textPrimary }}>{team}</p>
          </>
        ) : (
          <p className="text-xs" style={{ color: t.textMuted }}>
            Make score predictions to auto-calculate your worst group team
          </p>
        )}
      </div>
      <span className="text-xs px-2 py-1 rounded-lg font-bold" style={{ backgroundColor: t.border, color: t.textSec }}>
        Auto
      </span>
    </div>
  );
}

// ── Player picker ──────────────────────────────────────────────────────────────
function PlayerPicker({
  players,
  value,
  onChange,
  disabled,
  t,
}: {
  questionKey: string;
  players: string[];
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  t: typeof T_DARK;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none cursor-pointer appearance-none"
      style={{
        backgroundColor: t.inner,
        border: `1px solid ${t.border}`,
        color: value ? t.textPrimary : t.textMuted,
        opacity: disabled ? 0.5 : 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%234A6B50' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: "32px",
      }}
    >
      <option value="" disabled>Select a player…</option>
      {players.map((player) => (
        <option key={player} value={player}>{player}</option>
      ))}
    </select>
  );
}

// ── Number picker ─────────────────────────────────────────────────────────────
function NumberPicker({
  value,
  onChange,
  disabled,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  t: typeof T_DARK;
}) {
  const num = value === "" ? null : parseInt(value) || 0;

  function adjust(delta: number) {
    const current = num ?? 0;
    onChange(String(Math.max(0, current + delta)));
  }

  const btnStyle: React.CSSProperties = {
    height: 36,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    backgroundColor: "transparent",
    color: t.textSec,
    fontSize: 13,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: t.inner,
        border: `1px solid ${t.border}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <button type="button" style={btnStyle} onClick={() => !disabled && adjust(-10)}>−10</button>
      <button type="button" style={btnStyle} onClick={() => !disabled && adjust(-1)}>−1</button>
      <input
        type="number"
        min={0}
        max={999}
        value={num ?? ""}
        disabled={disabled}
        placeholder="—"
        onChange={(e) => {
          const v = parseInt(e.target.value);
          onChange(isNaN(v) ? "" : String(Math.max(0, v)));
        }}
        className="flex-1 text-center text-xl font-black tabular-nums bg-transparent outline-none"
        style={{
          color: num !== null ? t.textPrimary : t.textMuted,
          minWidth: 0,
          WebkitAppearance: "none",
          MozAppearance: "textfield",
        }}
      />
      <button type="button" style={btnStyle} onClick={() => !disabled && adjust(1)}>+1</button>
      <button type="button" style={btnStyle} onClick={() => !disabled && adjust(10)}>+10</button>
    </div>
  );
}
