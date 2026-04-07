"use client";

import { useEffect } from "react";

interface OnboardingModalProps {
  leagueName: string;
  currentUserId: string;
  onComplete: () => void;
}

export default function OnboardingModal({ leagueName, currentUserId, onComplete }: OnboardingModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const bg     = "#0B1E0D";
  const deepBg = "#0F2411";
  const border = "#2C4832";
  const accent = "#D7FF5A";
  const primary = "#F0EDE6";
  const secondary = "#7A9B84";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ backgroundColor: deepBg }}>
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
              className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border"
              style={{ color: accent, borderColor: "rgba(215,255,90,0.4)", backgroundColor: "rgba(215,255,90,0.1)" }}
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
            onClick={() => {
              localStorage.setItem(`quiniela_onboarded_${currentUserId}`, "1");
              onComplete();
            }}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent, color: "#0B1E0D", maxWidth: "480px" }}
          >
            Let's go →
          </button>
        </div>
      </div>
    </div>
  );
}
