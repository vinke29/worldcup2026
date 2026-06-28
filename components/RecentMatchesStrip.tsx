"use client";

import { useMemo, useState } from "react";
import type { Match, Outcome, Member } from "@/lib/mock-data";
import type { KnockoutMatchup } from "@/lib/bracket";
import FlagImage from "@/lib/flag-image";

interface RecentMatchesStripProps {
  matches: Match[];                                           // full match list (with actual scores merged in)
  predictions: Record<string, Outcome>;
  scorePredictions: Record<string, { home: number; away: number }>;
  mono: boolean;
  onGoToMatches: () => void;
  members?: Member[];                                         // all league members (for the per-match breakdown)
  currentUserId?: string;
  // memberId → matchId → that member's OWN predicted knockout matchup
  koMatchupsByMember?: Record<string, Record<string, KnockoutMatchup>>;
  canSeePicks?: boolean;                                      // reveal everyone's picks (picks frozen)
}

function kickoffMs(date: string, time: string): number {
  const months: Record<string, number> = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
  };
  const [mon, day] = date.split(" ");
  const [h, m] = time.split(":").map(Number);
  return Date.UTC(2026, months[mon], Number(day), h + 4, m);
}

/** Pick the relevant matches to show:
 *  1. Any match kicking off within ±24h of now
 *  2. If that window is empty, fall back to the most recent matchday that has past games
 */
const KO_PHASES = ["r32", "r16", "qf", "sf", "third", "final"];

function relevantMatches(matches: Match[], now: number): { window: Match[]; label: string } {
  const H24 = 24 * 60 * 60 * 1000;
  // Group stage + any resolved knockout fixtures
  const groupMatches = matches.filter(
    (m) => m.phase.startsWith("group") || KO_PHASES.includes(m.phase),
  );

  const windowed = groupMatches.filter((m) => {
    const ko = kickoffMs(m.date, m.time);
    return ko >= now - H24 && ko <= now + H24;
  });

  if (windowed.length > 0) {
    // Collect unique dates in window for the label
    const dates = [...new Set(windowed.map((m) => m.date))].sort();
    const label = dates.length === 1 ? dates[0] : `${dates[0]} – ${dates[dates.length - 1]}`;
    return { window: windowed, label };
  }

  // Fallback: most recent matchday with at least one kicked-off game
  const pastDates = [...new Set(
    groupMatches
      .filter((m) => kickoffMs(m.date, m.time) < now)
      .map((m) => m.date)
  )].sort();

  if (pastDates.length === 0) {
    // Tournament hasn't started yet — fall forward to the first upcoming matchday
    const futureDates = [...new Set(
      groupMatches
        .filter((m) => kickoffMs(m.date, m.time) > now)
        .map((m) => m.date)
    )].sort();
    if (futureDates.length === 0) return { window: [], label: "" };
    const firstDate = futureDates[0];
    return { window: groupMatches.filter((m) => m.date === firstDate), label: "Opening day" };
  }

  const lastDate = pastDates[pastDates.length - 1];
  const fallback = groupMatches.filter((m) => m.date === lastDate);
  return { window: fallback, label: lastDate };
}

export default function RecentMatchesStrip({
  matches,
  predictions,
  scorePredictions,
  mono,
  onGoToMatches,
  members = [],
  currentUserId,
  koMatchupsByMember = {},
  canSeePicks = false,
}: RecentMatchesStripProps) {
  const now = Date.now();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { window: relevant, label } = useMemo(
    () => relevantMatches(matches, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matches]
  );

  if (relevant.length === 0) return null;

  const t = mono
    ? {
        cardBg: "#F7F4EE",
        cardBgDeep: "#EDE8E0",
        border: "#DDD9D0",
        borderInner: "#E5E1D8",
        textPrimary: "#1A1208",
        textSec: "#6B5E4E",
        textMuted: "#A89E8E",
        accent: "#1A1208",
        correct: "#16A34A",
        wrong: "#DC2626",
        live: "#16A34A",
        avatar: "#E0DAD0",
        avatarText: "#6B5E4E",
        rowHover: "rgba(26,18,8,0.03)",
      }
    : {
        cardBg: "#1A2E1F",
        cardBgDeep: "#0F2411",
        border: "#2C4832",
        borderInner: "#1F3A24",
        textPrimary: "#F0EDE6",
        textSec: "#7A9B84",
        textMuted: "#4A6B50",
        accent: "#D7FF5A",
        correct: "#4ADE80",
        wrong: "#F87171",
        live: "#4ADE80",
        avatar: "#1F3A24",
        avatarText: "#7A9B84",
        rowHover: "rgba(255,255,255,0.02)",
      };

  // Group by date for section headers
  const byDate = relevant.reduce<Record<string, Match[]>>((acc, m) => {
    if (!acc[m.date]) acc[m.date] = [];
    acc[m.date].push(m);
    return acc;
  }, {});

  const dates = Object.keys(byDate).sort();

  return (
    <div
      className="rounded-2xl overflow-hidden border mb-4"
      style={{ backgroundColor: t.cardBg, borderColor: t.border }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: t.borderInner }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
            Recent &amp; upcoming
          </span>
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: mono ? "rgba(26,18,8,0.06)" : "rgba(215,255,90,0.08)",
              color: t.accent,
              border: `1px solid ${mono ? "rgba(26,18,8,0.15)" : "rgba(215,255,90,0.2)"}`,
            }}
          >
            {label}
          </span>
        </div>
        <button
          onClick={onGoToMatches}
          className="text-[10px] font-bold cursor-pointer hover:opacity-70 transition-opacity"
          style={{ color: t.textSec }}
        >
          All matches →
        </button>
      </div>

      {/* Match rows */}
      <div className="divide-y" style={{ borderColor: t.borderInner }}>
        {dates.map((date) =>
          byDate[date].map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              prediction={predictions[match.id]}
              scorePick={scorePredictions[match.id]}
              now={now}
              t={t}
              mono={mono}
              members={members}
              currentUserId={currentUserId}
              currentUserPredictions={predictions}
              currentUserScorePicks={scorePredictions}
              koMatchupsByMember={koMatchupsByMember}
              canSeePicks={canSeePicks}
              expanded={expandedId === match.id}
              onToggle={() => setExpandedId((prev) => (prev === match.id ? null : match.id))}
            />
          ))
        )}
      </div>
    </div>
  );
}

function outcomeOf(home: number, away: number): Outcome {
  return home > away ? "home" : away > home ? "away" : "draw";
}

function MatchRow({
  match,
  prediction,
  scorePick,
  now,
  t,
  mono,
  members,
  currentUserId,
  currentUserPredictions,
  currentUserScorePicks,
  koMatchupsByMember,
  canSeePicks,
  expanded,
  onToggle,
}: {
  match: Match;
  prediction: Outcome | undefined;
  scorePick: { home: number; away: number } | undefined;
  now: number;
  t: Record<string, string>;
  mono: boolean;
  members: Member[];
  currentUserId?: string;
  currentUserPredictions: Record<string, Outcome>;
  currentUserScorePicks: Record<string, { home: number; away: number }>;
  koMatchupsByMember: Record<string, Record<string, KnockoutMatchup>>;
  canSeePicks: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isKnockout = KO_PHASES.includes(match.phase);
  const ko = kickoffMs(match.date, match.time);
  const isLive = now >= ko && now < ko + 105 * 60 * 1000;
  const isFinished = match.homeScore !== null && match.awayScore !== null;
  const isUpcoming = now < ko;

  const actualOutcome: Outcome | null = isFinished
    ? outcomeOf(match.homeScore!, match.awayScore!)
    : null;

  // KO rows only have a score pick (no outcome prediction) — derive the outcome
  const predictedOutcome: Outcome | undefined =
    prediction ?? (scorePick ? outcomeOf(scorePick.home, scorePick.away) : undefined);
  const isCorrect = isFinished && predictedOutcome != null && predictedOutcome === actualOutcome;
  const isWrong   = isFinished && predictedOutcome != null && predictedOutcome !== actualOutcome;

  const localTime = new Date(ko).toLocaleTimeString(undefined, {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const canExpand = canSeePicks && members.length > 0;

  // Build the per-member pick rows for this match (current user first, then by name)
  const memberPicks = expanded
    ? members
        .map((m) => {
          const isMe = m.id === currentUserId;
          const mScore = isMe ? currentUserScorePicks[match.id] : m.scorePicks?.[match.id];
          const mOutcome = isMe ? currentUserPredictions[match.id] : m.predictions?.[match.id];
          return { id: m.id, name: m.name, avatar: m.avatar, isMe, mScore, mOutcome };
        })
        .sort((a, b) => (a.isMe === b.isMe ? a.name.localeCompare(b.name) : a.isMe ? -1 : 1))
    : [];

  return (
    <div>
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 transition-colors"
        onClick={canExpand ? onToggle : undefined}
        style={{
          cursor: canExpand ? "pointer" : "default",
          backgroundColor: expanded ? t.rowHover : "transparent",
        }}
      >

        {/* Status / time */}
        <div className="w-11 sm:w-14 flex-shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: t.live }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: t.live }} />
              Live
            </span>
          ) : isFinished ? (
            <span className="text-[10px] font-bold" style={{ color: t.textMuted }}>FT</span>
          ) : (
            <span className="text-[10px] font-bold" style={{ color: t.textMuted }}>{localTime}</span>
          )}
        </div>

        {/* Home team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span
            className="text-xs font-black uppercase tracking-tight truncate text-right"
            style={{ color: t.textPrimary }}
          >
            {match.homeTeam}
          </span>
          <FlagImage emoji={match.homeFlag} size={16} team={match.homeTeam} />
        </div>

        {/* Score or VS */}
        <div className="flex-shrink-0 w-12 sm:w-16 text-center">
          {isFinished ? (
            <span className="text-sm font-black tabular-nums" style={{ color: t.textPrimary }}>
              {match.homeScore} – {match.awayScore}
            </span>
          ) : isLive ? (
            <span className="text-sm font-black" style={{ color: t.live }}>vs</span>
          ) : (
            <span className="text-[10px] font-black tracking-widest" style={{ color: t.textMuted }}>vs</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <FlagImage emoji={match.awayFlag} size={16} team={match.awayTeam} />
          <span
            className="text-xs font-black uppercase tracking-tight truncate"
            style={{ color: t.textPrimary }}
          >
            {match.awayTeam}
          </span>
        </div>

        {/* Pick badge + expand chevron */}
        <div className="w-[68px] sm:w-16 flex-shrink-0 flex items-center justify-end gap-1">
          {scorePick !== undefined ? (
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums whitespace-nowrap"
              style={{
                backgroundColor: isCorrect
                  ? (mono ? "rgba(22,163,74,0.1)" : "rgba(74,222,128,0.12)")
                  : isWrong
                  ? (mono ? "rgba(220,38,38,0.08)" : "rgba(248,113,113,0.1)")
                  : (mono ? "rgba(26,18,8,0.06)" : "rgba(255,255,255,0.06)"),
                color: isCorrect ? t.correct : isWrong ? t.wrong : t.textSec,
                border: `1px solid ${isCorrect ? (mono ? "rgba(22,163,74,0.2)" : "rgba(74,222,128,0.25)") : isWrong ? (mono ? "rgba(220,38,38,0.15)" : "rgba(248,113,113,0.2)") : t.borderInner}`,
              }}
            >
              {isCorrect ? "✓ " : isWrong ? "✗ " : ""}{scorePick.home}–{scorePick.away}
            </span>
          ) : prediction ? (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap"
              style={{
                backgroundColor: isCorrect
                  ? (mono ? "rgba(22,163,74,0.1)" : "rgba(74,222,128,0.12)")
                  : isWrong
                  ? (mono ? "rgba(220,38,38,0.08)" : "rgba(248,113,113,0.1)")
                  : (mono ? "rgba(26,18,8,0.06)" : "rgba(255,255,255,0.06)"),
                color: isCorrect ? t.correct : isWrong ? t.wrong : t.textSec,
                border: `1px solid ${isCorrect ? (mono ? "rgba(22,163,74,0.2)" : "rgba(74,222,128,0.25)") : isWrong ? (mono ? "rgba(220,38,38,0.15)" : "rgba(248,113,113,0.2)") : t.borderInner}`,
              }}
            >
              {isCorrect ? "✓ " : isWrong ? "✗ " : ""}
              {prediction === "home" ? match.homeTeam.split(" ")[0] : prediction === "away" ? match.awayTeam.split(" ")[0] : "Draw"}
            </span>
          ) : isUpcoming ? (
            <span className="text-[10px]" style={{ color: t.textMuted }}>—</span>
          ) : null}

          {canExpand && (
            <svg
              width="10" height="10" viewBox="0 0 12 12" fill="none"
              className="transition-transform flex-shrink-0"
              style={{ transform: expanded ? "rotate(180deg)" : "none", color: t.textMuted }}
            >
              <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Expanded: everyone's pick for this match */}
      {expanded && (
        <div className="px-3 sm:px-4 pb-3 pt-1 space-y-1.5" style={{ backgroundColor: t.rowHover }}>
          {memberPicks.map((mp) => {
            // For KO matches, the member's OWN predicted teams for this slot
            // (may differ from the real fixture). Verdict only counts when both
            // teams match — mirrors how the per-match bonus is scored.
            const ko = isKnockout ? koMatchupsByMember[mp.id]?.[match.id] : undefined;
            const teamsMatch = !!ko && ko.homeTeam === match.homeTeam && ko.awayTeam === match.awayTeam;
            const verdictApplies = isKnockout ? teamsMatch : true;

            const mOutcome: Outcome | undefined = mp.mScore
              ? outcomeOf(mp.mScore.home, mp.mScore.away)
              : mp.mOutcome;
            const mCorrect = verdictApplies && isFinished && mOutcome != null && mOutcome === actualOutcome;
            const mWrong = verdictApplies && isFinished && mOutcome != null && mOutcome !== actualOutcome;
            const exact = verdictApplies && isFinished && mp.mScore != null &&
              mp.mScore.home === match.homeScore && mp.mScore.away === match.awayScore;
            const scoreLabel = mp.mScore
              ? `${mp.mScore.home}–${mp.mScore.away}`
              : (!isKnockout && mp.mOutcome
                ? (mp.mOutcome === "home" ? match.homeTeam.split(" ")[0]
                  : mp.mOutcome === "away" ? match.awayTeam.split(" ")[0]
                  : "Draw")
                : "—");
            const hasPick = mp.mScore != null || mp.mOutcome != null;
            const pickColor = !hasPick ? t.textMuted : mCorrect ? t.correct : mWrong ? t.wrong : t.textPrimary;
            return (
              <div key={mp.id} className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                  style={{
                    backgroundColor: mp.isMe ? t.accent : t.avatar,
                    color: mp.isMe ? (mono ? "#F7F4EE" : "#0B1E0D") : t.avatarText,
                  }}
                >
                  {mp.avatar}
                </span>
                <span className="text-xs font-medium truncate flex-1 min-w-0" style={{ color: t.textBody ?? t.textPrimary }}>
                  {mp.name}{mp.isMe ? " (you)" : ""}
                </span>
                {isKnockout && ko ? (
                  // Personalised matchup: member's own flags around their score.
                  // Dimmed when their teams don't match the real fixture.
                  <span
                    className="text-[11px] font-black tabular-nums flex items-center gap-1.5"
                    style={{ color: pickColor, opacity: teamsMatch ? 1 : 0.5 }}
                    title={teamsMatch ? undefined : `${ko.homeTeam} vs ${ko.awayTeam}`}
                  >
                    {exact && <span title="Exact score">🎯</span>}
                    <FlagImage emoji={ko.homeFlag} size={13} team={ko.homeTeam} />
                    <span>{mCorrect ? "✓ " : mWrong ? "✗ " : ""}{scoreLabel}</span>
                    <FlagImage emoji={ko.awayFlag} size={13} team={ko.awayTeam} />
                  </span>
                ) : (
                  <span
                    className="text-[11px] font-black tabular-nums flex items-center gap-1"
                    style={{ color: pickColor }}
                  >
                    {exact && <span title="Exact score">🎯</span>}
                    {mCorrect ? "✓ " : mWrong ? "✗ " : ""}{scoreLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
