"use client";

import { useState, useMemo, useEffect } from "react";
import type { Match, LeagueMode } from "@/lib/mock-data";
import { computeGroupTables, rankThirdPlaceTeams, type TeamRow } from "@/lib/group-standings";
import { resolveBracketTeams, TOP_R32_IDS, BOT_R32_IDS, R16_IDS, QF_IDS, SF_IDS, FINAL_ID, KNOCKOUT_MATCH_META } from "@/lib/bracket";
import type { ScoreEntry } from "@/lib/bracket";
import FlagImage from "@/lib/flag-image";

interface QualifiersViewProps {
  matches: Match[];
  scorePicks: Record<string, ScoreEntry>;
  actualScores: Record<string, ScoreEntry>;
  mono: boolean;
  mode?: LeagueMode;
  onScorePick?: (matchId: string, home: number, away: number, pens?: "home" | "away") => void;
}

// ── Layout constants ──────────────────────────────────────────────────────────
const COL_GAP = 28;
const SLOTS   = 8;
const SLOT_H  = 60;
const HALF_H  = SLOTS * SLOT_H;
const TOTAL_H = 2 * HALF_H;
const ROUNDS  = 4;
const POD_H   = 48;

function slotHeight(r: number) { return SLOT_H * Math.pow(2, r); }
function podTop(r: number, i: number) { const sh = slotHeight(r); return i * sh + (sh - POD_H) / 2; }
function podCenter(r: number, i: number) { return podTop(r, i) + POD_H / 2; }

// ── Bracket slot types ────────────────────────────────────────────────────────
type WinnerSlot   = { kind: "winner";  group: string };
type RunnerUpSlot = { kind: "runner";  group: string };
type ThirdSlot    = { kind: "third";   eligible: string[] };
type BracketSlot  = WinnerSlot | RunnerUpSlot | ThirdSlot;
interface R32Match { id: string; home: BracketSlot; away: BracketSlot }

const TOP_R32: R32Match[] = [
  { id: "m74", home: { kind: "winner", group: "E" },  away: { kind: "third",  eligible: ["A","B","C","D","F"] } },
  { id: "m77", home: { kind: "winner", group: "I" },  away: { kind: "third",  eligible: ["C","D","F","G","H"] } },
  { id: "m73", home: { kind: "runner", group: "A" },  away: { kind: "runner", group: "B" } },
  { id: "m75", home: { kind: "winner", group: "F" },  away: { kind: "runner", group: "C" } },
  { id: "m83", home: { kind: "runner", group: "K" },  away: { kind: "runner", group: "L" } },
  { id: "m84", home: { kind: "winner", group: "H" },  away: { kind: "runner", group: "J" } },
  { id: "m81", home: { kind: "winner", group: "D" },  away: { kind: "third",  eligible: ["B","E","F","I","J"] } },
  { id: "m82", home: { kind: "winner", group: "G" },  away: { kind: "third",  eligible: ["A","E","H","I","J"] } },
];
const BOTTOM_R32: R32Match[] = [
  { id: "m76", home: { kind: "winner", group: "C" },  away: { kind: "runner", group: "F" } },
  { id: "m78", home: { kind: "runner", group: "E" },  away: { kind: "runner", group: "I" } },
  { id: "m79", home: { kind: "winner", group: "A" },  away: { kind: "third",  eligible: ["C","E","F","H","I"] } },
  { id: "m80", home: { kind: "winner", group: "L" },  away: { kind: "third",  eligible: ["E","H","I","J","K"] } },
  { id: "m86", home: { kind: "winner", group: "J" },  away: { kind: "runner", group: "H" } },
  { id: "m88", home: { kind: "runner", group: "D" },  away: { kind: "runner", group: "G" } },
  { id: "m85", home: { kind: "winner", group: "B" },  away: { kind: "third",  eligible: ["E","F","G","I","J"] } },
  { id: "m87", home: { kind: "winner", group: "K" },  away: { kind: "third",  eligible: ["D","E","I","J","L"] } },
];
const THIRD_SLOTS: Array<{ matchId: string; eligible: string[] }> = [
  { matchId: "m74", eligible: ["A","B","C","D","F"] },
  { matchId: "m77", eligible: ["C","D","F","G","H"] },
  { matchId: "m79", eligible: ["C","E","F","H","I"] },
  { matchId: "m80", eligible: ["E","H","I","J","K"] },
  { matchId: "m81", eligible: ["B","E","F","I","J"] },
  { matchId: "m82", eligible: ["A","E","H","I","J"] },
  { matchId: "m85", eligible: ["E","F","G","I","J"] },
  { matchId: "m87", eligible: ["D","E","I","J","L"] },
];

function assignThirdPlaceGroups(qualifyingGroups: string[]): Record<string, string> {
  const assignment: Record<string, string> = {};
  const used = new Set<string>();
  function bt(idx: number): boolean {
    if (idx === THIRD_SLOTS.length) return true;
    const slot = THIRD_SLOTS[idx];
    for (const g of qualifyingGroups) {
      if (used.has(g) || !slot.eligible.includes(g)) continue;
      assignment[slot.matchId] = g;
      used.add(g);
      if (bt(idx + 1)) return true;
      delete assignment[slot.matchId];
      used.delete(g);
    }
    return false;
  }
  bt(0);
  return assignment;
}

function useTheme(mono: boolean) {
  return mono
    ? { card: "#EDE8DE", border: "#DDD9D0", text: "#1A1208", textSec: "#6B5E4E", textMuted: "#A89E8E",
        accent: "#1A1208", accentText: "#F7F4EE", connector: "#C8C0B0", finalBg: "rgba(26,18,8,0.06)",
        halfDivider: "#E5E1D8" }
    : { card: "#1A2E1F", border: "#2C4832", text: "#F0EDE6", textSec: "#B3C9B7", textMuted: "#7A9B84",
        accent: "#D7FF5A", accentText: "#0B1E0D", connector: "#2C4832", finalBg: "rgba(215,255,90,0.06)",
        halfDivider: "#1F3A24" };
}

function slotLabel(slot: BracketSlot, assignedGroup?: string): string {
  if (slot.kind === "winner")  return `1${slot.group}`;
  if (slot.kind === "runner")  return `2${slot.group}`;
  return assignedGroup ? `3${assignedGroup}` : "3rd";
}

function resolveTeam(
  slot: BracketSlot,
  tables: Record<string, TeamRow[]>,
  matchId: string,
  thirdMap: Record<string, TeamRow | null>,
): TeamRow | null {
  if (slot.kind === "winner")  return tables[`Group ${slot.group}`]?.[0] ?? null;
  if (slot.kind === "runner")  return tables[`Group ${slot.group}`]?.[1] ?? null;
  return thirdMap[matchId] ?? null;
}

// ── SVG connector paths ───────────────────────────────────────────────────────
function halfConnectors(yOffset: number, round: number, colX: number[], podW: number): string[] {
  const paths: string[] = [];
  const count = SLOTS / Math.pow(2, round);
  const x1 = colX[round] + podW;
  const x2 = colX[round + 1];
  const midX = (x1 + x2) / 2;
  for (let i = 0; i < count; i += 2) {
    const y1 = yOffset + podCenter(round, i);
    const y2 = yOffset + podCenter(round, i + 1);
    const yn = yOffset + podCenter(round + 1, i / 2);
    paths.push(`M ${x1} ${y1} H ${midX} V ${yn} H ${x2}`);
    paths.push(`M ${x1} ${y2} H ${midX} V ${yn} H ${x2}`);
  }
  return paths;
}

function buildFinalConnectors(colX: number[], finalX: number, podW: number): string[] {
  const sfRightX   = colX[3] + podW;
  const midX       = (sfRightX + finalX) / 2;
  const topSFY     = podCenter(3, 0);
  const botSFY     = HALF_H + podCenter(3, 0);
  const finalTopY  = HALF_H - POD_H / 2 + POD_H * 0.25;
  const finalBotY  = HALF_H - POD_H / 2 + POD_H * 0.75;
  return [
    `M ${sfRightX} ${topSFY} H ${midX} V ${finalTopY} H ${finalX}`,
    `M ${sfRightX} ${botSFY} H ${midX} V ${finalBotY} H ${finalX}`,
  ];
}

type MobileRound = "r32" | "r16" | "qf" | "sf" | "final";

const ROUND_PICK_IDS: Record<MobileRound, string[]> = {
  r32:   [...TOP_R32_IDS, ...BOT_R32_IDS],
  r16:   R16_IDS,
  qf:    QF_IDS,
  sf:    SF_IDS,
  final: [FINAL_ID],
};
const NEXT_ROUND: Record<MobileRound, MobileRound | null> = {
  r32: "r16", r16: "qf", qf: "sf", sf: "final", final: null,
};
const ROUND_LABEL: Record<MobileRound, string> = {
  r32: "R32", r16: "R16", qf: "QF", sf: "Semi-finals", final: "Final",
};

// ── Main component ────────────────────────────────────────────────────────────
export default function QualifiersView({ matches, scorePicks, actualScores, mono, mode = "phase_by_phase", onScorePick }: QualifiersViewProps) {
  const hasActual = useMemo(() => matches.some(m => m.homeScore !== null), [matches]);
  const defaultView = hasActual ? "compare" : "predicted";
  const [view, setView] = useState<"predicted" | "actual" | "compare">(defaultView);
  const [mobileRound, setMobileRound] = useState<MobileRound>("r32");
  const [dismissedRounds, setDismissedRounds] = useState<Set<MobileRound>>(new Set());
  const t = useTheme(mono);

  // In entire_tournament mode with onScorePick, show score pickers and use wider pods
  const showPickers = mode === "entire_tournament" && !!onScorePick;

  // Dynamic layout based on whether pickers are shown
  const POD_W    = showPickers ? 168 : 132;
  const colX     = Array.from({ length: ROUNDS }, (_, r) => r * (POD_W + COL_GAP));
  const finalX   = ROUNDS * (POD_W + COL_GAP);
  const totalWidth = finalX + POD_W;

  const predictedTables = useMemo(() => computeGroupTables(matches, scorePicks, false), [matches, scorePicks]);
  const actualTables    = useMemo(() => computeGroupTables(matches, scorePicks, true), [matches]);
  const tables = view === "actual" ? actualTables : predictedTables;

  const thirdMap = useMemo(() => {
    const ranked  = rankThirdPlaceTeams(tables);
    const top8    = ranked.slice(0, 8);
    const byGroup: Record<string, TeamRow> = {};
    for (const { group, row } of ranked) byGroup[group] = row;
    const qualGroups  = top8.map(t => t.group);
    const groupAssign = assignThirdPlaceGroups(qualGroups);
    const result: Record<string, TeamRow | null> = {};
    for (const { matchId } of THIRD_SLOTS) {
      const g = groupAssign[matchId];
      result[matchId] = g ? (byGroup[g] ?? null) : null;
    }
    return result;
  }, [tables]);

  const thirdGroupAssign = useMemo(() => {
    const ranked = rankThirdPlaceTeams(tables);
    const top8   = ranked.slice(0, 8);
    return assignThirdPlaceGroups(top8.map(t => t.group));
  }, [tables]);

  const topR32Pairs = useMemo(() =>
    TOP_R32.map(m => ({
      home: resolveTeam(m.home, tables, m.id, thirdMap),
      away: resolveTeam(m.away, tables, m.id, thirdMap),
    })), [tables, thirdMap]);
  const botR32Pairs = useMemo(() =>
    BOTTOM_R32.map(m => ({
      home: resolveTeam(m.home, tables, m.id, thirdMap),
      away: resolveTeam(m.away, tables, m.id, thirdMap),
    })), [tables, thirdMap]);

  // Bracket propagated from actual scores (for "actual" view)
  const bracketTeams = useMemo(
    () => resolveBracketTeams(topR32Pairs, botR32Pairs, actualScores),
    [topR32Pairs, botR32Pairs, actualScores]
  );

  // Bracket propagated from user's score picks (for entire_tournament "predicted" view)
  const predictedBracketTeams = useMemo(
    () => resolveBracketTeams(topR32Pairs, botR32Pairs, scorePicks),
    [topR32Pairs, botR32Pairs, scorePicks]
  );

  // Match lists for mobile picker — grouped as pairs that feed the same next-round slot
  type MobileMatch = { id: string; homeTeam: TeamRow | null; awayTeam: TeamRow | null; homeLabel: string; awayLabel: string };
  type MobileGroup = { nextRoundLabel: string; matches: MobileMatch[] };

  const mobileGroups = useMemo((): Record<MobileRound, MobileGroup[]> => {
    const r32flat = [
      ...TOP_R32.map((m, i) => ({
        id: m.id, homeTeam: topR32Pairs[i].home, awayTeam: topR32Pairs[i].away,
        homeLabel: slotLabel(m.home, m.home.kind === "third" ? thirdGroupAssign[m.id] : undefined),
        awayLabel: slotLabel(m.away, m.away.kind === "third" ? thirdGroupAssign[m.id] : undefined),
      })),
      ...BOTTOM_R32.map((m, i) => ({
        id: m.id, homeTeam: botR32Pairs[i].home, awayTeam: botR32Pairs[i].away,
        homeLabel: slotLabel(m.home, m.home.kind === "third" ? thirdGroupAssign[m.id] : undefined),
        awayLabel: slotLabel(m.away, m.away.kind === "third" ? thirdGroupAssign[m.id] : undefined),
      })),
    ];
    // Pair R32 matches by R16 destination (every 2 consecutive share an R16 slot)
    const r32: MobileGroup[] = Array.from({ length: 8 }, (_, i) => ({
      nextRoundLabel: `→ R16 Match ${i + 1}`,
      matches: [r32flat[i * 2], r32flat[i * 2 + 1]],
    }));

    const r16flat: MobileMatch[] = [
      ...predictedBracketTeams.r16Top.map((p, i) => ({ id: R16_IDS[i],   homeTeam: p.home, awayTeam: p.away, homeLabel: "", awayLabel: "" })),
      ...predictedBracketTeams.r16Bot.map((p, i) => ({ id: R16_IDS[4+i], homeTeam: p.home, awayTeam: p.away, homeLabel: "", awayLabel: "" })),
    ];
    const r16: MobileGroup[] = Array.from({ length: 4 }, (_, i) => ({
      nextRoundLabel: `→ QF Match ${i + 1}`,
      matches: [r16flat[i * 2], r16flat[i * 2 + 1]],
    }));

    const qfflat: MobileMatch[] = [
      ...predictedBracketTeams.qfTop.map((p, i) => ({ id: QF_IDS[i],   homeTeam: p.home, awayTeam: p.away, homeLabel: "", awayLabel: "" })),
      ...predictedBracketTeams.qfBot.map((p, i) => ({ id: QF_IDS[2+i], homeTeam: p.home, awayTeam: p.away, homeLabel: "", awayLabel: "" })),
    ];
    const qf: MobileGroup[] = Array.from({ length: 2 }, (_, i) => ({
      nextRoundLabel: `→ Semi-final ${i + 1}`,
      matches: [qfflat[i * 2], qfflat[i * 2 + 1]],
    }));

    const sf: MobileGroup[] = [{
      nextRoundLabel: "→ Final",
      matches: [
        { id: SF_IDS[0], homeTeam: predictedBracketTeams.sfTop.home, awayTeam: predictedBracketTeams.sfTop.away, homeLabel: "", awayLabel: "" },
        { id: SF_IDS[1], homeTeam: predictedBracketTeams.sfBot.home, awayTeam: predictedBracketTeams.sfBot.away, homeLabel: "", awayLabel: "" },
      ],
    }];

    const final: MobileGroup[] = [{
      nextRoundLabel: "",
      matches: [{ id: FINAL_ID, homeTeam: predictedBracketTeams.final.home, awayTeam: predictedBracketTeams.final.away, homeLabel: "", awayLabel: "" }],
    }];

    return { r32, r16, qf, sf, final };
  }, [topR32Pairs, botR32Pairs, predictedBracketTeams, thirdGroupAssign]);

  // For compare: actual R32 teams overlaid on predicted bracket
  const actualThirdMap = useMemo(() => {
    const ranked  = rankThirdPlaceTeams(actualTables);
    const top8    = ranked.slice(0, 8);
    const byGroup: Record<string, TeamRow> = {};
    for (const { group, row } of ranked) byGroup[group] = row;
    const qualGroups  = top8.map(t => t.group);
    const groupAssign = assignThirdPlaceGroups(qualGroups);
    const result: Record<string, TeamRow | null> = {};
    for (const { matchId } of THIRD_SLOTS) {
      const g = groupAssign[matchId];
      result[matchId] = g ? (byGroup[g] ?? null) : null;
    }
    return result;
  }, [actualTables]);

  const actualR32ByMatchId = useMemo(() => {
    const map: Record<string, { home: TeamRow | null; away: TeamRow | null }> = {};
    for (const m of TOP_R32) {
      map[m.id] = {
        home: resolveTeam(m.home, actualTables, m.id, actualThirdMap),
        away: resolveTeam(m.away, actualTables, m.id, actualThirdMap),
      };
    }
    for (const m of BOTTOM_R32) {
      map[m.id] = {
        home: resolveTeam(m.home, actualTables, m.id, actualThirdMap),
        away: resolveTeam(m.away, actualTables, m.id, actualThirdMap),
      };
    }
    return map;
  }, [actualTables, actualThirdMap]);

  const connectorPaths = [
    ...halfConnectors(0, 0, colX, POD_W), ...halfConnectors(0, 1, colX, POD_W), ...halfConnectors(0, 2, colX, POD_W),
    ...halfConnectors(HALF_H, 0, colX, POD_W), ...halfConnectors(HALF_H, 1, colX, POD_W), ...halfConnectors(HALF_H, 2, colX, POD_W),
    ...buildFinalConnectors(colX, finalX, POD_W),
  ];

  const finalPodY = HALF_H - POD_H / 2;

  // Which bracket to use for R16+ rendering
  const activeBracket = view === "actual" ? bracketTeams : (showPickers ? predictedBracketTeams : null);

  // Round completion banner
  const nextRound = NEXT_ROUND[mobileRound];
  const allPickedForRound = showPickers && ROUND_PICK_IDS[mobileRound].every(id => scorePicks[id] !== undefined);
  const roundBannerVisible = allPickedForRound && nextRound !== null && !dismissedRounds.has(mobileRound);

  return (
    <div>
      {/* Round completion banner — mobile only, entire_tournament mode */}
      {showPickers && nextRound && (
        <div
          className="fixed top-14 inset-x-0 z-[60] flex justify-center px-4 pt-2 pointer-events-none md:hidden"
          style={{
            transform: roundBannerVisible ? "translateY(0)" : "translateY(calc(-100% - 72px))",
            transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            onClick={() => {
              setDismissedRounds(prev => new Set([...prev, mobileRound]));
              setMobileRound(nextRound);
            }}
            className="pointer-events-auto w-full max-w-lg flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer"
            style={{
              backgroundColor: mono ? "#1A1208" : "#D7FF5A",
              border: "none",
              boxShadow: mono ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(215,255,90,0.35)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-base" style={{ color: mono ? "#D7FF5A" : "#0B1E0D" }}>✓</span>
              <div className="text-left">
                <p className="text-sm font-black" style={{ color: mono ? "#F7F4EE" : "#0B1E0D" }}>
                  {ROUND_LABEL[mobileRound]} complete
                </p>
                <p className="text-xs font-medium" style={{ color: mono ? "rgba(247,244,238,0.6)" : "rgba(11,30,13,0.6)" }}>
                  Next up: {ROUND_LABEL[nextRound]} · {ROUND_PICK_IDS[nextRound].length} {ROUND_PICK_IDS[nextRound].length === 1 ? "match" : "matches"}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold" style={{ color: mono ? "#F7F4EE" : "#0B1E0D" }}>→</span>
          </button>
        </div>
      )}

      {/* Toggle — only shown when actual results exist */}
      {hasActual && (
        <div className="flex items-center gap-2 mb-5">
          {([
            { id: "compare" as const, label: "Compare" },
            { id: "actual" as const, label: "Actual" },
          ]).map(({ id, label }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                style={{
                  backgroundColor: active ? t.accent : "transparent",
                  color: active ? t.accentText : t.textSec,
                  border: `1px solid ${active ? t.accent : t.border}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile picker — vertical list, visible only on small screens */}
      {showPickers && (
        <div className="block md:hidden">
          {/* Round tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(["r32","r16","qf","sf","final"] as MobileRound[]).map((id) => {
              const label = id === "final" ? "Final" : id.toUpperCase();
              const active = mobileRound === id;
              return (
                <button key={id} onClick={() => setMobileRound(id)}
                  className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-all"
                  style={{
                    border: `1px solid ${active ? t.accent : t.border}`,
                    backgroundColor: active ? t.accent : "transparent",
                    color: active ? t.accentText : t.textSec,
                  }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Match cards — grouped by next-round pairing */}
          <div className="flex flex-col gap-5 mb-6">
            {mobileGroups[mobileRound].map((group, gi) => (
              <div key={gi}>
                <div className="flex flex-col gap-2">
                  {group.matches.map((m, mi) => (
                    <div key={m.id}>
                      <MobileMatchCard
                        id={m.id} homeTeam={m.homeTeam} awayTeam={m.awayTeam}
                        homeLabel={m.homeLabel} awayLabel={m.awayLabel}
                        scorePicks={scorePicks} onScorePick={onScorePick!} t={t}
                      />
                      {/* Connector between the two matches in a pair */}
                      {mi === 0 && group.matches.length > 1 && (
                        <div className="flex items-center gap-2 py-1 px-1">
                          <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                          <span style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>
                            winners meet
                          </span>
                          <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Group label showing where winners advance */}
                {group.nextRoundLabel && (
                  <div className="flex items-center gap-2 mt-2">
                    <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                    <span style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {group.nextRoundLabel}
                    </span>
                    <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round labels — desktop only when pickers active */}
      <div className={showPickers ? "hidden md:block" : ""}>
      <div style={{ position: "relative", height: 20, marginBottom: 6, width: totalWidth }}>
        {(["R32","R16","QF","SF"] as const).map((lbl, r) => (
          <span key={lbl} style={{
            position: "absolute", left: colX[r], width: POD_W, textAlign: "center",
            fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
            textTransform: "uppercase", color: t.textMuted,
          }}>
            {lbl}
          </span>
        ))}
        <span style={{
          position: "absolute", left: finalX, width: POD_W, textAlign: "center",
          fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
          textTransform: "uppercase", color: t.accent,
        }}>
          Final
        </span>
      </div>

      {/* Bracket */}
      <div className="overflow-x-auto pb-4">
        <div style={{ width: totalWidth, position: "relative", height: TOTAL_H }}>

          <div style={{ position: "absolute", top: HALF_H, left: 0, width: colX[3] + POD_W, height: 1, backgroundColor: t.halfDivider }} />

          <svg style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }} width={totalWidth} height={TOTAL_H}>
            {connectorPaths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={t.connector} strokeWidth={1.5} />
            ))}
          </svg>

          {/* Top half — R32 */}
          {TOP_R32.map((m, i) => (
            <MatchPod key={m.id}
              x={colX[0]} y={podTop(0, i)} podW={POD_W}
              homeTeam={resolveTeam(m.home, tables, m.id, thirdMap)}
              awayTeam={resolveTeam(m.away, tables, m.id, thirdMap)}
              homeLabel={slotLabel(m.home, m.home.kind === "third" ? thirdGroupAssign[m.id] : undefined)}
              awayLabel={slotLabel(m.away, m.away.kind === "third" ? thirdGroupAssign[m.id] : undefined)}
              actualHome={view === "compare" ? actualR32ByMatchId[m.id]?.home : undefined}
              actualAway={view === "compare" ? actualR32ByMatchId[m.id]?.away : undefined}
              compare={view === "compare"}
              matchId={m.id} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined}
              t={t}
            />
          ))}

          {/* Top half — R16 / QF / SF */}
          {activeBracket ? (
            <>
              {activeBracket.r16Top.map((p, i) => (
                p.home || p.away
                  ? <MatchPod key={`top-r16-${i}`} x={colX[1]} y={podTop(1, i)} podW={POD_W} homeTeam={p.home} awayTeam={p.away} homeLabel="" awayLabel="" matchId={R16_IDS[i]} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined} t={t} />
                  : <TbdPod  key={`top-r16-${i}`} x={colX[1]} y={podTop(1, i)} podW={POD_W} t={t} />
              ))}
              {activeBracket.qfTop.map((p, i) => (
                p.home || p.away
                  ? <MatchPod key={`top-qf-${i}`} x={colX[2]} y={podTop(2, i)} podW={POD_W} homeTeam={p.home} awayTeam={p.away} homeLabel="" awayLabel="" matchId={QF_IDS[i]} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined} t={t} />
                  : <TbdPod  key={`top-qf-${i}`} x={colX[2]} y={podTop(2, i)} podW={POD_W} t={t} />
              ))}
              {activeBracket.sfTop.home || activeBracket.sfTop.away
                ? <MatchPod x={colX[3]} y={podTop(3, 0)} podW={POD_W} homeTeam={activeBracket.sfTop.home} awayTeam={activeBracket.sfTop.away} homeLabel="" awayLabel="" matchId={SF_IDS[0]} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined} t={t} />
                : <TbdPod  x={colX[3]} y={podTop(3, 0)} podW={POD_W} t={t} />
              }
            </>
          ) : (
            [1, 2, 3].flatMap(r =>
              Array.from({ length: SLOTS / Math.pow(2, r) }, (_, i) => (
                <TbdPod key={`top-r${r}-${i}`} x={colX[r]} y={podTop(r, i)} podW={POD_W} t={t} />
              ))
            )
          )}

          {/* Bottom half — R32 */}
          {BOTTOM_R32.map((m, i) => (
            <MatchPod key={m.id}
              x={colX[0]} y={HALF_H + podTop(0, i)} podW={POD_W}
              homeTeam={resolveTeam(m.home, tables, m.id, thirdMap)}
              awayTeam={resolveTeam(m.away, tables, m.id, thirdMap)}
              homeLabel={slotLabel(m.home, m.home.kind === "third" ? thirdGroupAssign[m.id] : undefined)}
              awayLabel={slotLabel(m.away, m.away.kind === "third" ? thirdGroupAssign[m.id] : undefined)}
              actualHome={view === "compare" ? actualR32ByMatchId[m.id]?.home : undefined}
              actualAway={view === "compare" ? actualR32ByMatchId[m.id]?.away : undefined}
              compare={view === "compare"}
              matchId={m.id} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined}
              t={t}
            />
          ))}

          {/* Bottom half — R16 / QF / SF */}
          {activeBracket ? (
            <>
              {activeBracket.r16Bot.map((p, i) => (
                p.home || p.away
                  ? <MatchPod key={`bot-r16-${i}`} x={colX[1]} y={HALF_H + podTop(1, i)} podW={POD_W} homeTeam={p.home} awayTeam={p.away} homeLabel="" awayLabel="" matchId={R16_IDS[4+i]} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined} t={t} />
                  : <TbdPod  key={`bot-r16-${i}`} x={colX[1]} y={HALF_H + podTop(1, i)} podW={POD_W} t={t} />
              ))}
              {activeBracket.qfBot.map((p, i) => (
                p.home || p.away
                  ? <MatchPod key={`bot-qf-${i}`} x={colX[2]} y={HALF_H + podTop(2, i)} podW={POD_W} homeTeam={p.home} awayTeam={p.away} homeLabel="" awayLabel="" matchId={QF_IDS[2+i]} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined} t={t} />
                  : <TbdPod  key={`bot-qf-${i}`} x={colX[2]} y={HALF_H + podTop(2, i)} podW={POD_W} t={t} />
              ))}
              {activeBracket.sfBot.home || activeBracket.sfBot.away
                ? <MatchPod x={colX[3]} y={HALF_H + podTop(3, 0)} podW={POD_W} homeTeam={activeBracket.sfBot.home} awayTeam={activeBracket.sfBot.away} homeLabel="" awayLabel="" matchId={SF_IDS[1]} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined} t={t} />
                : <TbdPod  x={colX[3]} y={HALF_H + podTop(3, 0)} podW={POD_W} t={t} />
              }
            </>
          ) : (
            [1, 2, 3].flatMap(r =>
              Array.from({ length: SLOTS / Math.pow(2, r) }, (_, i) => (
                <TbdPod key={`bot-r${r}-${i}`} x={colX[r]} y={HALF_H + podTop(r, i)} podW={POD_W} t={t} />
              ))
            )
          )}

          {/* Final */}
          {activeBracket && (activeBracket.final.home || activeBracket.final.away)
            ? <MatchPod x={finalX} y={finalPodY} podW={POD_W} homeTeam={activeBracket.final.home} awayTeam={activeBracket.final.away} homeLabel="" awayLabel="" isFinal matchId={FINAL_ID} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined} t={t} />
            : <MatchPod x={finalX} y={finalPodY} podW={POD_W} isFinal t={t} />
          }
        </div>
      </div>
      </div>{/* end desktop-only wrapper */}

      <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
        3rd-place: best 8 of 12 advance (Pts → GD → GF). Slot assignment follows FIFA Annex C.
        {showPickers ? " Pick scores round by round — winners advance automatically." : view === "compare" ? " Strikethroughs show where actual qualifiers differ from your picks." : " R16 onwards unlocks as matches are played."}
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface PodProps {
  x: number; y: number; podW: number;
  homeTeam?: TeamRow | null;
  awayTeam?: TeamRow | null;
  homeLabel?: string;
  awayLabel?: string;
  actualHome?: TeamRow | null;
  actualAway?: TeamRow | null;
  compare?: boolean;
  isFinal?: boolean;
  matchId?: string;
  scorePicks?: Record<string, { home: number; away: number }>;
  onScorePick?: (matchId: string, home: number, away: number) => void;
  t: Record<string, string>;
}

function MatchPod({ x, y, podW, homeTeam, awayTeam, homeLabel, awayLabel, actualHome, actualAway, compare, isFinal, matchId, scorePicks, onScorePick, t }: PodProps) {
  const homeScore = matchId ? (scorePicks?.[matchId]?.home ?? 0) : 0;
  const awayScore = matchId ? (scorePicks?.[matchId]?.away ?? 0) : 0;
  const showPickers = !!onScorePick && !!matchId;

  return (
    <div style={{
      position: "absolute", left: x, top: y, width: podW, height: POD_H,
      borderRadius: 8, border: `1px solid ${isFinal ? t.accent : t.border}`,
      backgroundColor: isFinal ? t.finalBg : t.card,
      overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <PodTeamRow team={homeTeam ?? null} label={homeLabel ?? "TBD"} actualTeam={compare ? actualHome : undefined}
        score={showPickers ? homeScore : undefined}
        onScore={showPickers ? (delta) => onScorePick(matchId, Math.max(0, homeScore + delta), awayScore) : undefined}
        t={t} />
      <div style={{ height: 1, backgroundColor: t.border, flexShrink: 0 }} />
      <PodTeamRow team={awayTeam ?? null} label={awayLabel ?? "TBD"} actualTeam={compare ? actualAway : undefined}
        score={showPickers ? awayScore : undefined}
        onScore={showPickers ? (delta) => onScorePick(matchId, homeScore, Math.max(0, awayScore + delta)) : undefined}
        t={t} />
    </div>
  );
}

function TbdPod({ x, y, podW, t }: { x: number; y: number; podW: number; t: Record<string, string> }) {
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: podW, height: POD_H,
      borderRadius: 8, border: `1px solid ${t.border}`,
      backgroundColor: t.card, overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <TbdRow t={t} />
      <div style={{ height: 1, backgroundColor: t.border, flexShrink: 0 }} />
      <TbdRow t={t} />
    </div>
  );
}

// ── Mobile match card ─────────────────────────────────────────────────────────
function MobileMatchCard({
  id, homeTeam, awayTeam, homeLabel, awayLabel, scorePicks, onScorePick, t,
}: {
  id: string;
  homeTeam: TeamRow | null;
  awayTeam: TeamRow | null;
  homeLabel: string;
  awayLabel: string;
  scorePicks: Record<string, ScoreEntry>;
  onScorePick: (matchId: string, home: number, away: number, pens?: "home" | "away") => void;
  t: Record<string, string>;
}) {
  const homeScore = scorePicks[id]?.home ?? 0;
  const awayScore = scorePicks[id]?.away ?? 0;
  const pens      = scorePicks[id]?.pens;
  const tied      = homeScore === awayScore;
  const meta      = KNOCKOUT_MATCH_META[id];
  const hasPick   = scorePicks[id] !== undefined;

  const [saved, setSaved] = useState(hasPick);
  useEffect(() => {
    if (!hasPick) { setSaved(false); return; }
    setSaved(false);
    const timer = setTimeout(() => setSaved(true), 800);
    return () => clearTimeout(timer);
  }, [homeScore, awayScore, pens]); // eslint-disable-line react-hooks/exhaustive-deps

  function TeamRow_({ team, label, score, onMinus, onPlus }: {
    team: TeamRow | null; label: string;
    score: number; onMinus: () => void; onPlus: () => void;
  }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px" }}>
        {label && <span style={{ fontSize: 9, color: t.textMuted, fontWeight: 900, width: 22, flexShrink: 0 }}>{label}</span>}
        {team ? (
          <>
            <FlagImage emoji={team.flag} size={20} team={team.team} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {team.team}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 14, color: t.textMuted, fontStyle: "italic" }}>TBD</span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button onClick={onMinus}
            style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            −
          </button>
          <span style={{ fontSize: 20, fontWeight: 900, color: t.text, minWidth: 22, textAlign: "center" }}>{score}</span>
          <button onClick={onPlus}
            style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: t.accent, color: t.accentText, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", backgroundColor: t.card }}>
      {/* Date + venue header */}
      {meta && (
        <div style={{ padding: "7px 14px 6px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textSec }}>{meta.date}</span>
          <span style={{ fontSize: 11, color: t.border }}>·</span>
          <span style={{ fontSize: 10, color: t.textMuted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.venue}</span>
          <span
            className="transition-all duration-300"
            style={{
              fontSize: 10, fontWeight: 700, flexShrink: 0,
              color: "#4ADE80",
              opacity: hasPick ? (saved ? 1 : 0.4) : 0,
            }}
          >
            ✓ Saved
          </span>
        </div>
      )}

      <TeamRow_
        team={homeTeam} label={homeLabel} score={homeScore}
        onMinus={() => onScorePick(id, Math.max(0, homeScore - 1), awayScore)}
        onPlus={() => onScorePick(id, homeScore + 1, awayScore)}
      />
      <div style={{ height: 1, backgroundColor: t.border }} />
      <TeamRow_
        team={awayTeam} label={awayLabel} score={awayScore}
        onMinus={() => onScorePick(id, homeScore, Math.max(0, awayScore - 1))}
        onPlus={() => onScorePick(id, homeScore, awayScore + 1)}
      />

      {/* Penalty winner — shown when scores are tied */}
      {tied && (homeTeam || awayTeam) && (
        <div style={{ borderTop: `1px solid ${t.border}`, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Tied — who wins on penalties?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { side: "home" as const, team: homeTeam, label: homeLabel || homeTeam?.team || "Home" },
              { side: "away" as const, team: awayTeam, label: awayLabel || awayTeam?.team || "Away" },
            ].map(({ side, team, label }) => {
              const selected = pens === side;
              return (
                <button
                  key={side}
                  onClick={() => onScorePick(id, homeScore, awayScore, selected ? undefined : side)}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 8,
                    border: `1px solid ${selected ? t.accent : t.border}`,
                    background: selected ? t.accent : "transparent",
                    color: selected ? t.accentText : t.textSec,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {team && <FlagImage emoji={team.flag} size={14} team={team.team} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {team?.team ?? label}
                  </span>
                  {selected && <span style={{ marginLeft: "auto", flexShrink: 0 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TbdRow({ t }: { t: Record<string, string> }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", paddingInline: 8 }}>
      <span style={{ fontSize: 10, color: t.textMuted, fontStyle: "italic" }}>TBD</span>
    </div>
  );
}

function PodTeamRow({ team, label, actualTeam, score, onScore, t }: {
  team: TeamRow | null;
  label: string;
  actualTeam?: TeamRow | null;
  score?: number;
  onScore?: (delta: number) => void;
  t: Record<string, string>;
}) {
  const hasActual = actualTeam !== undefined;
  const correct = hasActual && team && actualTeam && team.team === actualTeam.team;
  const wrong   = hasActual && team && actualTeam && team.team !== actualTeam.team;

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 3, paddingInline: 5, minWidth: 0,
      backgroundColor: correct ? "rgba(74,222,128,0.06)" : wrong ? "rgba(248,113,113,0.06)" : "transparent" }}>
      {!onScore && (
        <span style={{ fontSize: 8, color: t.textMuted, fontWeight: 900, letterSpacing: "0.05em",
          flexShrink: 0, width: 18, textAlign: "left" }}>
          {label}
        </span>
      )}
      {team ? (
        <>
          <FlagImage emoji={team.flag} size={13} team={team.team} />
          <span style={{ fontSize: 10, fontWeight: 700,
            color: correct ? "#4ADE80" : wrong ? "#F87171" : t.text,
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textDecoration: wrong ? "line-through" : "none", opacity: wrong ? 0.7 : 1 }}>
            {team.team}
          </span>
          {correct && !onScore && <span style={{ fontSize: 9, color: "#4ADE80", flexShrink: 0 }}>✓</span>}
          {wrong && actualTeam && !onScore && (
            <span style={{ fontSize: 8, color: "#F87171", flexShrink: 0, maxWidth: 36,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {actualTeam.team}
            </span>
          )}
          {onScore !== undefined && score !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <button
                onClick={(e) => { e.stopPropagation(); onScore(-1); }}
                style={{ width: 15, height: 15, borderRadius: 3, background: "transparent",
                  border: `1px solid ${t.border}`, color: t.textSec, fontSize: 10,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
              >−</button>
              <span style={{ fontSize: 11, fontWeight: 900, color: t.text, minWidth: 12, textAlign: "center" }}>{score}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onScore(1); }}
                style={{ width: 15, height: 15, borderRadius: 3, background: t.accent,
                  border: "none", color: t.accentText, fontSize: 10,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
              >+</button>
            </div>
          )}
        </>
      ) : (
        <span style={{ fontSize: 10, color: t.textMuted, fontStyle: "italic" }}>TBD</span>
      )}
    </div>
  );
}
