"use client";

import { useState, useMemo } from "react";
import { MATCHES } from "@/lib/mock-data";
import { computeGroupTables, rankThirdPlaceTeams, type TeamRow } from "@/lib/group-standings";

interface QualifiersViewProps {
  scorePicks: Record<string, { home: number; away: number }>;
  mono: boolean;
}

// ── Layout constants ──────────────────────────────────────────────────────────
const POD_W   = 132;  // pod width
const POD_H   = 48;   // pod height (two team rows)
const COL_GAP = 32;   // gap between round columns
const SLOTS   = 8;    // matches per half
const SLOT_H  = 76;   // vertical space per R32 slot
const CANVAS_H = SLOTS * SLOT_H; // 608px

function slotHeight(r: number)  { return SLOT_H * Math.pow(2, r); }
function podTop(r: number, i: number) {
  const sh = slotHeight(r);
  return i * sh + (sh - POD_H) / 2;
}
function podCenter(r: number, i: number) { return podTop(r, i) + POD_H / 2; }

// ── Bracket slot types ────────────────────────────────────────────────────────
type WinnerSlot   = { kind: "winner";  group: string };
type RunnerUpSlot = { kind: "runner";  group: string };
type ThirdSlot    = { kind: "third";   eligible: string[] };
type BracketSlot  = WinnerSlot | RunnerUpSlot | ThirdSlot;

interface R32Match { id: string; home: BracketSlot; away: BracketSlot }

// ── Actual FIFA WC2026 R32 draw ───────────────────────────────────────────────
// Source: 2026 FIFA World Cup knockout stage bracket (matches 73–88)
// Left half feeds SF 101; Right half feeds SF 102.
// Slot ordering within each half drives the bracket tree via podTop/podCenter.

/** Left half — 8 slots top→bottom (feeds into SF 101 side) */
const LEFT_R32: R32Match[] = [
  // R16-89 top pair → QF-97
  { id: "m74", home: { kind: "winner", group: "E" },  away: { kind: "third",  eligible: ["A","B","C","D","F"] } },
  { id: "m77", home: { kind: "winner", group: "I" },  away: { kind: "third",  eligible: ["C","D","F","G","H"] } },
  // R16-90 bottom pair → QF-97
  { id: "m73", home: { kind: "runner", group: "A" },  away: { kind: "runner", group: "B" } },
  { id: "m75", home: { kind: "winner", group: "F" },  away: { kind: "runner", group: "C" } },
  // R16-93 top pair → QF-98
  { id: "m83", home: { kind: "runner", group: "K" },  away: { kind: "runner", group: "L" } },
  { id: "m84", home: { kind: "winner", group: "H" },  away: { kind: "runner", group: "J" } },
  // R16-94 bottom pair → QF-98
  { id: "m81", home: { kind: "winner", group: "D" },  away: { kind: "third",  eligible: ["B","E","F","I","J"] } },
  { id: "m82", home: { kind: "winner", group: "G" },  away: { kind: "third",  eligible: ["A","E","H","I","J"] } },
];

/** Right half — 8 slots top→bottom (feeds into SF 102 side) */
const RIGHT_R32: R32Match[] = [
  // R16-91 top pair → QF-99
  { id: "m76", home: { kind: "winner", group: "C" },  away: { kind: "runner", group: "F" } },
  { id: "m78", home: { kind: "runner", group: "E" },  away: { kind: "runner", group: "I" } },
  // R16-92 bottom pair → QF-99
  { id: "m79", home: { kind: "winner", group: "A" },  away: { kind: "third",  eligible: ["C","E","F","H","I"] } },
  { id: "m80", home: { kind: "winner", group: "L" },  away: { kind: "third",  eligible: ["E","H","I","J","K"] } },
  // R16-95 top pair → QF-100
  { id: "m86", home: { kind: "winner", group: "J" },  away: { kind: "runner", group: "H" } },
  { id: "m88", home: { kind: "runner", group: "D" },  away: { kind: "runner", group: "G" } },
  // R16-96 bottom pair → QF-100
  { id: "m85", home: { kind: "winner", group: "B" },  away: { kind: "third",  eligible: ["E","F","G","I","J"] } },
  { id: "m87", home: { kind: "winner", group: "K" },  away: { kind: "third",  eligible: ["D","E","I","J","L"] } },
];

// Which matchIds carry a third-place slot and their eligible groups
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

/**
 * Backtracking assignment: map each 3rd-place slot to one of the 8 qualifying groups,
 * respecting the eligible-groups constraint. Returns matchId → assigned group letter.
 */
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

// ── Theme ─────────────────────────────────────────────────────────────────────
function useTheme(mono: boolean) {
  return mono
    ? { card: "#EDE8DE", border: "#DDD9D0", text: "#1A1208", textSec: "#6B5E4E", textMuted: "#A89E8E",
        accent: "#1A1208", accentText: "#F7F4EE", connector: "#C8C0B0", finalBg: "rgba(26,18,8,0.06)" }
    : { card: "#1A2E1F", border: "#2C4832", text: "#F0EDE6", textSec: "#B3C9B7", textMuted: "#7A9B84",
        accent: "#D7FF5A", accentText: "#0B1E0D", connector: "#2C4832", finalBg: "rgba(215,255,90,0.06)" };
}

// ── Slot helpers ──────────────────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
export default function QualifiersView({ scorePicks, mono }: QualifiersViewProps) {
  const [view, setView] = useState<"predicted" | "actual">("predicted");
  const t = useTheme(mono);

  const hasActual       = useMemo(() => MATCHES.some(m => m.homeScore !== null), []);
  const predictedTables = useMemo(() => computeGroupTables(MATCHES, scorePicks, false), [scorePicks]);
  const actualTables    = useMemo(() => computeGroupTables(MATCHES, scorePicks, true), []);
  const tables = view === "predicted" ? predictedTables : actualTables;

  // Rank 3rd-place teams, pick top 8, assign to slots
  const thirdMap = useMemo(() => {
    const ranked  = rankThirdPlaceTeams(tables);
    const top8    = ranked.slice(0, 8);
    const byGroup: Record<string, TeamRow> = {};
    for (const { group, row } of ranked) byGroup[group] = row;

    const qualGroups    = top8.map(t => t.group);
    const groupAssign   = assignThirdPlaceGroups(qualGroups);      // matchId → group
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

  // ── Column positions ───────────────────────────────────────────────────────
  const ROUNDS = 4;
  const leftColX  = Array.from({ length: ROUNDS }, (_, r) => r * (POD_W + COL_GAP));
  const leftWidth = ROUNDS * POD_W + (ROUNDS - 1) * COL_GAP;
  const FINAL_GAP = 44;
  const finalX    = leftWidth + FINAL_GAP;
  const rightStart = finalX + POD_W + FINAL_GAP;
  const rightColX  = Array.from({ length: ROUNDS }, (_, r) => rightStart + (ROUNDS - 1 - r) * (POD_W + COL_GAP));
  const totalWidth = rightColX[0] + POD_W;

  // ── SVG connectors ─────────────────────────────────────────────────────────
  function leftConnectors(round: number) {
    const paths: string[] = [];
    const count = SLOTS / Math.pow(2, round);
    const x1 = leftColX[round] + POD_W;
    const x2 = leftColX[round + 1];
    const midX = x1 + COL_GAP / 2;
    for (let i = 0; i < count; i += 2) {
      const y1 = podCenter(round, i);
      const y2 = podCenter(round, i + 1);
      const yn = podCenter(round + 1, i / 2);
      paths.push(`M ${x1} ${y1} H ${midX} V ${yn} H ${x2}`);
      paths.push(`M ${x1} ${y2} H ${midX} V ${yn} H ${x2}`);
    }
    return paths;
  }

  function rightConnectors(round: number) {
    const paths: string[] = [];
    const count = SLOTS / Math.pow(2, round);
    const x1   = rightColX[round];
    const x2   = rightColX[round + 1] + POD_W;
    const midX = x1 - COL_GAP / 2;
    for (let i = 0; i < count; i += 2) {
      const y1 = podCenter(round, i);
      const y2 = podCenter(round, i + 1);
      const yn = podCenter(round + 1, i / 2);
      paths.push(`M ${x1} ${y1} H ${midX} V ${yn} H ${x2}`);
      paths.push(`M ${x1} ${y2} H ${midX} V ${yn} H ${x2}`);
    }
    return paths;
  }

  function finalConnectors() {
    const paths: string[] = [];
    const fy = CANVAS_H / 2;
    // Left SF → Final
    const lx  = leftColX[3] + POD_W;
    const ly  = podCenter(3, 0);
    const lmx = lx + (finalX - lx) / 2;
    paths.push(`M ${lx} ${ly} H ${lmx} V ${fy} H ${finalX}`);
    // Right SF → Final
    const rx  = rightColX[3];
    const ry  = podCenter(3, 0);
    const rmx = rx - (rx - (finalX + POD_W)) / 2;
    paths.push(`M ${rx} ${ry} H ${rmx} V ${fy} H ${finalX + POD_W}`);
    return paths;
  }

  const connectorPaths = [
    ...leftConnectors(0), ...leftConnectors(1), ...leftConnectors(2),
    ...rightConnectors(0), ...rightConnectors(1), ...rightConnectors(2),
    ...finalConnectors(),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center gap-3 mb-5">
        {(["predicted", "actual"] as const).map((v) => {
          const active   = view === v;
          const disabled = v === "actual" && !hasActual;
          return (
            <button
              key={v}
              onClick={() => !disabled && setView(v)}
              disabled={disabled}
              className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: active ? t.accent : "transparent",
                color: active ? t.accentText : disabled ? t.textMuted : t.textSec,
                border: `1px solid ${active ? t.accent : t.border}`,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {v === "predicted" ? "My Picks" : "Actual"}
            </button>
          );
        })}
        {!hasActual && (
          <span className="text-[11px]" style={{ color: t.textMuted }}>
            Actual unlocks once results are in
          </span>
        )}
      </div>

      {/* Bracket */}
      <div className="overflow-x-auto pb-4">
        <div style={{ width: totalWidth, position: "relative" }}>

          {/* Round labels */}
          <div style={{ position: "relative", height: 20, marginBottom: 8 }}>
            {(["R32","R16","QF","SF"] as const).map((lbl, r) => (
              <span key={lbl} style={{ position: "absolute", left: leftColX[r], width: POD_W, textAlign: "center",
                fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textMuted }}>
                {lbl}
              </span>
            ))}
            <span style={{ position: "absolute", left: finalX, width: POD_W, textAlign: "center",
              fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: t.accent }}>
              Final
            </span>
            {(["SF","QF","R16","R32"] as const).map((lbl, r) => (
              <span key={lbl + "r"} style={{ position: "absolute", left: rightColX[ROUNDS - 1 - r], width: POD_W, textAlign: "center",
                fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textMuted }}>
                {lbl}
              </span>
            ))}
          </div>

          {/* Canvas */}
          <div style={{ position: "relative", height: CANVAS_H }}>

            {/* SVG connectors */}
            <svg style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
              width={totalWidth} height={CANVAS_H}>
              {connectorPaths.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={t.connector} strokeWidth={1.5} />
              ))}
            </svg>

            {/* Left R32 */}
            {LEFT_R32.map((m, i) => (
              <MatchPod key={m.id}
                x={leftColX[0]} y={podTop(0, i)}
                homeTeam={resolveTeam(m.home, tables, m.id, thirdMap)}
                awayTeam={resolveTeam(m.away, tables, m.id, thirdMap)}
                homeLabel={slotLabel(m.home, m.home.kind === "third" ? thirdGroupAssign[m.id] : undefined)}
                awayLabel={slotLabel(m.away, m.away.kind === "third" ? thirdGroupAssign[m.id] : undefined)}
                t={t}
              />
            ))}

            {/* Left R16 / QF / SF — TBD */}
            {[1,2,3].flatMap(r =>
              Array.from({ length: SLOTS / Math.pow(2, r) }, (_, i) => (
                <TbdPod key={`l-r${r}-${i}`} x={leftColX[r]} y={podTop(r, i)} t={t} />
              ))
            )}

            {/* Final */}
            <MatchPod
              x={finalX} y={CANVAS_H / 2 - POD_H / 2}
              isFinal t={t}
            />

            {/* Right SF / QF / R16 — TBD */}
            {[3,2,1].flatMap(r =>
              Array.from({ length: SLOTS / Math.pow(2, r) }, (_, i) => (
                <TbdPod key={`r-r${r}-${i}`} x={rightColX[r]} y={podTop(r, i)} t={t} />
              ))
            )}

            {/* Right R32 */}
            {RIGHT_R32.map((m, i) => (
              <MatchPod key={m.id}
                x={rightColX[0]} y={podTop(0, i)}
                homeTeam={resolveTeam(m.home, tables, m.id, thirdMap)}
                awayTeam={resolveTeam(m.away, tables, m.id, thirdMap)}
                homeLabel={slotLabel(m.home, m.home.kind === "third" ? thirdGroupAssign[m.id] : undefined)}
                awayLabel={slotLabel(m.away, m.away.kind === "third" ? thirdGroupAssign[m.id] : undefined)}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
        3rd-place: best 8 of 12 advance (Pts → GD → GF). Slot assignment follows FIFA Annex C.
        R16 onwards unlocks as matches are played.
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface PodProps {
  x: number; y: number;
  homeTeam?: TeamRow | null;
  awayTeam?: TeamRow | null;
  homeLabel?: string;
  awayLabel?: string;
  isFinal?: boolean;
  t: Record<string, string>;
}

function MatchPod({ x, y, homeTeam, awayTeam, homeLabel, awayLabel, isFinal, t }: PodProps) {
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: POD_W, height: POD_H,
      borderRadius: 8, border: `1px solid ${isFinal ? t.accent : t.border}`,
      backgroundColor: isFinal ? t.finalBg : t.card,
      overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <TeamRow team={homeTeam ?? null} label={homeLabel ?? "TBD"} t={t} />
      <div style={{ height: 1, backgroundColor: t.border, flexShrink: 0 }} />
      <TeamRow team={awayTeam ?? null} label={awayLabel ?? "TBD"} t={t} />
    </div>
  );
}

function TbdPod({ x, y, t }: { x: number; y: number; t: Record<string, string> }) {
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: POD_W, height: POD_H,
      borderRadius: 8, border: `1px solid ${t.border}`,
      backgroundColor: t.card, overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <TbdRow t={t} />
      <div style={{ height: 1, backgroundColor: t.border, flexShrink: 0 }} />
      <TbdRow t={t} />
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

function TeamRow({ team, label, t }: { team: TeamRow | null; label: string; t: Record<string, string> }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, paddingInline: 6, minWidth: 0 }}>
      <span style={{ fontSize: 8, color: t.textMuted, fontWeight: 900, letterSpacing: "0.05em",
        flexShrink: 0, width: 20, textAlign: "left" }}>
        {label}
      </span>
      {team ? (
        <>
          <span style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{team.flag}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.text, flex: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {team.team.split(" ").slice(-1)[0]}
          </span>
          <span style={{ fontSize: 9, color: t.textMuted, flexShrink: 0 }}>{team.pts}p</span>
        </>
      ) : (
        <span style={{ fontSize: 10, color: t.textMuted, fontStyle: "italic" }}>TBD</span>
      )}
    </div>
  );
}
