"use client";

import { useState, useEffect } from "react";
import type { Match, Outcome } from "@/lib/mock-data";

interface OnboardingModalProps {
  leagueName: string;
  firstMatch: Match;
  mono: boolean;
  onComplete: (matchId?: string, outcome?: Outcome, scoreHome?: number, scoreAway?: number) => void;
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
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");

  // Prevent background page from scrolling behind the modal
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Always dark — onboarding is a cinematic moment
  const bg      = "#0B1E0D";
  const deepBg  = "#0F2411";
  const border  = "#2C4832";
  const accent  = "#D7FF5A";
  const primary = "#F0EDE6";
  const secondary = "#7A9B84";
  const muted   = "#4A6B50";

  // Infer outcome from scores (mirrors MatchCard logic)
  useEffect(() => {
    if (scoreHome === "" || scoreAway === "") return;
    const h = parseInt(scoreHome);
    const a = parseInt(scoreAway);
    if (isNaN(h) || isNaN(a)) return;
    const implied: Outcome = h > a ? "home" : a > h ? "away" : "draw";
    setPicked(implied);
  }, [scoreHome, scoreAway]);

  function handlePick(outcome: Outcome) {
    setPicked(outcome);
    // Clear scores when switching outcome via button
    setScoreHome("");
    setScoreAway("");
  }

  function handleDone() {
    if (!picked) return;
    localStorage.setItem("quiniela_onboarded", "1");
    const h = parseInt(scoreHome);
    const a = parseInt(scoreAway);
    const hasScore = !isNaN(h) && !isNaN(a) && scoreHome !== "" && scoreAway !== "";
    onComplete(firstMatch.id, picked, hasScore ? h : undefined, hasScore ? a : undefined);
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
        <div className="absolute inset-0">
          <img
            src="/onboarding-trophy.png"
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 20%" }}
          />
        </div>
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: "60%", background: `linear-gradient(to bottom, transparent, ${bg} 50%)` }}
        />
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <div className="w-full max-w-lg px-6 pb-12 flex flex-col gap-5">
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
            <div className="flex gap-1.5">
              <div className="h-1.5 rounded-full" style={{ width: "20px", backgroundColor: accent }} />
              <div className="h-1.5 rounded-full" style={{ width: "6px", backgroundColor: border }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Pick result + optional score ──────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex flex-col"
      style={{ backgroundColor: bg }}
    >
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
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, rgba(11,30,13,0.3) 0%, ${bg} 55%)` }}
          />
        </>
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: deepBg }} />
      )}

      <div className="relative z-10 flex flex-col h-full justify-center">
        <div className="w-full max-w-lg mx-auto px-6 flex flex-col gap-5">
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

          <div className="h-px" style={{ backgroundColor: border }} />

          {/* Pick buttons */}
          <div className="flex flex-col gap-2">
            {buttons.map(({ outcome, label }) => {
              const isActive = picked === outcome;
              const col = OUTCOME_COLORS[outcome];
              return (
                <button
                  key={outcome}
                  onClick={() => handlePick(outcome)}
                  className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest transition-all duration-200 cursor-pointer"
                  style={{
                    fontSize: "13px",
                    backgroundColor: isActive ? col : "transparent",
                    color: isActive ? "#0B1E0D" : col,
                    border: `2px solid ${isActive ? col : col + "55"}`,
                    boxShadow: isActive ? `0 0 28px ${col}44` : undefined,
                    opacity: picked && !isActive ? 0.3 : 1,
                    transform: isActive ? "scale(1.01)" : "scale(1)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Score prediction — shown after a pick */}
          {picked && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: `1px solid ${border}`,
              }}
            >
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: secondary }}>
                  Score prediction
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                  Optional — worth an extra 2 pts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <style>{`
                  .ob-score-input {
                    width: 44px; height: 44px; text-align: center; font-family: inherit;
                    font-weight: 900; font-size: 16px; border-radius: 10px;
                    background: #0F2411; border: 1px solid #2C4832;
                    color: #F0EDE6; outline: none; appearance: none;
                    transition: border-color 0.15s;
                  }
                  .ob-score-input:focus { border-color: #D7FF5A; }
                `}</style>
                <input
                  type="number" min="0" max="20"
                  value={scoreHome}
                  onChange={(e) => setScoreHome(e.target.value)}
                  placeholder="0"
                  className="ob-score-input"
                />
                <span className="font-black text-sm" style={{ color: muted }}>—</span>
                <input
                  type="number" min="0" max="20"
                  value={scoreAway}
                  onChange={(e) => setScoreAway(e.target.value)}
                  placeholder="0"
                  className="ob-score-input"
                />
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleDone}
            disabled={!picked}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all cursor-pointer"
            style={{
              backgroundColor: picked ? accent : border,
              color: picked ? "#0B1E0D" : muted,
              opacity: picked ? 1 : 0.5,
              cursor: picked ? "pointer" : "default",
            }}
          >
            {picked ? "Save pick →" : "Pick a result first"}
          </button>

          <div className="flex gap-1.5">
            <div className="h-1.5 rounded-full" style={{ width: "6px", backgroundColor: border }} />
            <div className="h-1.5 rounded-full" style={{ width: "20px", backgroundColor: accent }} />
          </div>
        </div>
      </div>
    </div>
  );
}
