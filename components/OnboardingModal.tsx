"use client";

import { useState } from "react";
import type { Match, Outcome } from "@/lib/mock-data";

interface OnboardingModalProps {
  leagueName: string;
  firstMatch: Match;
  mono: boolean;
  onComplete: (matchId?: string, outcome?: Outcome) => void;
}

const OUTCOME_COLORS: Record<Outcome, string> = {
  home: "#4ADE80",
  draw: "#FCD34D",
  away: "#F87171",
};

export default function OnboardingModal({
  leagueName,
  firstMatch,
  mono,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [picked, setPicked] = useState<Outcome | null>(null);

  // Always dark — onboarding is a cinematic moment
  const bg      = "#0B1E0D";
  const deepBg  = "#0F2411";
  const border  = "#2C4832";
  const accent  = "#D7FF5A";
  const primary = "#F0EDE6";
  const secondary = "#7A9B84";
  const muted   = "#4A6B50";

  function dismiss(matchId?: string, outcome?: Outcome) {
    localStorage.setItem("quiniela_onboarded", "1");
    onComplete(matchId, outcome);
  }

  function handlePick(outcome: Outcome) {
    if (picked) return;
    setPicked(outcome);
    setTimeout(() => dismiss(firstMatch.id, outcome), 700);
  }

  const buttons: { outcome: Outcome; label: string }[] = [
    { outcome: "home", label: firstMatch.homeTeam },
    { outcome: "draw", label: "Draw" },
    { outcome: "away", label: firstMatch.awayTeam },
  ];

  if (step === 1) {
    return (
      <div
        className="fixed inset-0 z-50 overflow-hidden"
        style={{ backgroundColor: deepBg }}
      >
        {/* Trophy — full-bleed background */}
        <div className="absolute inset-0">
          <img
            src="/onboarding-trophy.png"
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 20%" }}
          />
        </div>

        {/* Gradient: transparent top → solid bg at bottom */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: "60%", background: `linear-gradient(to bottom, transparent, ${bg} 50%)` }}
        />

        {/* Content — bottom, constrained width */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <div className="w-full max-w-lg px-6 pb-12 flex flex-col gap-5">
            {/* League pill */}
            <div>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
                style={{ color: secondary, borderColor: border }}
              >
                {leagueName}
              </span>
            </div>

            <div>
              <h1
                className="font-black uppercase leading-none tracking-tight mb-3"
                style={{ color: primary, fontSize: "clamp(2.8rem, 8vw, 4rem)" }}
              >
                Predict.<br />
                Compete.<br />
                <span style={{ color: accent }}>Win.</span>
              </h1>
              <p className="text-sm max-w-sm" style={{ color: secondary }}>
                Pick the result of every match and beat your friends to the top of the table.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent, color: "#0B1E0D", maxWidth: "480px" }}
            >
              Let's go →
            </button>

            {/* Step dots */}
            <div className="flex gap-1.5">
              <div className="h-1.5 rounded-full" style={{ width: "20px", backgroundColor: accent }} />
              <div className="h-1.5 rounded-full" style={{ width: "6px", backgroundColor: border }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Who wins? ─────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex flex-col"
      style={{ backgroundColor: bg }}
    >
      {/* Match illustration as full-bleed background */}
      {firstMatch.illustration ? (
        <>
          <div className="absolute inset-0">
            <img
              src={firstMatch.illustration}
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 20%", opacity: 0.55 }}
            />
          </div>
          {/* Gradient over illustration */}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, rgba(11,30,13,0.3) 0%, ${bg} 55%)` }}
          />
        </>
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: deepBg }} />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full justify-center">
        <div className="w-full max-w-lg mx-auto px-6 flex flex-col gap-6">
          {/* Label + heading */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: muted }}>
              Your first pick
            </p>
            <h1
              className="font-black uppercase leading-none tracking-tight"
              style={{ color: primary, fontSize: "clamp(2.2rem, 8vw, 3.5rem)" }}
            >
              Who wins?
            </h1>
          </div>

          {/* Team flags */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <span style={{ fontSize: "clamp(52px, 10vw, 72px)", lineHeight: 1 }}>{firstMatch.homeFlag}</span>
              <span className="text-xs font-black uppercase tracking-wide" style={{ color: secondary }}>
                {firstMatch.homeTeam.split(" ")[0]}
              </span>
            </div>
            <span className="text-sm font-black" style={{ color: muted }}>vs</span>
            <div className="flex flex-col items-center gap-2">
              <span style={{ fontSize: "clamp(52px, 10vw, 72px)", lineHeight: 1 }}>{firstMatch.awayFlag}</span>
              <span className="text-xs font-black uppercase tracking-wide" style={{ color: secondary }}>
                {firstMatch.awayTeam.split(" ")[0]}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px" style={{ backgroundColor: border }} />

          {/* Pick buttons */}
          <div className="flex flex-col gap-2.5">
            {buttons.map(({ outcome, label }) => {
              const isActive = picked === outcome;
              const col = OUTCOME_COLORS[outcome];
              return (
                <button
                  key={outcome}
                  onClick={() => handlePick(outcome)}
                  className="w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all duration-200 cursor-pointer"
                  style={{
                    fontSize: "13px",
                    backgroundColor: isActive ? col : "transparent",
                    color: isActive ? "#0B1E0D" : col,
                    border: `2px solid ${isActive ? col : col + "55"}`,
                    boxShadow: isActive ? `0 0 28px ${col}44` : undefined,
                    opacity: picked && !isActive ? 0.25 : 1,
                    transform: isActive ? "scale(1.01)" : "scale(1)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <p className="text-xs" style={{ color: muted }}>
            This pick counts for real — change it anytime before the deadline.
          </p>

          {/* Step dots */}
          <div className="flex gap-1.5">
            <div className="h-1.5 rounded-full" style={{ width: "6px", backgroundColor: border }} />
            <div className="h-1.5 rounded-full" style={{ width: "20px", backgroundColor: accent }} />
          </div>
        </div>
      </div>
    </div>
  );
}
