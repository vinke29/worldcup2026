"use client";

import { useState, useMemo } from "react";
import { MATCHES } from "@/lib/mock-data";
import { computeGroupTables } from "@/lib/group-standings";

interface QualifiersViewProps {
  scorePicks: Record<string, { home: number; away: number }>;
  mono: boolean;
}

// ── Layout constants ──────────────────────────────────────────────────────────
const POD_W = 130;      // width of one matchup pod
const POD_H = 48;       // height of pod (two 20px rows + 8px gap)
const COL_GAP = 36;     // horizontal gap between round columns
const R32_SLOTS = 8;    // matches per half
const SLOT_H = 76;      // vertical space per R32 slot

// Total canvas height = 8 slots × 76px
const CANVAS_H = R32_SLOTS * SLOT_H; // 608

// Vertical center of a pod for round r (0=R32), index i
function slotHeight(r: number) { return SLOT_H * Math.pow(2, r); }
function podTop(r: number, i: number) {
  const sh = slotHeight(r);
  return i * sh + (sh - POD_H) / 2;
}
function podCenter(r: number, i: number) {
  return podTop(r, i) + POD_H / 2;
}

// ── WC2026 bracket definition ─────────────────────────────────────────────────
// Left half: 8 R32 matches  (Groups A-H + 3rd place slots 1-4 eventually → simplified)
// Right half: 8 R32 matches (Groups I-L + 3rd place slots)
// Each slot: { kind:"group", group, pos } | { kind:"third", label }
type GroupSlot = { kind: "group"; group: string; pos: 1 | 2 };
type ThirdSlot = { kind: "third"; label: string };
type BracketSlot = GroupSlot | ThirdSlot;

interface R32Matchup { id: string; home: BracketSlot; away: BracketSlot }

// Left half — top 4 are groups A-D, bottom 4 are groups E-H
const LEFT_R32: R32Matchup[] = [
  { id: "r32-1",  home: { kind: "group", group: "A", pos: 1 }, away: { kind: "group", group: "B", pos: 2 } },
  { id: "r32-2",  home: { kind: "group", group: "C", pos: 1 }, away: { kind: "group", group: "D", pos: 2 } },
  { id: "r32-3",  home: { kind: "group", group: "B", pos: 1 }, away: { kind: "group", group: "A", pos: 2 } },
  { id: "r32-4",  home: { kind: "group", group: "D", pos: 1 }, away: { kind: "group", group: "C", pos: 2 } },
  { id: "r32-5",  home: { kind: "group", group: "E", pos: 1 }, away: { kind: "group", group: "F", pos: 2 } },
  { id: "r32-6",  home: { kind: "group", group: "G", pos: 1 }, away: { kind: "group", group: "H", pos: 2 } },
  { id: "r32-7",  home: { kind: "group", group: "F", pos: 1 }, away: { kind: "group", group: "E", pos: 2 } },
  { id: "r32-8",  home: { kind: "group", group: "H", pos: 1 }, away: { kind: "group", group: "G", pos: 2 } },
];

// Right half — groups I-L + 3rd place
const RIGHT_R32: R32Matchup[] = [
  { id: "r32-9",  home: { kind: "group", group: "I", pos: 1 }, away: { kind: "group", group: "J", pos: 2 } },
  { id: "r32-10", home: { kind: "group", group: "K", pos: 1 }, away: { kind: "group", group: "L", pos: 2 } },
  { id: "r32-11", home: { kind: "group", group: "J", pos: 1 }, away: { kind: "group", group: "I", pos: 2 } },
  { id: "r32-12", home: { kind: "group", group: "L", pos: 1 }, away: { kind: "group", group: "K", pos: 2 } },
  { id: "r32-13", home: { kind: "third", label: "3rd A/B" },   away: { kind: "third", label: "3rd C/D" } },
  { id: "r32-14", home: { kind: "third", label: "3rd E/F" },   away: { kind: "third", label: "3rd G/H" } },
  { id: "r32-15", home: { kind: "third", label: "3rd I/J" },   away: { kind: "third", label: "3rd K/L" } },
  { id: "r32-16", home: { kind: "third", label: "3rd best" },  away: { kind: "third", label: "3rd best" } },
];

type TeamInfo = { team: string; flag: string; pts: number } | null;

function resolveSlot(
  slot: BracketSlot,
  tables: Record<string, ReturnType<typeof computeGroupTables>[string]>,
): TeamInfo {
  if (slot.kind === "third") return null;
  const rows = tables[`Group ${slot.group}`] ?? [];
  const row = rows[slot.pos - 1];
  return row ? { team: row.team, flag: row.flag, pts: row.pts } : null;
}

// ── Theme helper ──────────────────────────────────────────────────────────────
function useTheme(mono: boolean) {
  return mono
    ? {
        card: "#EDE8DE", border: "#DDD9D0", text: "#1A1208",
        textSec: "#6B5E4E", textMuted: "#A89E8E",
        accent: "#1A1208", accentText: "#F7F4EE",
        bg: "#F5F0E8", connector: "#C8C0B0",
        qualify: "rgba(26,18,8,0.06)",
      }
    : {
        card: "#1A2E1F", border: "#2C4832", text: "#F0EDE6",
        textSec: "#B3C9B7", textMuted: "#7A9B84",
        accent: "#D7FF5A", accentText: "#0B1E0D",
        bg: "#0B1E0D", connector: "#2C4832",
        qualify: "rgba(215,255,90,0.05)",
      };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QualifiersView({ scorePicks, mono }: QualifiersViewProps) {
  const [view, setView] = useState<"predicted" | "actual">("predicted");
  const t = useTheme(mono);

  const hasActual = useMemo(() => MATCHES.some(m => m.homeScore !== null), []);
  const predictedTables = useMemo(() => computeGroupTables(MATCHES, scorePicks, false), [scorePicks]);
  const actualTables    = useMemo(() => computeGroupTables(MATCHES, scorePicks, true), []);
  const tables = view === "predicted" ? predictedTables : actualTables;

  // Resolve all R32 teams
  const leftTeams  = LEFT_R32.map(m => ({
    home: resolveSlot(m.home, tables),
    away: resolveSlot(m.away, tables),
    homeSlot: m.home,
    awaySlot: m.away,
  }));
  const rightTeams = RIGHT_R32.map(m => ({
    home: resolveSlot(m.home, tables),
    away: resolveSlot(m.away, tables),
    homeSlot: m.home,
    awaySlot: m.away,
  }));

  // ── Column x positions ────────────────────────────────────────────────────
  // Left bracket (L→R): R32, R16, QF, SF
  // Center: Final
  // Right bracket (R←L, mirrored): SF, QF, R16, R32
  const ROUNDS = 4; // R32=0, R16=1, QF=2, SF=3
  const leftColX  = Array.from({ length: ROUNDS }, (_, r) => r * (POD_W + COL_GAP));
  const leftWidth = ROUNDS * POD_W + (ROUNDS - 1) * COL_GAP;
  const FINAL_GAP = 48;
  const finalX = leftWidth + FINAL_GAP;
  const rightStart = finalX + POD_W + FINAL_GAP;
  const rightColX = Array.from({ length: ROUNDS }, (_, r) => rightStart + (ROUNDS - 1 - r) * (POD_W + COL_GAP));
  const totalWidth = rightColX[0] + POD_W;

  // ── SVG connector paths ───────────────────────────────────────────────────
  function leftConnectors(round: number) {
    const paths: string[] = [];
    const matchCount = R32_SLOTS / Math.pow(2, round);
    const x1 = leftColX[round] + POD_W;
    const x2 = leftColX[round + 1];
    const midX = x1 + COL_GAP / 2;

    for (let i = 0; i < matchCount; i += 2) {
      const y1 = podCenter(round, i);
      const y2 = podCenter(round, i + 1);
      const yNext = podCenter(round + 1, i / 2);
      // Elbow from match i → next round
      paths.push(`M ${x1} ${y1} H ${midX} V ${yNext} H ${x2}`);
      // Elbow from match i+1 → next round
      paths.push(`M ${x1} ${y2} H ${midX} V ${yNext} H ${x2}`);
    }
    return paths;
  }

  function rightConnectors(round: number) {
    // Mirror: rightColX[round] is the "output" side (right edge)
    const paths: string[] = [];
    const matchCount = R32_SLOTS / Math.pow(2, round);
    const x1 = rightColX[round];                 // left edge of this round's column
    const x2 = rightColX[round + 1] + POD_W;     // right edge of next round inward
    const midX = x1 - COL_GAP / 2;               // connector meets halfway in the gap

    for (let i = 0; i < matchCount; i += 2) {
      const y1 = podCenter(round, i);
      const y2 = podCenter(round, i + 1);
      const yNext = podCenter(round + 1, i / 2);
      paths.push(`M ${x1} ${y1} H ${midX} V ${yNext} H ${x2}`);
      paths.push(`M ${x1} ${y2} H ${midX} V ${yNext} H ${x2}`);
    }
    return paths;
  }

  // SF → Final connectors
  function finalConnectors() {
    const paths: string[] = [];
    // Left SF (round 3, match 0) → final
    const lx = leftColX[3] + POD_W;
    const ly = podCenter(3, 0);
    const fx = finalX;
    const fy = CANVAS_H / 2;
    const lmid = lx + (fx - lx) / 2;
    paths.push(`M ${lx} ${ly} H ${lmid} V ${fy} H ${fx}`);
    // Right SF → final
    const rx = rightColX[3];
    const ry = podCenter(3, 0);
    const rx2 = finalX + POD_W;
    const rmid = rx - (rx - rx2) / 2;
    paths.push(`M ${rx} ${ry} H ${rmid} V ${fy} H ${rx2}`);
    return paths;
  }

  const allConnectorPaths = [
    ...leftConnectors(0),
    ...leftConnectors(1),
    ...leftConnectors(2),
    ...rightConnectors(0),
    ...rightConnectors(1),
    ...rightConnectors(2),
    ...finalConnectors(),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center gap-3 mb-5">
        {(["predicted", "actual"] as const).map((v) => {
          const active = view === v;
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

      {/* Round labels */}
      <div className="overflow-x-auto pb-4">
        <div style={{ width: totalWidth, position: "relative" }}>
          {/* Labels row */}
          <div style={{ position: "relative", height: 20, marginBottom: 8 }}>
            {(["R32", "R16", "QF", "SF"] as const).map((label, r) => (
              <span
                key={label}
                style={{
                  position: "absolute",
                  left: leftColX[r],
                  width: POD_W,
                  textAlign: "center",
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: t.textMuted,
                }}
              >
                {label}
              </span>
            ))}
            <span
              style={{
                position: "absolute",
                left: finalX,
                width: POD_W,
                textAlign: "center",
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: t.accent,
              }}
            >
              Final
            </span>
            {(["SF", "QF", "R16", "R32"] as const).map((label, r) => (
              <span
                key={label + "-r"}
                style={{
                  position: "absolute",
                  left: rightColX[ROUNDS - 1 - r],
                  width: POD_W,
                  textAlign: "center",
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: t.textMuted,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Bracket canvas */}
          <div style={{ position: "relative", height: CANVAS_H }}>
            {/* SVG connectors */}
            <svg
              style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
              width={totalWidth}
              height={CANVAS_H}
            >
              {allConnectorPaths.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={t.connector} strokeWidth={1.5} />
              ))}
            </svg>

            {/* Left R32 pods */}
            {leftTeams.map((m, i) => (
              <MatchPod
                key={`l-r32-${i}`}
                x={leftColX[0]}
                y={podTop(0, i)}
                home={m.home}
                away={m.away}
                homeLabel={slotLabel(m.homeSlot)}
                awayLabel={slotLabel(m.awaySlot)}
                isTbd={false}
                t={t}
              />
            ))}

            {/* Left R16 pods (TBD) */}
            {Array.from({ length: 4 }, (_, i) => (
              <MatchPod
                key={`l-r16-${i}`}
                x={leftColX[1]}
                y={podTop(1, i)}
                isTbd
                t={t}
              />
            ))}

            {/* Left QF pods (TBD) */}
            {Array.from({ length: 2 }, (_, i) => (
              <MatchPod
                key={`l-qf-${i}`}
                x={leftColX[2]}
                y={podTop(2, i)}
                isTbd
                t={t}
              />
            ))}

            {/* Left SF pod (TBD) */}
            <MatchPod
              x={leftColX[3]}
              y={podTop(3, 0)}
              isTbd
              t={t}
            />

            {/* Final pod */}
            <MatchPod
              x={finalX}
              y={CANVAS_H / 2 - POD_H / 2}
              isTbd
              isFinal
              t={t}
            />

            {/* Right SF pod (TBD) */}
            <MatchPod
              x={rightColX[3]}
              y={podTop(3, 0)}
              isTbd
              t={t}
            />

            {/* Right QF pods (TBD) */}
            {Array.from({ length: 2 }, (_, i) => (
              <MatchPod
                key={`r-qf-${i}`}
                x={rightColX[2]}
                y={podTop(2, i)}
                isTbd
                t={t}
              />
            ))}

            {/* Right R16 pods (TBD) */}
            {Array.from({ length: 4 }, (_, i) => (
              <MatchPod
                key={`r-r16-${i}`}
                x={rightColX[1]}
                y={podTop(1, i)}
                isTbd
                t={t}
              />
            ))}

            {/* Right R32 pods */}
            {rightTeams.map((m, i) => (
              <MatchPod
                key={`r-r32-${i}`}
                x={rightColX[0]}
                y={podTop(0, i)}
                home={m.home}
                away={m.away}
                homeLabel={slotLabel(m.homeSlot)}
                awayLabel={slotLabel(m.awaySlot)}
                isTbd={false}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
        3rd place: 8 of 12 advance on Pts → GD → GF. Pairings confirmed after group stage. R16 onwards unlocks as matches are played.
      </p>
    </div>
  );
}

function slotLabel(slot: BracketSlot): string {
  if (slot.kind === "third") return slot.label;
  return `${slot.group}${slot.pos}`;
}

// ── MatchPod ─────────────────────────────────────────────────────────────────
interface MatchPodProps {
  x: number;
  y: number;
  home?: TeamInfo;
  away?: TeamInfo;
  homeLabel?: string;
  awayLabel?: string;
  isTbd: boolean;
  isFinal?: boolean;
  t: Record<string, string>;
}

function MatchPod({ x, y, home, away, homeLabel, awayLabel, isTbd, isFinal, t }: MatchPodProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: POD_W,
        height: POD_H,
        borderRadius: 8,
        border: `1px solid ${isFinal ? t.accent : t.border}`,
        backgroundColor: isFinal ? (t.accent === "#D7FF5A" ? "rgba(215,255,90,0.07)" : "rgba(26,18,8,0.08)") : t.card,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isTbd ? (
        <>
          <TbdRow t={t} />
          <div style={{ height: 1, backgroundColor: t.border, flexShrink: 0 }} />
          <TbdRow t={t} />
        </>
      ) : (
        <>
          <TeamRowPod team={home ?? null} label={homeLabel ?? ""} t={t} />
          <div style={{ height: 1, backgroundColor: t.border, flexShrink: 0 }} />
          <TeamRowPod team={away ?? null} label={awayLabel ?? ""} t={t} />
        </>
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

function TeamRowPod({ team, label, t }: { team: TeamInfo; label: string; t: Record<string, string> }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, paddingInline: 6, minWidth: 0 }}>
      <span style={{ fontSize: 8, color: t.textMuted, fontWeight: 900, letterSpacing: "0.05em", flexShrink: 0, width: 18 }}>
        {label}
      </span>
      {team ? (
        <>
          <span style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{team.flag}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
