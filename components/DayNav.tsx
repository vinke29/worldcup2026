"use client";

import { useEffect, useRef } from "react";

export interface Day {
  date: string;
  matchCount: number;
  hasPast: boolean;
  hasLive: boolean;
}

interface DayNavProps {
  days: Day[];
  activeDay: string;
  onSelect: (date: string) => void;
  mono?: boolean;
}

export default function DayNav({ days, activeDay, onSelect, mono = false }: DayNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector("[data-active='true']") as HTMLElement;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeDay]);

  return (
    <div
      className="border-b"
      style={{
        borderColor: mono ? "#DDD9D0" : "#1F3A24",
        backgroundColor: mono ? "#EDE8E0" : "#0F2411",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-1 py-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {days.map((day) => {
            const isActive = day.date === activeDay;
            return (
              <button
                key={day.date}
                data-active={isActive}
                onClick={() => onSelect(day.date)}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                style={{
                  backgroundColor: isActive
                    ? mono ? "#D8D2C8" : "#1A2E1F"
                    : "transparent",
                  border: `1px solid ${isActive ? (mono ? "#C8C0B0" : "#2C4832") : "transparent"}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  {day.hasLive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                      style={{ backgroundColor: "#4ADE80" }}
                    />
                  )}
                  <span
                    className="text-xs font-bold whitespace-nowrap"
                    style={{
                      color: isActive
                        ? mono ? "#1A1208" : "#F0EDE6"
                        : day.hasPast
                        ? mono ? "#A09080" : "#4A6B50"
                        : mono ? "#6B5E4E" : "#7A9B84",
                    }}
                  >
                    {day.date}
                  </span>
                </div>
                <span
                  className="text-[9px] font-medium whitespace-nowrap"
                  style={{ color: isActive ? (mono ? "#6B5E4E" : "#7A9B84") : (mono ? "#A09080" : "#4A6B50") }}
                >
                  {day.matchCount} {day.matchCount === 1 ? "match" : "matches"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
