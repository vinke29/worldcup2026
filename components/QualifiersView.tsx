"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { Match, LeagueMode } from "@/lib/mock-data";
import { computeGroupTables, rankThirdPlaceTeams, type TeamRow } from "@/lib/group-standings";
import { resolveBracketTeams, TOP_R32_IDS, BOT_R32_IDS, R16_IDS, QF_IDS, SF_IDS, THIRD_PLACE_ID, FINAL_ID, KNOCKOUT_MATCH_META } from "@/lib/bracket";
import type { ScoreEntry } from "@/lib/bracket";
import FlagImage from "@/lib/flag-image";

interface QualifiersViewProps {
  matches: Match[];
  scorePicks: Record<string, ScoreEntry>;
  actualScores: Record<string, ScoreEntry>;
  mono: boolean;
  mode?: LeagueMode;
  onScorePick?: (matchId: string, home: number, away: number, pens?: "home" | "away") => void;
  dismissedRounds?: Set<string>;
  onDismissRound?: (round: string) => void;
  bannersReady?: boolean;
}

// ── Layout constants ──────────────────────────────────────────────────────────
const COL_GAP = 28;
const SLOTS   = 8;
const SLOT_H  = 72;
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

// Convert ET kickoff time to a local Date (same logic as MatchCard.tsx)
function knockoutKickoff(dateStr: string, timeStr: string): Date {
  const months: Record<string, number> = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
  };
  const [mon, day] = dateStr.split(" ");
  const [h, m] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(2026, months[mon], Number(day), h + 4, m));
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
  pickedGroups?: Set<string>,
): TeamRow | null {
  if (slot.kind === "winner") {
    if (pickedGroups && !pickedGroups.has(slot.group)) return null;
    return tables[`Group ${slot.group}`]?.[0] ?? null;
  }
  if (slot.kind === "runner") {
    if (pickedGroups && !pickedGroups.has(slot.group)) return null;
    return tables[`Group ${slot.group}`]?.[1] ?? null;
  }
  // Third-place: all eligible groups must have at least one pick before resolving
  if (pickedGroups && !(slot as ThirdSlot).eligible.every(g => pickedGroups.has(g))) return null;
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

type MobileRound = "r32" | "r16" | "qf" | "sf" | "third" | "final";

const ROUND_PICK_IDS: Record<MobileRound, string[]> = {
  r32:   [...TOP_R32_IDS, ...BOT_R32_IDS],
  r16:   R16_IDS,
  qf:    QF_IDS,
  sf:    SF_IDS,
  third: [THIRD_PLACE_ID],
  final: [FINAL_ID],
};
const NEXT_ROUND: Record<MobileRound, MobileRound | null> = {
  r32: "r16", r16: "qf", qf: "sf", sf: "third", third: "final", final: null,
};
const ROUND_LABEL: Record<MobileRound, string> = {
  r32: "R32", r16: "R16", qf: "QF", sf: "Semis", third: "3rd Place", final: "Final",
};

// ── Main component ────────────────────────────────────────────────────────────
export default function QualifiersView({ matches, scorePicks, actualScores, mono, mode = "phase_by_phase", onScorePick, dismissedRounds: dismissedRoundsProp, onDismissRound, bannersReady = true }: QualifiersViewProps) {
  const hasActual = useMemo(() => matches.some(m => m.homeScore !== null), [matches]);
  const defaultView = hasActual ? "compare" : "predicted";
  const [view, setView] = useState<"predicted" | "actual" | "compare">(defaultView);
  const [mobileRound, setMobileRound] = useState<MobileRound>("r32");
  const [dismissedRoundsInternal, setDismissedRoundsInternal] = useState<Set<MobileRound>>(new Set());
  const dismissedRounds = dismissedRoundsProp ?? dismissedRoundsInternal;
  function dismissRound(round: MobileRound) {
    if (onDismissRound) onDismissRound(round);
    else setDismissedRoundsInternal(prev => new Set([...prev, round]));
  }
  const t = useTheme(mono);

  // In entire_tournament mode, show mobile list (read-only or interactive)
  const showMobileList = mode === "entire_tournament";
  // Only show +/- pickers when an onScorePick handler is provided
  const showPickers = showMobileList && !!onScorePick;

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

  // Groups where the user has made at least one score pick — used to gate bracket resolution
  const pickedGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const match of matches) {
      if (match.group?.startsWith("Group") && scorePicks[match.id] !== undefined) {
        groups.add(match.group.replace("Group ", ""));
      }
    }
    return groups;
  }, [matches, scorePicks]);

  const topR32Pairs = useMemo(() =>
    TOP_R32.map(m => ({
      home: resolveTeam(m.home, tables, m.id, thirdMap, pickedGroups),
      away: resolveTeam(m.away, tables, m.id, thirdMap, pickedGroups),
    })), [tables, thirdMap, pickedGroups]);
  const botR32Pairs = useMemo(() =>
    BOTTOM_R32.map(m => ({
      home: resolveTeam(m.home, tables, m.id, thirdMap, pickedGroups),
      away: resolveTeam(m.away, tables, m.id, thirdMap, pickedGroups),
    })), [tables, thirdMap, pickedGroups]);

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

  // Match lists for mobile picker — grouped as pairs that feed the same next-round slot
  type MobileMatch = { id: string; homeTeam: TeamRow | null; awayTeam: TeamRow | null; homeLabel: string; awayLabel: string; actualHomeTeam?: TeamRow | null; actualAwayTeam?: TeamRow | null };
  type MobileGroup = { nextRoundLabel: string; matches: MobileMatch[] };

  const mobileGroups = useMemo((): Record<MobileRound, MobileGroup[]> => {
    const r32flat = [
      ...TOP_R32.map((m, i) => ({
        id: m.id, homeTeam: topR32Pairs[i].home, awayTeam: topR32Pairs[i].away,
        homeLabel: slotLabel(m.home, m.home.kind === "third" ? thirdGroupAssign[m.id] : undefined),
        awayLabel: slotLabel(m.away, m.away.kind === "third" ? thirdGroupAssign[m.id] : undefined),
        actualHomeTeam: hasActual ? (actualR32ByMatchId[m.id]?.home ?? null) : undefined,
        actualAwayTeam: hasActual ? (actualR32ByMatchId[m.id]?.away ?? null) : undefined,
      })),
      ...BOTTOM_R32.map((m, i) => ({
        id: m.id, homeTeam: botR32Pairs[i].home, awayTeam: botR32Pairs[i].away,
        homeLabel: slotLabel(m.home, m.home.kind === "third" ? thirdGroupAssign[m.id] : undefined),
        awayLabel: slotLabel(m.away, m.away.kind === "third" ? thirdGroupAssign[m.id] : undefined),
        actualHomeTeam: hasActual ? (actualR32ByMatchId[m.id]?.home ?? null) : undefined,
        actualAwayTeam: hasActual ? (actualR32ByMatchId[m.id]?.away ?? null) : undefined,
      })),
    ];
    const r32: MobileGroup[] = Array.from({ length: 8 }, (_, i) => ({
      nextRoundLabel: `→ R16 Match ${i + 1}`,
      matches: [r32flat[i * 2], r32flat[i * 2 + 1]],
    }));

    const r16flat: MobileMatch[] = [
      ...predictedBracketTeams.r16Top.map((p, i) => ({ id: R16_IDS[i],   homeTeam: p.home, awayTeam: p.away, homeLabel: "", awayLabel: "", actualHomeTeam: hasActual ? (bracketTeams.r16Top[i]?.home ?? null) : undefined, actualAwayTeam: hasActual ? (bracketTeams.r16Top[i]?.away ?? null) : undefined })),
      ...predictedBracketTeams.r16Bot.map((p, i) => ({ id: R16_IDS[4+i], homeTeam: p.home, awayTeam: p.away, homeLabel: "", awayLabel: "", actualHomeTeam: hasActual ? (bracketTeams.r16Bot[i]?.home ?? null) : undefined, actualAwayTeam: hasActual ? (bracketTeams.r16Bot[i]?.away ?? null) : undefined })),
    ];
    const r16: MobileGroup[] = Array.from({ length: 4 }, (_, i) => ({
      nextRoundLabel: `→ QF Match ${i + 1}`,
      matches: [r16flat[i * 2], r16flat[i * 2 + 1]],
    }));

    const qfflat: MobileMatch[] = [
      ...predictedBracketTeams.qfTop.map((p, i) => ({ id: QF_IDS[i],   homeTeam: p.home, awayTeam: p.away, homeLabel: "", awayLabel: "", actualHomeTeam: hasActual ? (bracketTeams.qfTop[i]?.home ?? null) : undefined, actualAwayTeam: hasActual ? (bracketTeams.qfTop[i]?.away ?? null) : undefined })),
      ...predictedBracketTeams.qfBot.map((p, i) => ({ id: QF_IDS[2+i], homeTeam: p.home, awayTeam: p.away, homeLabel: "", awayLabel: "", actualHomeTeam: hasActual ? (bracketTeams.qfBot[i]?.home ?? null) : undefined, actualAwayTeam: hasActual ? (bracketTeams.qfBot[i]?.away ?? null) : undefined })),
    ];
    const qf: MobileGroup[] = Array.from({ length: 2 }, (_, i) => ({
      nextRoundLabel: `→ Semi-final ${i + 1}`,
      matches: [qfflat[i * 2], qfflat[i * 2 + 1]],
    }));

    const sf: MobileGroup[] = [{
      nextRoundLabel: "→ 3rd Place & Final",
      matches: [
        { id: SF_IDS[0], homeTeam: predictedBracketTeams.sfTop.home, awayTeam: predictedBracketTeams.sfTop.away, homeLabel: "", awayLabel: "", actualHomeTeam: hasActual ? (bracketTeams.sfTop.home ?? null) : undefined, actualAwayTeam: hasActual ? (bracketTeams.sfTop.away ?? null) : undefined },
        { id: SF_IDS[1], homeTeam: predictedBracketTeams.sfBot.home, awayTeam: predictedBracketTeams.sfBot.away, homeLabel: "", awayLabel: "", actualHomeTeam: hasActual ? (bracketTeams.sfBot.home ?? null) : undefined, actualAwayTeam: hasActual ? (bracketTeams.sfBot.away ?? null) : undefined },
      ],
    }];

    const third: MobileGroup[] = [{
      nextRoundLabel: "→ Final",
      matches: [{ id: THIRD_PLACE_ID, homeTeam: predictedBracketTeams.thirdPlace.home, awayTeam: predictedBracketTeams.thirdPlace.away, homeLabel: "", awayLabel: "", actualHomeTeam: hasActual ? (bracketTeams.thirdPlace.home ?? null) : undefined, actualAwayTeam: hasActual ? (bracketTeams.thirdPlace.away ?? null) : undefined }],
    }];

    const final: MobileGroup[] = [{
      nextRoundLabel: "",
      matches: [{ id: FINAL_ID, homeTeam: predictedBracketTeams.final.home, awayTeam: predictedBracketTeams.final.away, homeLabel: "", awayLabel: "", actualHomeTeam: hasActual ? (bracketTeams.final.home ?? null) : undefined, actualAwayTeam: hasActual ? (bracketTeams.final.away ?? null) : undefined }],
    }];

    return { r32, r16, qf, sf, third, final };
  }, [topR32Pairs, botR32Pairs, predictedBracketTeams, bracketTeams, actualR32ByMatchId, hasActual, thirdGroupAssign]);

  const connectorPaths = [
    ...halfConnectors(0, 0, colX, POD_W), ...halfConnectors(0, 1, colX, POD_W), ...halfConnectors(0, 2, colX, POD_W),
    ...halfConnectors(HALF_H, 0, colX, POD_W), ...halfConnectors(HALF_H, 1, colX, POD_W), ...halfConnectors(HALF_H, 2, colX, POD_W),
    ...buildFinalConnectors(colX, finalX, POD_W),
  ];

  const finalPodY = HALF_H - POD_H / 2;

  // Which bracket to use for R16+ rendering.
  // Compare/read-only: show user's predicted bracket; actual vs predicted shown via R32 pod overlays.
  // Actual bracket only propagates when knockout scores exist (handled by bracketTeams).
  const activeBracket = view === "actual" ? bracketTeams
    : (showPickers || hasActual) ? predictedBracketTeams
    : null;

  // Round completion banner
  const nextRound = NEXT_ROUND[mobileRound];
  const allPickedForRound = showPickers && ROUND_PICK_IDS[mobileRound].every(id => scorePicks[id] !== undefined);
  const roundBannerVisible = bannersReady && allPickedForRound && nextRound !== null && !dismissedRounds.has(mobileRound);

  // Champion — determined once Final has a clear winner
  const finalChampion = useMemo(() => {
    const pick = scorePicks[FINAL_ID];
    if (!pick) return null;
    const home = predictedBracketTeams.final.home;
    const away = predictedBracketTeams.final.away;
    if (!home || !away) return null;
    if (pick.home > pick.away || pick.pens === "home") return home;
    if (pick.away > pick.home || pick.pens === "away") return away;
    return null; // tied, no pens pick yet
  }, [scorePicks, predictedBracketTeams]);

  const [championBannerDismissed, setChampionBannerDismissed] = useState(false);
  const championBannerVisible = bannersReady && !!finalChampion && !championBannerDismissed;
  const confettiFiredRef = useRef(false);

  useEffect(() => {
    if (finalChampion && !confettiFiredRef.current && showPickers) {
      confettiFiredRef.current = true;
      setChampionBannerDismissed(false);
      import("canvas-confetti").then(({ default: confetti }) => {
        const colors = mono
          ? ["#1A1208", "#6B5E4E", "#C8C0B0", "#ffffff"]
          : ["#D7FF5A", "#4ADE80", "#ffffff", "#B3FF6A"];
        const shared = { particleCount: 70, spread: 60, colors, startVelocity: 45 };
        confetti({ ...shared, angle: 60,  origin: { x: 0,   y: 0.6 } });
        confetti({ ...shared, angle: 120, origin: { x: 1,   y: 0.6 } });
        setTimeout(() => {
          confetti({ ...shared, particleCount: 40, angle: 75,  origin: { x: 0.2, y: 0.5 } });
          confetti({ ...shared, particleCount: 40, angle: 105, origin: { x: 0.8, y: 0.5 } });
        }, 300);
      });
    }
    if (!finalChampion) confettiFiredRef.current = false;
  }, [finalChampion, showPickers, mono]);

  return (
    <div>
      {/* Champion banner — slides down when Final winner is picked */}
      {showPickers && (
        <div
          className="fixed top-14 inset-x-0 z-[61] flex justify-center px-4 pt-2 pointer-events-none"
          style={{
            transform: championBannerVisible ? "translateY(0)" : "translateY(calc(-100% - 72px))",
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div
            className="pointer-events-auto w-full max-w-lg flex items-center justify-between px-5 py-4 rounded-2xl"
            style={{
              backgroundColor: mono ? "#1A1208" : "#D7FF5A",
              boxShadow: mono ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 40px rgba(215,255,90,0.5)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <div className="text-left">
                <p className="text-sm font-black" style={{ color: mono ? "#F7F4EE" : "#0B1E0D" }}>
                  {finalChampion?.team} wins it all
                </p>
                <p className="text-xs font-medium" style={{ color: mono ? "rgba(247,244,238,0.6)" : "rgba(11,30,13,0.6)" }}>
                  Your bracket is complete ✓
                </p>
              </div>
            </div>
            <button
              onClick={() => setChampionBannerDismissed(true)}
              className="text-sm font-bold cursor-pointer hover:opacity-70 transition-opacity"
              style={{ color: mono ? "#F7F4EE" : "#0B1E0D" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Round completion banner — entire_tournament mode */}
      {showPickers && nextRound && (
        <div
          className="fixed top-14 inset-x-0 z-[60] flex justify-center px-4 pt-2 pointer-events-none"
          style={{
            transform: roundBannerVisible ? "translateY(0)" : "translateY(calc(-100% - 72px))",
            transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            onClick={() => {
              dismissRound(mobileRound);
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


      {/* Match list — visible on all screen sizes in entire_tournament mode */}
      {showMobileList && (
        <div>
          {/* Round tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(["r32","r16","qf","sf","third","final"] as MobileRound[]).map((id) => {
              const label = ROUND_LABEL[id];
              const active = mobileRound === id;
              return (
                <button key={id} onClick={() => {
                  dismissRound(mobileRound);
                  setMobileRound(id);
                }}
                  className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-all"
                  style={{
                    border: `1px solid ${active ? t.accent : t.border}`,
                    backgroundColor: "transparent",
                    color: active ? t.accent : t.textSec,
                  }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Match cards */}
          <div className="flex flex-col gap-4 mb-6 max-w-2xl mx-auto w-full">
            {mobileGroups[mobileRound].map((group, gi) => {
              const isMulti = group.matches.length > 1;
              return (
                <div key={gi} style={isMulti ? { border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" } : {}}>
                  {/* Advancement label as header of the group card */}
                  {isMulti && group.nextRoundLabel && (
                    <div style={{ padding: "6px 14px", borderBottom: `1px solid ${t.border}`, backgroundColor: t.halfDivider }}>
                      <span style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {group.nextRoundLabel}
                      </span>
                    </div>
                  )}

                  {group.matches.map((m, mi) => (
                    <div key={m.id}>
                      <MobileMatchCard
                        id={m.id} homeTeam={m.homeTeam} awayTeam={m.awayTeam}
                        homeLabel={m.homeLabel} awayLabel={m.awayLabel}
                        actualHomeTeam={m.actualHomeTeam} actualAwayTeam={m.actualAwayTeam}
                        scorePicks={scorePicks} onScorePick={onScorePick} t={t} mono={mono}
                        grouped={isMulti}
                      />
                      {/* "Winners meet" divider between the two matches */}
                      {mi === 0 && isMulti && (
                        <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, backgroundColor: t.halfDivider }}>
                          <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                          <span style={{ padding: "0 10px", fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>
                            winners meet
                          </span>
                          <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Advancement label below single-match groups */}
                  {!isMulti && group.nextRoundLabel && (
                    <div className="flex items-center gap-2 mt-2">
                      <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                      <span style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {group.nextRoundLabel}
                      </span>
                      <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Champion reveal card — shown on Final tab once winner is determined */}
          {mobileRound === "final" && finalChampion && showPickers && (
            <div
              className="max-w-2xl mx-auto w-full rounded-2xl overflow-hidden mb-6"
              style={{
                border: `1px solid ${t.accent}`,
                backgroundColor: mono ? "rgba(26,18,8,0.04)" : "rgba(215,255,90,0.06)",
                boxShadow: mono ? "0 0 0 1px rgba(26,18,8,0.1)" : `0 0 40px rgba(215,255,90,0.15)`,
              }}
            >
              <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
                <span style={{ fontSize: 52, lineHeight: 1 }}>🏆</span>
                <div className="flex items-center gap-3">
                  <FlagImage emoji={finalChampion.flag} size={36} team={finalChampion.team} />
                  <span className="text-3xl font-black tracking-tight" style={{ color: t.accent }}>
                    {finalChampion.team}
                  </span>
                </div>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
                  World Champion · FIFA 2026
                </p>
                <span
                  className="text-xs font-bold px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: mono ? "rgba(26,18,8,0.08)" : "rgba(215,255,90,0.12)",
                    color: t.accent,
                    border: `1px solid ${mono ? "rgba(26,18,8,0.2)" : "rgba(215,255,90,0.3)"}`,
                  }}
                >
                  ✓ Bracket complete
                </span>
              </div>
            </div>
          )}

          {/* Full desktop bracket — all rounds side by side, horizontally scrollable */}
          {(() => {
            const GH = 460, CW = 280, XW = 52, HDR = 28;
            const HALF = 100;   // approx half-height of a single card (for vertical centering)
            const C1 = 127;     // center of first card within an R32 group (from group top)
            const C2 = 355;     // center of second card within an R32 group (from group top)
            const TOTAL_H = HDR + 8 * GH;
            const MID = XW / 2;
            const cR32 = 0, cCon1 = CW, cR16 = CW + XW;
            const cCon2 = 2 * CW + XW, cQF = 2 * CW + 2 * XW;
            const cCon3 = 3 * CW + 2 * XW, cSF = 3 * CW + 3 * XW;
            const cCon4 = 4 * CW + 3 * XW, cFin = 4 * CW + 4 * XW;
            const TOTAL_W = 5 * CW + 4 * XW;
            // Connector path: two inputs (topY, botY) merge to one output (outY)
            const cp = (topY: number, botY: number, outY: number) =>
              `M 0,${topY} H ${MID} V ${botY} M 0,${botY} H ${MID} M ${MID},${outY} H ${XW}`;
            const r32G = mobileGroups.r32;
            const r16F = mobileGroups.r16.flatMap(g => g.matches);
            const qfF  = mobileGroups.qf.flatMap(g => g.matches);
            const sfF  = mobileGroups.sf.flatMap(g => g.matches);
            const finM = mobileGroups.final[0].matches[0];
            const trdM = mobileGroups.third[0].matches[0];
            return (
              <div className="hidden overflow-x-auto pb-6">
                <div style={{ position: "relative", width: TOTAL_W, height: TOTAL_H }}>

                  {/* Column headers */}
                  {(["R32", "R16", "QF", "SF", "FINAL"] as const).map((lbl, ci) => (
                    <div key={lbl} style={{ position: "absolute", top: 0, left: [cR32, cR16, cQF, cSF, cFin][ci], width: CW, textAlign: "center" }}>
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: lbl === "FINAL" ? t.accent : t.textMuted }}>
                        {lbl}
                      </span>
                    </div>
                  ))}

                  {/* ── R32 groups ── */}
                  {r32G.map((group, gi) => (
                    <div key={gi} style={{ position: "absolute", top: HDR + gi * GH, left: cR32, width: CW, zIndex: r32G.length - gi }}>
                      <div style={{ border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>
                        {group.nextRoundLabel && (
                          <div style={{ padding: "6px 14px", borderBottom: `1px solid ${t.border}`, backgroundColor: t.halfDivider }}>
                            <span style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{group.nextRoundLabel}</span>
                          </div>
                        )}
                        {group.matches.map((m, mi) => (
                          <div key={m.id}>
                            <MobileMatchCard id={m.id} homeTeam={m.homeTeam} awayTeam={m.awayTeam} homeLabel={m.homeLabel} awayLabel={m.awayLabel} actualHomeTeam={m.actualHomeTeam} actualAwayTeam={m.actualAwayTeam} scorePicks={scorePicks} onScorePick={onScorePick} t={t} mono={mono} grouped />
                            {mi === 0 && (
                              <div style={{ height: 28, display: "flex", alignItems: "center", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, backgroundColor: t.halfDivider }}>
                                <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                                <span style={{ padding: "0 10px", fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>winners meet</span>
                                <div style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* ── R32 → R16 connectors ── */}
                  <svg style={{ position: "absolute", top: 0, left: cCon1, pointerEvents: "none" }} width={XW} height={TOTAL_H}>
                    {r32G.map((_, gi) => (
                      <path key={gi} d={cp(HDR + gi * GH + C1, HDR + gi * GH + C2, HDR + (gi + 0.5) * GH)} fill="none" stroke={t.connector} strokeWidth={1.5} />
                    ))}
                  </svg>

                  {/* ── R16 ── */}
                  {r16F.map((m, i) => (
                    <div key={m.id} style={{ position: "absolute", top: HDR + (i + 0.5) * GH - HALF, left: cR16, width: CW, zIndex: r16F.length - i }}>
                      <MobileMatchCard id={m.id} homeTeam={m.homeTeam} awayTeam={m.awayTeam} homeLabel="" awayLabel="" actualHomeTeam={m.actualHomeTeam} actualAwayTeam={m.actualAwayTeam} scorePicks={scorePicks} onScorePick={onScorePick} t={t} mono={mono} grouped={false} />
                    </div>
                  ))}

                  {/* ── R16 → QF connectors ── */}
                  <svg style={{ position: "absolute", top: 0, left: cCon2, pointerEvents: "none" }} width={XW} height={TOTAL_H}>
                    {Array.from({ length: 4 }, (_, qi) => (
                      <path key={qi} d={cp(HDR + (qi * 2 + 0.5) * GH, HDR + (qi * 2 + 1.5) * GH, HDR + (qi * 2 + 1) * GH)} fill="none" stroke={t.connector} strokeWidth={1.5} />
                    ))}
                  </svg>

                  {/* ── QF ── */}
                  {qfF.map((m, i) => (
                    <div key={m.id} style={{ position: "absolute", top: HDR + (i * 2 + 1) * GH - HALF, left: cQF, width: CW, zIndex: qfF.length - i }}>
                      <MobileMatchCard id={m.id} homeTeam={m.homeTeam} awayTeam={m.awayTeam} homeLabel="" awayLabel="" actualHomeTeam={m.actualHomeTeam} actualAwayTeam={m.actualAwayTeam} scorePicks={scorePicks} onScorePick={onScorePick} t={t} mono={mono} grouped={false} />
                    </div>
                  ))}

                  {/* ── QF → SF connectors ── */}
                  <svg style={{ position: "absolute", top: 0, left: cCon3, pointerEvents: "none" }} width={XW} height={TOTAL_H}>
                    {Array.from({ length: 2 }, (_, si) => (
                      <path key={si} d={cp(HDR + (si * 4 + 1) * GH, HDR + (si * 4 + 3) * GH, HDR + (si * 4 + 2) * GH)} fill="none" stroke={t.connector} strokeWidth={1.5} />
                    ))}
                  </svg>

                  {/* ── SF ── */}
                  {sfF.map((m, i) => (
                    <div key={m.id} style={{ position: "absolute", top: HDR + (i * 4 + 2) * GH - HALF, left: cSF, width: CW, zIndex: sfF.length - i }}>
                      <MobileMatchCard id={m.id} homeTeam={m.homeTeam} awayTeam={m.awayTeam} homeLabel="" awayLabel="" actualHomeTeam={m.actualHomeTeam} actualAwayTeam={m.actualAwayTeam} scorePicks={scorePicks} onScorePick={onScorePick} t={t} mono={mono} grouped={false} />
                    </div>
                  ))}

                  {/* ── SF → Final connector ── */}
                  <svg style={{ position: "absolute", top: 0, left: cCon4, pointerEvents: "none" }} width={XW} height={TOTAL_H}>
                    <path d={cp(HDR + 2 * GH, HDR + 6 * GH, HDR + 4 * GH)} fill="none" stroke={t.connector} strokeWidth={1.5} />
                  </svg>

                  {/* ── Final ── */}
                  <div style={{ position: "absolute", top: HDR + 4 * GH - HALF, left: cFin, width: CW }}>
                    <MobileMatchCard id={finM.id} homeTeam={finM.homeTeam} awayTeam={finM.awayTeam} homeLabel="" awayLabel="" scorePicks={scorePicks} onScorePick={onScorePick} t={t} mono={mono} grouped={false} />
                  </div>

                  {/* ── 3rd Place (below Final) ── */}
                  <div style={{ position: "absolute", top: HDR + 4 * GH - HALF + 240, left: cFin, width: CW }}>
                    <div style={{ marginBottom: 6, textAlign: "center" }}>
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textMuted }}>3RD PLACE</span>
                    </div>
                    <MobileMatchCard id={trdM.id} homeTeam={trdM.homeTeam} awayTeam={trdM.awayTeam} homeLabel="" awayLabel="" scorePicks={scorePicks} onScorePick={onScorePick} t={t} mono={mono} grouped={false} />
                  </div>

                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Round labels + bracket — hidden in entire_tournament mode (card list is used instead) */}
      <div className={showMobileList ? "hidden" : ""}>
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
        <span style={{
          position: "absolute", left: finalX, width: POD_W, textAlign: "center",
          fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
          textTransform: "uppercase", color: t.textMuted,
          top: HALF_H + POD_H + 28,
        }}>
          3rd Place
        </span>
      </div>

      {/* Bracket */}
      <div className="overflow-x-auto pb-4">
        <div style={{ width: totalWidth, position: "relative", height: TOTAL_H }}>

          {/* R32 pair group backgrounds — visually groups pairs that feed the same R16 slot */}
          {Array.from({ length: 4 }, (_, k) => (
            <div key={`top-bg-${k}`} style={{
              position: "absolute",
              left: colX[0] - 8,
              top: k * 2 * SLOT_H + 8,
              width: POD_W + 16,
              height: 2 * SLOT_H - 16,
              borderRadius: 12,
              border: `1px solid ${t.border}`,
              backgroundColor: mono ? "rgba(26,18,8,0.04)" : "rgba(255,255,255,0.025)",
              pointerEvents: "none",
            }} />
          ))}
          {Array.from({ length: 4 }, (_, k) => (
            <div key={`bot-bg-${k}`} style={{
              position: "absolute",
              left: colX[0] - 8,
              top: HALF_H + k * 2 * SLOT_H + 8,
              width: POD_W + 16,
              height: 2 * SLOT_H - 16,
              borderRadius: 12,
              border: `1px solid ${t.border}`,
              backgroundColor: mono ? "rgba(26,18,8,0.04)" : "rgba(255,255,255,0.025)",
              pointerEvents: "none",
            }} />
          ))}

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

          {/* 3rd Place */}
          {(() => {
            const thirdY = HALF_H + POD_H + 40;
            return activeBracket && (activeBracket.thirdPlace.home || activeBracket.thirdPlace.away)
              ? <MatchPod x={finalX} y={thirdY} podW={POD_W} homeTeam={activeBracket.thirdPlace.home} awayTeam={activeBracket.thirdPlace.away} homeLabel="" awayLabel="" matchId={THIRD_PLACE_ID} scorePicks={showPickers ? scorePicks : undefined} onScorePick={showPickers ? onScorePick : undefined} t={t} />
              : <MatchPod x={finalX} y={thirdY} podW={POD_W} t={t} />;
          })()}
        </div>
      </div>
      </div>{/* end desktop-only wrapper */}

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
  id, homeTeam, awayTeam, homeLabel, awayLabel, actualHomeTeam, actualAwayTeam, scorePicks, onScorePick, t, mono, grouped,
}: {
  id: string;
  homeTeam: TeamRow | null;
  awayTeam: TeamRow | null;
  homeLabel: string;
  awayLabel: string;
  actualHomeTeam?: TeamRow | null;
  actualAwayTeam?: TeamRow | null;
  scorePicks: Record<string, ScoreEntry>;
  onScorePick?: (matchId: string, home: number, away: number, pens?: "home" | "away") => void;
  t: Record<string, string>;
  mono: boolean;
  grouped?: boolean;
}) {
  const homeScore = scorePicks[id]?.home ?? 0;
  const awayScore = scorePicks[id]?.away ?? 0;
  const pens      = scorePicks[id]?.pens;
  const tied      = homeScore === awayScore;
  const meta      = KNOCKOUT_MATCH_META[id];
  const hasPick   = scorePicks[id] !== undefined;

  const homeWins = hasPick && (homeScore > awayScore || (tied && pens === "home"));
  const awayWins = hasPick && (awayScore > homeScore || (tied && pens === "away"));

  const [saved, setSaved] = useState(hasPick);
  useEffect(() => {
    if (!hasPick) { setSaved(false); return; }
    setSaved(false);
    const timer = setTimeout(() => setSaved(true), 800);
    return () => clearTimeout(timer);
  }, [homeScore, awayScore, pens]); // eslint-disable-line react-hooks/exhaustive-deps

  const interactive = !!onScorePick && !!homeTeam && !!awayTeam;

  function TeamRow_({ team, label, score, onMinus, onPlus, actualTeam, isWinner, isLoser }: {
    team: TeamRow | null; label: string;
    score: number; onMinus?: () => void; onPlus?: () => void;
    actualTeam?: TeamRow | null;
    isWinner?: boolean; isLoser?: boolean;
  }) {
    const isCompare = actualTeam !== undefined;
    const correct = isCompare && team && actualTeam && team.team === actualTeam.team;
    const wrong   = isCompare && team && actualTeam && team.team !== actualTeam.team;

    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "13px 14px",
        backgroundColor: isWinner ? (mono ? "rgba(26,18,8,0.05)" : "rgba(215,255,90,0.07)") : "transparent",
        borderLeft: isWinner ? `3px solid ${t.accent}` : "3px solid transparent",
        opacity: isLoser ? 0.4 : 1,
        transition: "opacity 0.2s, background-color 0.2s",
      }}>
        {label && <span style={{ fontSize: 9, color: t.textMuted, fontWeight: 900, width: 22, flexShrink: 0 }}>{label}</span>}
        {team ? (
          <>
            <FlagImage emoji={team.flag} size={20} team={team.team} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: isWinner ? 800 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: isWinner ? t.accent : correct ? "#4ADE80" : t.text,
              textDecoration: wrong ? "line-through" : "none",
              opacity: wrong ? 0.5 : 1,
            }}>
              {team.team}
            </span>
            {isWinner && !isCompare && <span style={{ fontSize: 10, fontWeight: 800, color: t.accent, flexShrink: 0, letterSpacing: "0.05em" }}>advances →</span>}
            {correct && <span style={{ fontSize: 12, color: "#4ADE80", flexShrink: 0 }}>✓</span>}
            {wrong && actualTeam && (
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text, flexShrink: 0, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {actualTeam.team}
              </span>
            )}
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 14, color: t.textMuted, fontStyle: "italic" }}>TBD</span>
        )}
        {interactive ? (
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
        ) : (
          <span style={{ fontSize: 22, fontWeight: 900, color: hasPick ? t.text : t.textMuted, minWidth: 22, textAlign: "center", flexShrink: 0 }}>
            {hasPick ? score : "—"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={grouped ? { overflow: "hidden", backgroundColor: t.card } : { border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", backgroundColor: t.card }}>
      {/* Date + venue header */}
      {meta && (
        <div style={{ padding: "7px 14px 6px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textSec }}>{meta.date}</span>
          <span style={{ fontSize: 11, color: t.border }}>·</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textSec }}>
            {knockoutKickoff(meta.date, meta.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}
          </span>
          <span style={{ fontSize: 11, color: t.border }}>·</span>
          <span style={{ fontSize: 10, color: t.textMuted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.venue}</span>
          {interactive && (
            <span
              className="transition-all duration-300"
              style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, color: "#4ADE80", opacity: hasPick ? (saved ? 1 : 0.4) : 0 }}
            >
              ✓ Saved
            </span>
          )}
        </div>
      )}

      <TeamRow_
        team={homeTeam} label={homeLabel} score={homeScore} actualTeam={actualHomeTeam}
        onMinus={() => onScorePick!(id, Math.max(0, homeScore - 1), awayScore)}
        onPlus={() => onScorePick!(id, homeScore + 1, awayScore)}
        isWinner={homeWins} isLoser={awayWins && !homeWins}
      />
      <div style={{ height: 1, backgroundColor: t.border }} />
      <TeamRow_
        team={awayTeam} label={awayLabel} score={awayScore} actualTeam={actualAwayTeam}
        onMinus={() => onScorePick!(id, homeScore, Math.max(0, awayScore - 1))}
        onPlus={() => onScorePick!(id, homeScore, awayScore + 1)}
        isWinner={awayWins} isLoser={homeWins && !awayWins}
      />

      {/* Penalty winner — shown when scores are tied */}
      {tied && (homeTeam || awayTeam) && (hasPick || interactive) && (
        <div style={{ borderTop: `1px solid ${t.border}`, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {interactive ? "Tied — who wins on penalties?" : pens ? "Won on penalties" : "Tied — no pens pick"}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { side: "home" as const, team: homeTeam, label: homeLabel || homeTeam?.team || "Home" },
              { side: "away" as const, team: awayTeam, label: awayLabel || awayTeam?.team || "Away" },
            ].map(({ side, team, label }) => {
              const selected = pens === side;
              const dimmed = !interactive && !selected;
              return (
                <button
                  key={side}
                  onClick={interactive ? () => onScorePick!(id, homeScore, awayScore, selected ? undefined : side) : undefined}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 8,
                    border: `1px solid ${selected ? t.accent : t.border}`,
                    background: "transparent",
                    color: selected ? t.accent : t.textSec,
                    fontSize: 12, fontWeight: 700,
                    cursor: interactive ? "pointer" : "default",
                    display: "flex", alignItems: "center", gap: 6,
                    opacity: dimmed ? 0.35 : 1,
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
