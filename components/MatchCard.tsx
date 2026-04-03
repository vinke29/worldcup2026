"use client";

import { useState, useEffect } from "react";
import type { Match, Outcome } from "@/lib/mock-data";

interface MatchCardProps {
  match: Match;
  savedPrediction?: Outcome;
  onPredict?: (matchId: string, outcome: Outcome) => void;
  lockedByPhase?: boolean;
  illustrationStyle?: "color" | "mono";
}

const OUTCOME_COLORS: Record<Outcome, string> = {
  home: "#4ADE80",
  draw: "#FCD34D",
  away: "#F87171",
};

// Parse "Jun 11" + "19:00" into a Date object (2026)
// Times in mock-data are Eastern (EDT = UTC-4); convert to UTC so
// toLocaleTimeString() renders the correct local time for any user.
function matchKickoff(date: string, time: string): Date {
  const months: Record<string, number> = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
  };
  const [mon, day] = date.split(" ");
  const [h, m] = time.split(":").map(Number);
  // EDT = UTC-4 → add 4 hours to convert to UTC
  return new Date(Date.UTC(2026, months[mon], Number(day), h + 4, m));
}

function useCountdown(kickoff: Date) {
  const [diff, setDiff] = useState(() => kickoff.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(kickoff.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [kickoff]);
  return diff;
}

function formatKickoffTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Live";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

// Gradient placeholder when no illustration is available
function IllustrationPlaceholder({ match }: { match: Match }) {
  return (
    <div
      className="relative w-full overflow-hidden flex items-center justify-between px-6"
      style={{
        height: "140px",
        background: "linear-gradient(135deg, #0F2411 0%, #1A2E1F 50%, #0F2411 100%)",
      }}
    >
      {/* Left flag + team */}
      <div className="flex flex-col items-center gap-1 z-10">
        <span style={{ fontSize: "52px", lineHeight: 1 }}>{match.homeFlag}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-center" style={{ color: "#4A6B50", maxWidth: "80px" }}>
          {match.homeTeam}
        </span>
      </div>

      {/* Center divider */}
      <div className="flex flex-col items-center gap-1 z-10">
        <span className="text-2xl font-black" style={{ color: "#1F3A24" }}>×</span>
      </div>

      {/* Right flag + team */}
      <div className="flex flex-col items-center gap-1 z-10">
        <span style={{ fontSize: "52px", lineHeight: 1 }}>{match.awayFlag}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-center" style={{ color: "#4A6B50", maxWidth: "80px" }}>
          {match.awayTeam}
        </span>
      </div>

      {/* Subtle diagonal lines */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, #2C4832 0, #2C4832 1px, transparent 0, transparent 50%)",
          backgroundSize: "12px 12px",
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: "60px", background: "linear-gradient(to bottom, transparent, #1A2E1F)" }}
      />
    </div>
  );
}

export default function MatchCard({
  match,
  savedPrediction,
  onPredict,
  lockedByPhase = false,
  illustrationStyle = "color",
}: MatchCardProps) {
  const [selected, setSelected] = useState<Outcome | null>(savedPrediction ?? null);
  const [showOdds, setShowOdds] = useState(false);
  const [justPicked, setJustPicked] = useState(false);

  // Sync when parent updates prediction externally (e.g. from onboarding)
  useEffect(() => {
    if (savedPrediction !== undefined) setSelected(savedPrediction);
  }, [savedPrediction]);

  const kickoff = matchKickoff(match.date, match.time);
  const countdown = useCountdown(kickoff);

  const LOCK_WINDOW_MS = 60 * 60 * 1000; // 1 hour before kickoff
  const isGameLocked = countdown <= LOCK_WINDOW_MS;
  const isLive = countdown <= 0 && countdown > -105 * 60 * 1000; // within 105 min after kickoff
  const isFinished = match.homeScore !== null && match.awayScore !== null;
  const disabled = lockedByPhase || isGameLocked;

  function handleSelect(outcome: Outcome) {
    if (disabled) return;
    setSelected(outcome);
    onPredict?.(match.id, outcome);
    setJustPicked(true);
    setTimeout(() => setJustPicked(false), 350);
  }

  const comm = { home: match.communityHome, draw: match.communityDraw, away: match.communityAway };
  const odds = { home: match.oddsHome, draw: match.oddsDraw, away: match.oddsAway };
  const pct = showOdds ? odds : comm;

  const dominant: Outcome =
    pct.home >= pct.draw && pct.home >= pct.away ? "home"
    : pct.away >= pct.draw ? "away" : "draw";
  const tintIntensity = Math.max(0, (pct[dominant] - 40) / 60);
  const dominantTint =
    dominant === "home" ? `rgba(74,222,128,${tintIntensity * 0.07})`
    : dominant === "away" ? `rgba(248,113,113,${tintIntensity * 0.07})`
    : `rgba(252,211,77,${tintIntensity * 0.05})`;

  const buttons: { outcome: Outcome; label: string }[] = [
    { outcome: "home", label: match.homeTeam },
    { outcome: "draw", label: "Draw" },
    { outcome: "away", label: match.awayTeam },
  ];

  // Post-game result
  const actualOutcome: Outcome | null = isFinished
    ? match.homeScore! > match.awayScore! ? "home"
    : match.awayScore! > match.homeScore! ? "away"
    : "draw"
    : null;
  const isCorrect = isFinished && selected !== null && selected === actualOutcome;
  const isWrong   = isFinished && selected !== null && selected !== actualOutcome;

  const isMono = illustrationStyle === "mono";
  const cardBg = isMono ? "#F7F4EE" : "#1A2E1F";
  const cardBorder = isMono
    ? isCorrect ? "rgba(74,222,128,0.6)"
    : isWrong   ? "rgba(248,113,113,0.3)"
    : selected  ? "rgba(30,20,10,0.4)" : "#DDD9D0"
    : isCorrect ? "rgba(74,222,128,0.35)"
    : isWrong   ? "rgba(248,113,113,0.2)"
    : selected  ? "rgba(215,255,90,0.2)" : "#2C4832";

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: cardBg,
        backgroundImage: isMono ? "none" : `linear-gradient(135deg, ${dominantTint}, transparent 60%)`,
        border: `1px solid ${cardBorder}`,
        boxShadow: isCorrect
          ? isMono ? "0 4px 24px rgba(74,222,128,0.25)" : "0 0 0 1px rgba(74,222,128,0.15), 0 8px 32px rgba(74,222,128,0.15)"
          : isWrong
          ? isMono ? "0 4px 20px rgba(0,0,0,0.1)" : "0 2px 12px rgba(0,0,0,0.3)"
          : selected
          ? isMono ? "0 4px 20px rgba(0,0,0,0.15)" : "0 0 0 1px rgba(215,255,90,0.07), 0 8px 32px rgba(0,0,0,0.5)"
          : isMono ? "0 2px 8px rgba(0,0,0,0.08)" : "0 2px 12px rgba(0,0,0,0.3)",
        transform: justPicked ? "scale(0.997)" : "scale(1)",
        transition: "transform 0.15s ease, box-shadow 0.3s, border-color 0.3s",
      }}
    >
      {/* Illustration or placeholder */}
      {match.illustration ? (
        <div className="relative w-full overflow-hidden" style={{ height: "220px" }}>
          <img
            src={match.illustration}
            alt={`${match.homeTeam} vs ${match.awayTeam}`}
            className="w-full h-full object-cover"
            style={{
              objectPosition: "center 25%",
              filter: isMono ? "grayscale(1) contrast(1.3) brightness(1.05)" : "none",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ height: "80px", background: `linear-gradient(to bottom, transparent, ${isMono ? "#F7F4EE" : "#1A2E1F"})` }}
          />
          <StatusBadge countdown={countdown} isLive={isLive} isFinished={isFinished} isGameLocked={isGameLocked} lockedByPhase={lockedByPhase} match={match} overlay />
          {selected && <PickCorner outcome={selected} isCorrect={isCorrect} isWrong={isWrong} />}
        </div>
      ) : (
        <div className="relative">
          <IllustrationPlaceholder match={match} />
          <div className="absolute top-3 right-4">
            <StatusBadge countdown={countdown} isLive={isLive} isFinished={isFinished} isGameLocked={isGameLocked} lockedByPhase={lockedByPhase} match={match} overlay />
          </div>
          {selected && <PickCorner outcome={selected} isCorrect={isCorrect} isWrong={isWrong} />}
        </div>
      )}

      {/* Plain header row — only when no illustration */}
      {!match.illustration && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: `1px solid ${isMono ? "#E5E1D8" : "#1F3A24"}` }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isMono ? "#8A7A6A" : "#7A9B84" }}>
            {match.group}
          </span>
          <span className="text-[10px]" style={{ color: isMono ? "#A89E8E" : "#4A6B50" }}>
            {match.venue.split("·")[0].trim()}
          </span>
        </div>
      )}

      {/* Teams row */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {match.illustration && <span className="text-3xl leading-none flex-shrink-0">{match.homeFlag}</span>}
            <span className="font-black text-lg sm:text-xl uppercase tracking-tight leading-none truncate" style={{ color: isMono ? "#1A1208" : "#F0EDE6" }}>
              {match.homeTeam}
            </span>
          </div>
          <div className="flex-shrink-0 px-2">
            {isFinished ? (
              <span className="text-2xl font-black tabular-nums" style={{ color: isMono ? "#1A1208" : "#F0EDE6" }}>
                {match.homeScore}–{match.awayScore}
              </span>
            ) : (
              <span className="text-[10px] font-black tracking-widest" style={{ color: isMono ? "#C8C0B0" : "#2C4832" }}>VS</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end">
            <span className="font-black text-lg sm:text-xl uppercase tracking-tight leading-none truncate text-right" style={{ color: isMono ? "#1A1208" : "#F0EDE6" }}>
              {match.awayTeam}
            </span>
            {match.illustration && <span className="text-3xl leading-none flex-shrink-0">{match.awayFlag}</span>}
          </div>
        </div>
      </div>

      {/* Post-game result row */}
      {isFinished && selected && (
        <div className="flex items-center gap-2 px-4 pb-3">
          {isCorrect ? (
            <>
              <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: "#4ADE80" }}>✓ Correct</span>
              <span className="text-[10px]" style={{ color: isMono ? "#A89E8E" : "#4A6B50" }}>·</span>
              <span className="text-[10px] font-black" style={{ color: "#4ADE80" }}>+1 pt</span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: isMono ? "#A89E8E" : "#4A6B50" }}>✗ Wrong pick</span>
              <span className="text-[10px]" style={{ color: isMono ? "#C8C0B0" : "#2C4832" }}>·</span>
              <span className="text-[10px]" style={{ color: isMono ? "#C8C0B0" : "#2C4832" }}>
                {actualOutcome === "home" ? match.homeTeam : actualOutcome === "away" ? match.awayTeam : "Draw"} won
              </span>
            </>
          )}
        </div>
      )}

      {/* Time + venue */}
      {!isFinished && (
        <div className="flex items-center gap-1.5 px-4 pb-3 text-[10px]" style={{ color: isMono ? "#A89E8E" : "#4A6B50" }}>
          <span className="font-bold">
            {kickoff.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}
          </span>
          <span>·</span>
          <span className="truncate">{match.venue.split("·")[0].trim()}</span>
        </div>
      )}

      {/* Prediction buttons */}
      <div className="flex gap-1.5 px-4 pb-4">
        {buttons.map(({ outcome, label }) => {
          const isActive = selected === outcome;
          const col = OUTCOME_COLORS[outcome];
          return (
            <button
              key={outcome}
              onClick={() => handleSelect(outcome)}
              disabled={disabled}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all duration-200${!selected && !disabled ? " btn-unpicked" : ""}`}
              style={{
                backgroundColor: isActive ? col : "transparent",
                color: isActive ? "#0B1E0D" : disabled ? "#3A5A40" : "#7A9B84",
                border: `1.5px solid ${isActive ? col : disabled ? "#1F3A24" : "#2C4832"}`,
                cursor: disabled ? "default" : "pointer",
                boxShadow: isActive ? `0 0 14px ${col}44` : undefined,
                transform: isActive ? "translateY(-1px)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isActive) {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = col + "80";
                  el.style.color = col;
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isActive) {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = "#2C4832";
                  el.style.color = "#7A9B84";
                }
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Data section */}
      <div className="px-4 pb-5 pt-3" style={{ borderTop: `1px solid ${isMono ? "#E5E1D8" : "#1F3A24"}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isMono ? "#8A7A6A" : "#4A6B50" }}>
            {showOdds ? "Expected odds" : "Community picks"}
          </span>
          <button
            onClick={() => setShowOdds(v => !v)}
            className="text-[10px] font-bold hover:opacity-70 transition-opacity cursor-pointer"
            style={{ color: isMono ? "#8A7A6A" : "#7A9B84" }}
          >
            {showOdds ? "← Picks" : "Odds →"}
          </button>
        </div>

        <div className="flex items-end justify-between mb-2 gap-1">
          <div className="flex flex-col">
            <span className="font-black tabular-nums leading-none" style={{ fontSize: `${16 + (pct.home / 100) * 14}px`, color: "#4ADE80", opacity: pct.home < 20 ? 0.5 : 1 }}>
              {pct.home}%
            </span>
            <span className="text-[10px] mt-0.5" style={{ color: "#7A9B84" }}>{match.homeTeam.split(" ")[0]}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-black tabular-nums leading-none" style={{ fontSize: `${14 + (pct.draw / 100) * 10}px`, color: "#FCD34D", opacity: pct.draw < 15 ? 0.4 : 0.9 }}>
              {pct.draw}%
            </span>
            <span className="text-[10px] mt-0.5" style={{ color: "#7A9B84" }}>Draw</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-black tabular-nums leading-none" style={{ fontSize: `${16 + (pct.away / 100) * 14}px`, color: "#F87171", opacity: pct.away < 20 ? 0.5 : 1 }}>
              {pct.away}%
            </span>
            <span className="text-[10px] mt-0.5 text-right" style={{ color: "#7A9B84" }}>{match.awayTeam.split(" ")[0]}</span>
          </div>
        </div>

        <div className="flex rounded-full overflow-hidden gap-px" style={{ height: "8px", backgroundColor: "#0F2411" }}>
          <div className="rounded-l-full transition-all duration-700" style={{ width: `${pct.home}%`, backgroundColor: "#4ADE80", boxShadow: pct.home > 50 ? "2px 0 10px rgba(74,222,128,0.4)" : "none" }} />
          <div className="transition-all duration-700" style={{ width: `${pct.draw}%`, backgroundColor: "#FCD34D" }} />
          <div className="rounded-r-full transition-all duration-700" style={{ width: `${pct.away}%`, backgroundColor: "#F87171", boxShadow: pct.away > 50 ? "-2px 0 10px rgba(248,113,113,0.4)" : "none" }} />
        </div>
      </div>
    </div>
  );
}

// ── Pick corner triangle ──────────────────────────────────────────────────────
function PickCorner({ outcome, isCorrect, isWrong }: {
  outcome: Outcome; isCorrect: boolean; isWrong: boolean;
}) {
  const col = isWrong ? "rgba(248,113,113,0.55)" : OUTCOME_COLORS[outcome];
  const size = 56;
  return (
    <div className="absolute top-0 left-0" style={{ width: size, height: size, overflow: "hidden" }}>
      {/* Triangle via border trick */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: 0, height: 0,
        borderStyle: "solid",
        borderWidth: `${size}px ${size}px 0 0`,
        borderColor: `${col} transparent transparent transparent`,
      }} />
      {/* Icon centered in the top-left quadrant */}
      {isCorrect ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ position: "absolute", top: 7, left: 7 }}>
          <path d="M1.5 6L4.5 9L10.5 3" stroke="#0B1E0D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : isWrong ? (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ position: "absolute", top: 8, left: 8 }}>
          <path d="M2 2L8 8M8 2L2 8" stroke="#0B1E0D" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ position: "absolute", top: 7, left: 7 }}>
          <path d="M1.5 6L4.5 9L10.5 3" stroke="#0B1E0D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({
  countdown, isLive, isFinished, isGameLocked, lockedByPhase, match, overlay,
}: {
  countdown: number; isLive: boolean; isFinished: boolean;
  isGameLocked: boolean; lockedByPhase: boolean; match: Match; overlay?: boolean;
}) {
  const base = overlay
    ? "px-2 py-1 rounded-md text-[10px] font-bold"
    : "px-2 py-1 rounded-md text-[10px] font-bold";
  const bg = overlay ? "rgba(11,30,13,0.75)" : "transparent";

  if (isFinished) return null;

  if (lockedByPhase) return (
    <span className={base} style={{ backgroundColor: bg, color: "#4A6B50" }}>
      Phase locked
    </span>
  );

  if (isLive) return (
    <span className={base + " flex items-center gap-1"} style={{ backgroundColor: "rgba(74,222,128,0.15)", color: "#4ADE80", border: "1px solid rgba(74,222,128,0.3)" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse inline-block" />
      Live
    </span>
  );

  if (isGameLocked) return (
    <span className={base} style={{ backgroundColor: bg, color: "#7A9B84" }}>
      🔒 Locked · {match.time}
    </span>
  );

  // Open — show countdown only if less than 24h away
  const hoursLeft = countdown / (1000 * 60 * 60);
  if (hoursLeft < 24) return (
    <span className={base} style={{ backgroundColor: bg, color: "#D7FF5A" }}>
      Locks in {formatCountdown(countdown)}
    </span>
  );

  return (
    <span className={base} style={{ backgroundColor: bg, color: "#4A6B50" }}>
      {match.time}
    </span>
  );
}
