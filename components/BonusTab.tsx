"use client";

import { useState, useTransition } from "react";
import { BONUS_QUESTIONS, playerListForQuestion } from "@/lib/bonus-data";
import { scoreBonusQuestion } from "@/lib/bonus-scoring";
import { saveBonusPick } from "@/app/actions/bonuses";

interface BonusTabProps {
  bonusPicks: Record<string, string>;          // current user's picks
  bonusAnswers: Record<string, string>;         // admin-set actual answers (empty if not revealed)
  worstGroupTeam: string | null;               // auto-calculated from user's score picks
  isPreview?: boolean;
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
  mono = false,
  onPickChange,
}: BonusTabProps) {
  const t = mono ? T_MONO : T_DARK;
  const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
  const [, startTransition] = useTransition();

  function handlePick(key: string, value: string) {
    if (isPreview) return;
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
            {answeredCount}/{BONUS_QUESTIONS.length} answered · 5 pts each · Locks Jun 11
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
            }}
          >
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
              {q.type === "auto" ? (
                <AutoAnswer team={worstGroupTeam} t={t} />
              ) : q.type === "player" ? (
                <PlayerPicker
                  questionKey={q.key}
                  players={playerListForQuestion(q.key)}
                  value={picks[q.key] ?? ""}
                  onChange={(v) => handlePick(q.key, v)}
                  disabled={isPreview}
                  t={t}
                />
              ) : (
                <NumberPicker
                  value={picks[q.key] ?? ""}
                  onChange={(v) => handlePick(q.key, v)}
                  disabled={isPreview}
                  t={t}
                />
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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = search.trim()
    ? players.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : players;

  return (
    <div className="relative">
      {/* Selected value / search input */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer"
        style={{
          backgroundColor: t.inner,
          border: `1px solid ${open ? t.accent : t.border}`,
          opacity: disabled ? 0.5 : 1,
        }}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        {open ? (
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Search player…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: t.textPrimary }}
          />
        ) : (
          <span
            className="flex-1 text-sm font-bold"
            style={{ color: value ? t.textPrimary : t.textMuted }}
          >
            {value || "Select a player…"}
          </span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ color: t.textMuted, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-30 w-full mt-1 rounded-xl overflow-hidden shadow-xl"
          style={{
            backgroundColor: t.card,
            border: `1px solid ${t.border}`,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs" style={{ color: t.textMuted }}>No results</div>
          ) : filtered.map((player) => (
            <button
              key={player}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:opacity-80 transition-opacity cursor-pointer"
              style={{
                backgroundColor: player === value ? t.inner : "transparent",
                color: player === value ? t.accent : t.textBody,
                fontWeight: player === value ? 700 : 400,
                borderBottom: `1px solid ${t.inner}`,
              }}
              onClick={() => {
                onChange(player);
                setSearch("");
                setOpen(false);
              }}
            >
              {player}
            </button>
          ))}
        </div>
      )}
    </div>
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
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `1px solid ${t.border}`,
    backgroundColor: "transparent",
    color: t.textSec,
    fontSize: 18,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    userSelect: "none",
  };

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: t.inner,
        border: `1px solid ${t.border}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <button type="button" style={btnStyle} onClick={() => !disabled && adjust(-1)}>−</button>
      <span
        className="flex-1 text-center text-2xl font-black tabular-nums"
        style={{ color: num !== null ? t.textPrimary : t.textMuted }}
      >
        {num !== null ? num : "—"}
      </span>
      <button type="button" style={btnStyle} onClick={() => !disabled && adjust(1)}>+</button>
    </div>
  );
}
