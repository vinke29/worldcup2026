"use client";

import { useMemo } from "react";
import { MATCHES } from "@/lib/mock-data";
import { computeGroupTables } from "@/lib/group-standings";

interface QualifiersViewProps {
  scorePicks: Record<string, { home: number; away: number }>;
  mono: boolean;
}

const GROUP_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export default function QualifiersView({ scorePicks, mono }: QualifiersViewProps) {
  const t = mono
    ? { card: "#EDE8DE", border: "#DDD9D0", text: "#1A1208", textSec: "#6B5E4E", textMuted: "#A89E8E", accent: "#1A1208", accentText: "#F7F4EE", first: "rgba(26,18,8,0.12)", second: "rgba(26,18,8,0.06)" }
    : { card: "#1A2E1F", border: "#2C4832", text: "#F0EDE6", textSec: "#B3C9B7", textMuted: "#7A9B84", accent: "#D7FF5A", accentText: "#0B1E0D", first: "rgba(215,255,90,0.10)", second: "rgba(215,255,90,0.04)" };

  const predicted = useMemo(() => computeGroupTables(MATCHES, scorePicks, false), [scorePicks]);
  const actual    = useMemo(() => computeGroupTables(MATCHES, scorePicks, true),  []);

  const groups = GROUP_LETTERS.map((letter) => {
    const key = `Group ${letter}`;
    return {
      letter,
      predicted: predicted[key] ?? [],
      actual: actual[key] ?? [],
    };
  });

  // Pair groups for the bracket: A vs B, C vs D, etc.
  const pairs = [
    ["A","B"], ["C","D"], ["E","F"], ["G","H"], ["I","J"], ["K","L"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: t.textMuted }}>
          Predicted qualifiers
        </p>
        <p className="text-xs" style={{ color: t.textSec }}>
          Top 2 from each group based on your picks. 3rd-place spots TBD.
        </p>
      </div>

      <div className="space-y-3">
        {pairs.map(([a, b]) => (
          <BracketRow
            key={a + b}
            groupA={groups.find(g => g.letter === a)!}
            groupB={groups.find(g => g.letter === b)!}
            mono={mono}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function BracketRow({
  groupA, groupB, mono, t,
}: {
  groupA: { letter: string; predicted: ReturnType<typeof computeGroupTables>[string]; actual: ReturnType<typeof computeGroupTables>[string] };
  groupB: { letter: string; predicted: ReturnType<typeof computeGroupTables>[string]; actual: ReturnType<typeof computeGroupTables>[string] };
  mono: boolean;
  t: Record<string, string>;
}) {
  const a1 = groupA.predicted[0];
  const a2 = groupA.predicted[1];
  const b1 = groupB.predicted[0];
  const b2 = groupB.predicted[1];

  const aa1 = groupA.actual[0];
  const ab1 = groupB.actual[0];

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: t.card, borderColor: t.border }}
    >
      {/* Group headers */}
      <div className="grid grid-cols-2 border-b" style={{ borderColor: t.border }}>
        <div className="px-4 py-2 border-r" style={{ borderColor: t.border }}>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>Group {groupA.letter}</span>
        </div>
        <div className="px-4 py-2">
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>Group {groupB.letter}</span>
        </div>
      </div>

      {/* Team rows */}
      <div className="grid grid-cols-2">
        {/* Group A qualifiers */}
        <div className="border-r" style={{ borderColor: t.border }}>
          <TeamSlot team={a1} rank={1} actual={aa1} mono={mono} t={t} />
          <div style={{ height: 1, backgroundColor: t.border }} />
          <TeamSlot team={a2} rank={2} actual={undefined} mono={mono} t={t} />
        </div>

        {/* Group B qualifiers */}
        <div>
          <TeamSlot team={b1} rank={1} actual={ab1} mono={mono} t={t} />
          <div style={{ height: 1, backgroundColor: t.border }} />
          <TeamSlot team={b2} rank={2} actual={undefined} mono={mono} t={t} />
        </div>
      </div>
    </div>
  );
}

function TeamSlot({
  team, rank, actual, mono, t,
}: {
  team: { team: string; flag: string; pts: number } | undefined;
  rank: 1 | 2;
  actual: { team: string } | undefined;
  mono: boolean;
  t: Record<string, string>;
}) {
  if (!team) {
    return (
      <div className="px-3 py-3 flex items-center gap-2">
        <span className="text-[10px] font-black" style={{ color: t.textMuted }}>{rank}</span>
        <span className="text-xs" style={{ color: t.textMuted }}>—</span>
      </div>
    );
  }

  const matchesActual = actual ? actual.team === team.team : null;

  return (
    <div
      className="px-3 py-3 flex items-center gap-2"
      style={{ backgroundColor: rank === 1 ? t.first : t.second }}
    >
      <span
        className="text-[10px] font-black w-3 flex-shrink-0"
        style={{ color: rank === 1 ? t.accent : t.textMuted }}
      >
        {rank}
      </span>
      <span className="text-sm leading-none flex-shrink-0">{team.flag}</span>
      <span className="text-xs font-semibold truncate flex-1" style={{ color: t.text }}>
        {team.team}
      </span>
      {matchesActual !== null && (
        <span className="text-[10px] flex-shrink-0" style={{ color: matchesActual ? "#4ADE80" : "#F87171" }}>
          {matchesActual ? "✓" : "✗"}
        </span>
      )}
      <span className="text-[10px] font-bold flex-shrink-0" style={{ color: t.textMuted }}>
        {team.pts}p
      </span>
    </div>
  );
}
