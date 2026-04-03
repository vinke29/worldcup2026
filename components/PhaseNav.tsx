"use client";

import type { Phase, PhaseId } from "@/lib/mock-data";

interface PhaseNavProps {
  phases: Phase[];
  activePhase: PhaseId;
  onSelect: (phase: PhaseId) => void;
  mono?: boolean;
}

export default function PhaseNav({ phases, activePhase, onSelect, mono = false }: PhaseNavProps) {
  return (
    <div
      className="sticky top-14 z-40 border-b"
      style={{
        backgroundColor: mono ? "rgba(245,240,232,0.97)" : "rgba(11,30,13,0.95)",
        borderColor: mono ? "#DDD9D0" : "#2C4832",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div
          className="flex overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {phases.map((phase) => {
            const isActive = phase.id === activePhase;
            const isLocked = phase.status === "locked";
            const isOpen = phase.status === "open";

            const color = isActive
              ? mono ? "#1A1208" : "#D7FF5A"
              : isLocked
              ? mono ? "#B0A090" : "#4A6B50"
              : mono ? "#6B5E4E" : "#7A9B84";

            return (
              <button
                key={phase.id}
                onClick={() => onSelect(phase.id)}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-3 border-b-2 transition-all duration-150 cursor-pointer"
                style={{
                  borderBottomColor: isActive ? (mono ? "#1A1208" : "#D7FF5A") : "transparent",
                  color,
                }}
              >
                <div className="flex items-center gap-1.5">
                  {isLocked && (
                    <svg width="8" height="9" viewBox="0 0 8 9" fill="none" className="opacity-60">
                      <rect x="0.5" y="3.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.1" />
                      <path d="M2 3.5V2.5a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    </svg>
                  )}
                  {isOpen && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                      style={{ backgroundColor: "#4ADE80" }}
                    />
                  )}
                  <span className="text-xs font-bold whitespace-nowrap tracking-wide">
                    {phase.shortLabel}
                  </span>
                </div>
                {isOpen && (
                  <span className="text-[9px] font-medium whitespace-nowrap" style={{ color: mono ? "#8A7A6A" : "#7A9B84" }}>
                    Due {phase.deadline}
                  </span>
                )}
                {isLocked && (
                  <span className="text-[9px] whitespace-nowrap" style={{ color: mono ? "#B0A090" : "#4A6B50" }}>
                    {phase.matchCount} matches
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
