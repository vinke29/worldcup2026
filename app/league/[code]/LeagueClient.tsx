"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import PhaseNav from "@/components/PhaseNav";
import DayNav, { type Day } from "@/components/DayNav";
import MatchCard from "@/components/MatchCard";
import GroupStandingsWidget from "@/components/GroupStandingsWidget";
import RecentMatchesStrip from "@/components/RecentMatchesStrip";
import Leaderboard from "@/components/Leaderboard";
import OnboardingModal from "@/components/OnboardingModal";
import MemberPicksModal from "@/components/MemberPicksModal";
import GroupsView from "@/components/GroupsView";
import QualifiersView from "@/components/QualifiersView";
import { MATCHES, PHASES, WHOLE_GROUP_PHASES, type Match, type Outcome, type PhaseId, type Member, type LeagueMode } from "@/lib/mock-data";
import { computeStandings } from "@/lib/scoring";
import { computePhaseStatuses } from "@/lib/bracket";
import type { ScoreEntry } from "@/lib/bracket";
import { savePrediction, saveScorePick } from "@/app/actions/predictions";
import { logout } from "@/app/actions/auth";

interface LeagueClientProps {
  code: string;
  leagueName: string;
  currentUserId: string;
  initialPredictions: Record<string, Outcome>;
  initialScorePicks: Record<string, ScoreEntry>;
  members: Member[];
  actualScores?: Record<string, { home: number; away: number }>;
  mode?: LeagueMode;
  isPreview?: boolean;
}

function kickoffUTC(date: string, time: string): Date {
  const months: Record<string, number> = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
  };
  const [mon, day] = date.split(" ");
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.UTC(2026, months[mon], Number(day), h + 4, m));
}

function getDefaultNav(): { phase: PhaseId; day: string } {
  const now = Date.now();
  for (const match of MATCHES) {
    const kickoff = kickoffUTC(match.date, match.time);
    if (kickoff.getTime() > now - 3 * 60 * 60 * 1000) {
      return { phase: match.phase as PhaseId, day: match.date };
    }
  }
  const last = MATCHES[MATCHES.length - 1];
  return { phase: last.phase as PhaseId, day: last.date };
}

function parseDateStr(date: string): Date {
  const months: Record<string, number> = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
  };
  const [mon, day] = date.split(" ");
  return new Date(2026, months[mon], Number(day));
}

export default function LeagueClient({
  code,
  leagueName,
  currentUserId,
  initialPredictions,
  initialScorePicks,
  members,
  actualScores = {},
  mode = "phase_by_phase",
  isPreview = false,
}: LeagueClientProps) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Poll for updated scores every 60s when the tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [router]);

  const defaultNav = getDefaultNav();
  const [activePhase, setActivePhase] = useState<PhaseId>(
    mode === "entire_tournament" ? "group-a" : defaultNav.phase
  );
  const [activeDay, setActiveDay] = useState<string>(defaultNav.day);
  const [predictions, setPredictions] = useState<Record<string, Outcome>>(initialPredictions);
  const [scorePredictions, setScorePredictions] = useState<Record<string, ScoreEntry>>(initialScorePicks);
  const [mobileView, setMobileView] = useState<"matches" | "standings" | "groups" | "qualifiers">(() => {
    if (mode !== "entire_tournament") return "matches";
    // If the tournament has started and the user has made picks, land on Standings
    const firstKickoff = Date.UTC(2026, 5, 11, 23, 0); // Jun 11 19:00 EDT = 23:00 UTC
    const hasPicks = Object.keys(initialScorePicks).length > 0 || Object.keys(initialPredictions).length > 0;
    if (Date.now() > firstKickoff && hasPicks) return "standings";
    return "matches";
  });
  const [mono, setMono] = useState(false);
  // Initialise synchronously to avoid a flash/jump on first render
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    const hasPredictions = Object.keys(initialPredictions).length > 0;
    return !hasPredictions && !localStorage.getItem(`quiniela_onboarded_${currentUserId}`);
  });
  const DISMISSED_KEY = `quiniela_dismissed_${code}`;
  const [dismissedDays, setDismissedDays] = useState<Set<string>>(new Set());
  const [bannersHydrated, setBannersHydrated] = useState(false);
  // Load persisted dismissals after mount (can't read localStorage during SSR)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored) setDismissedDays(new Set(JSON.parse(stored) as string[]));
    } catch {}
    setBannersHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Persist whenever dismissals change (skip initial empty-set write)
  useEffect(() => {
    if (dismissedDays.size > 0)
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissedDays]));
  }, [dismissedDays]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Merge actual scores from DB into the static MATCHES array
  const matches: Match[] = useMemo(
    () => MATCHES.map(m => {
      const s = actualScores[m.id];
      return s != null ? { ...m, homeScore: s.home, awayScore: s.away } : m;
    }),
    [actualScores]
  );

  // Dynamically compute which phases are open/locked/completed based on actual scores
  const phases = useMemo(() => {
    const statuses = computePhaseStatuses(MATCHES, actualScores);
    if (mode === "entire_tournament") {
      // Group A–L phases are always open; KO phases open when ready, completed when done
      const groupPhases = WHOLE_GROUP_PHASES.map(p => ({ ...p, status: "open" as const }));
      // Collapse all KO rounds into one "Playoffs" tab — the bracket handles the internal rounds
      const playoffsPhase = { id: "r32" as PhaseId, label: "Playoffs", shortLabel: "Playoffs", deadline: "", status: "open" as const, matchCount: 31 };
      return [...groupPhases, playoffsPhase];
    }
    return PHASES.map(p => ({ ...p, status: statuses[p.id as PhaseId] ?? p.status }));
  }, [actualScores, mode]);

  const currentPhase = phases.find((p) => p.id === activePhase)!;
  const isGroupPhase = activePhase.startsWith("group");
  const isLocked = currentPhase.status === "locked";

  // For group-a…group-l virtual phases, filter by group name instead of phase ID
  const isVirtualGroupPhase = isGroupPhase && mode === "entire_tournament";
  const activeGroupName = isVirtualGroupPhase
    ? `Group ${activePhase.slice(-1).toUpperCase()}`
    : null;

  const phaseMatches = useMemo(
    () => isVirtualGroupPhase && activeGroupName
      ? matches.filter(m => m.group === activeGroupName)
      : matches.filter(m => m.phase === activePhase),
    [matches, activePhase, isVirtualGroupPhase, activeGroupName]
  );

  const days = useMemo((): Day[] => {
    if (!isGroupPhase) return [];
    const dateMap = new Map<string, number>();
    for (const m of phaseMatches) {
      dateMap.set(m.date, (dateMap.get(m.date) ?? 0) + 1);
    }
    const now = Date.now();
    return Array.from(dateMap.entries())
      .sort((a, b) => parseDateStr(a[0]).getTime() - parseDateStr(b[0]).getTime())
      .map(([date, matchCount]) => {
        const dayEnd = parseDateStr(date).getTime() + 24 * 60 * 60 * 1000;
        const dayStart = parseDateStr(date).getTime();
        return {
          date,
          matchCount,
          hasPast: now > dayEnd,
          hasLive: now >= dayStart && now < dayEnd,
        };
      });
  }, [phaseMatches, isGroupPhase]);

  const handlePhaseChange = (phase: PhaseId) => {
    // Auto-dismiss banner for the phase we're leaving
    setDismissedDays(prev => new Set([...prev, activePhase, activeDay]));
    setActivePhase(phase);
    if (mode === "entire_tournament") {
      // Group tab → show matches. Playoffs tab → show bracket.
      if (phase.startsWith("group-") && !phase.includes("md")) {
        setMobileView("matches");
      } else {
        setMobileView("qualifiers");
      }
    } else {
      const first = matches.find((m) => m.phase === phase);
      if (first) setActiveDay(first.date);
    }
  };

  function handleDayChange(day: string) {
    // Auto-dismiss banner for the day we're leaving
    setDismissedDays(prev => new Set([...prev, activeDay]));
    setActiveDay(day);
  }

  const visibleMatches = useMemo(() => {
    if (isVirtualGroupPhase) return phaseMatches; // all 6 group matches, no day filter
    if (isGroupPhase) return phaseMatches.filter((m) => m.date === activeDay);
    return phaseMatches;
  }, [phaseMatches, isGroupPhase, isVirtualGroupPhase, activeDay]);

  const matchesByGroup = useMemo(() => {
    const groups: Record<string, typeof visibleMatches> = {};
    for (const m of visibleMatches) {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    }
    return groups;
  }, [visibleMatches]);

  const groupNames = useMemo(() => Object.keys(matchesByGroup).sort(), [matchesByGroup]);

  // All group matches by group name (across all matchdays) — used for standings widget
  const allGroupMatchesByGroup = useMemo(() => {
    const groups: Record<string, typeof matches> = {};
    for (const m of matches) {
      if (m.group && m.phase.startsWith("group")) {
        if (!groups[m.group]) groups[m.group] = [];
        groups[m.group].push(m);
      }
    }
    return groups;
  }, [matches]);

  // In entire_tournament mode, a match counts as picked if it has either an outcome
  // prediction OR a score pick (0-0 is a valid prediction, so we track any interaction)
  const isPicked = (matchId: string) =>
    !!predictions[matchId] || (mode === "entire_tournament" && scorePredictions[matchId] !== undefined);

  const dayPredicted = visibleMatches.filter((m) => isPicked(m.id)).length;
  const phasePredicted = phaseMatches.filter((m) => isPicked(m.id)).length;

  const totalGroupMatches = useMemo(() => matches.filter(m => m.phase.startsWith("group")).length, [matches]);
  const totalGroupPredicted = useMemo(() => matches.filter(m => m.phase.startsWith("group") && isPicked(m.id)).length, [matches, predictions, scorePredictions]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextDay = useMemo(() => {
    if (mode === "entire_tournament") return null; // no day navigation in this mode
    const idx = days.findIndex(d => d.date === activeDay);
    return idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;
  }, [days, activeDay, mode]);

  // Which phases have matches today (for entire_tournament mode dot indicators)
  const todayPhases = useMemo(() => {
    const now = Date.now();
    const s = new Set<string>();
    for (const m of matches) {
      const dayStart = parseDateStr(m.date).getTime();
      if (now >= dayStart && now < dayStart + 24 * 60 * 60 * 1000) {
        if (mode === "entire_tournament" && m.group) {
          s.add(`group-${m.group.split(" ")[1].toLowerCase()}`);
        } else {
          s.add(m.phase);
        }
      }
    }
    return s;
  }, [matches, mode]);

  // Next group phase (for entire_tournament "group complete" banner)
  const nextGroupPhase = useMemo(() => {
    if (!isGroupPhase || mode !== "entire_tournament") return null;
    const groupPhases = phases.filter(p => !p.id.includes("md") && p.id.startsWith("group-"));
    const idx = groupPhases.findIndex(p => p.id === activePhase);
    return idx >= 0 && idx < groupPhases.length - 1 ? groupPhases[idx + 1] : null;
  }, [phases, activePhase, isGroupPhase, mode]);

  const nextDayBannerVisible = bannersHydrated && mode !== "entire_tournament" && isGroupPhase && !!nextDay && visibleMatches.length > 0 && mobileView === "matches" && dayPredicted === visibleMatches.length && !dismissedDays.has(activeDay);
  const nextGroupBannerVisible = bannersHydrated && mode === "entire_tournament" && isGroupPhase && !!nextGroupPhase && phaseMatches.length > 0 && mobileView === "matches" && phasePredicted === phaseMatches.length && !dismissedDays.has(activePhase);
  const isLastGroupPhase = mode === "entire_tournament" && isGroupPhase && !nextGroupPhase;
  const playoffsStartBannerVisible = bannersHydrated && isLastGroupPhase && totalGroupMatches > 0 && totalGroupPredicted === totalGroupMatches && mobileView === "matches" && !dismissedDays.has("playoffs-start");

  const dayFirstKickoff = useMemo(() => {
    if (visibleMatches.length === 0) return null;
    return visibleMatches.reduce<Date | null>((earliest, m) => {
      const t = kickoffUTC(m.date, m.time);
      return !earliest || t < earliest ? t : earliest;
    }, null);
  }, [visibleMatches]);

  function handlePredict(matchId: string, outcome: Outcome) {
    setPredictions((prev) => ({ ...prev, [matchId]: outcome }));
    if (!isPreview) {
      startTransition(() => { savePrediction(matchId, outcome); });
    }
  }

  function handleScorePick(matchId: string, home: number, away: number, pens?: "home" | "away") {
    setScorePredictions((prev) => {
      const prev_ = prev[matchId];
      const next = { home, away, ...(pens ? { pens } : prev_?.pens ? { pens: prev_.pens } : {}) };
      return { ...prev, [matchId]: next };
    });
    if (!isPreview) {
      const currentPens = pens ?? scorePredictions[matchId]?.pens;
      startTransition(() => { saveScorePick(matchId, home, away, currentPens); });
    }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function scrollToFirstUnpicked() {
    const firstUnpicked = visibleMatches.find((m) => !isPicked(m.id));
    if (firstUnpicked) {
      document.getElementById(`match-${firstUnpicked.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  // Theme tokens
  const t = {
    pageBg:       mono ? "#F5F0E8" : "#0B1E0D",
    cardBg:       mono ? "#F7F4EE" : "#1A2E1F",
    cardBgDeep:   mono ? "#EDE8E0" : "#0F2411",
    border:       mono ? "#DDD9D0" : "#2C4832",
    borderInner:  mono ? "#E5E1D8" : "#1F3A24",
    textPrimary:  mono ? "#1A1208" : "#F0EDE6",
    textSec:      mono ? "#6B5E4E" : "#7A9B84",
    textMuted:    mono ? "#A09080" : "#4A6B50",
    textBody:     mono ? "#5A4E40" : "#B3C9B7",
    accent:       mono ? "#1A1208" : "#D7FF5A",
    accentText:   mono ? "#F7F4EE" : "#0B1E0D",
    progressBg:   mono ? "#DDD9D0" : "#1F3A24",
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: t.pageBg }}>
      {showOnboarding && (
        <OnboardingModal
          leagueName={leagueName}
          currentUserId={currentUserId}
          onComplete={handleOnboardingComplete}
        />
      )}
      {selectedMember && (
        <MemberPicksModal
          member={selectedMember}
          matches={matches}
          actualScores={actualScores}
          mono={mono}
          mode={mode}
          onClose={() => setSelectedMember(null)}
        />
      )}
      <Header
        leagueName={leagueName}
        leagueCode={code}
        mono={mono}
        onToggleMono={() => setMono(v => !v)}
        onLogout={isPreview ? undefined : () => startTransition(() => { logout(); })}
      />
      <PhaseNav phases={phases} activePhase={activePhase} onSelect={handlePhaseChange} mono={mono} todayPhases={mode === "entire_tournament" ? todayPhases : undefined} />
      {isGroupPhase && days.length > 0 && mode !== "entire_tournament" && (
        <DayNav days={days} activeDay={activeDay} onSelect={handleDayChange} mono={mono} />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Tab toggle — all 4 tabs on mobile; only Groups/Qualifiers on desktop */}
        <div
          className="flex rounded-xl p-1 mb-5 border"
          style={{ backgroundColor: t.cardBg, borderColor: t.border }}
        >
          {(["matches", "groups", "qualifiers", "standings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileView(tab)}
              className="flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: "transparent",
                color: mobileView === tab ? t.accent : t.textSec,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-6 items-start">
          {/* Matches — always visible on desktop, tab-driven on mobile */}
          <div className={`flex-1 min-w-0 ${mobileView !== "matches" ? "hidden" : "block"}`}>

            {/* Phase / day header */}
            {isLocked ? (
              <div
                className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl border"
                style={{ backgroundColor: t.cardBg, borderColor: t.border }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="6" width="11" height="7.5" rx="1.5" stroke={t.textMuted} strokeWidth="1.4" />
                  <path d="M4 6V4.5a3 3 0 0 1 6 0V6" stroke={t.textMuted} strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <p className="text-sm" style={{ color: t.textBody }}>
                  <span className="font-bold" style={{ color: t.textPrimary }}>{currentPhase.label}</span>
                  {" "}— opens once the previous round ends.
                </p>
              </div>
            ) : isGroupPhase ? (
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: t.progressBg }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: visibleMatches.length > 0 ? `${(dayPredicted / visibleMatches.length) * 100}%` : "0%",
                      backgroundColor: t.accent,
                    }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums whitespace-nowrap" style={{ color: t.textBody }}>
                  {mode === "entire_tournament"
                    ? `${dayPredicted}/${visibleMatches.length} ${currentPhase.shortLabel}`
                    : `${dayPredicted}/${visibleMatches.length} today`}
                </span>
                {mode !== "entire_tournament" && (
                  <span className="text-xs whitespace-nowrap hidden sm:inline" style={{ color: t.textMuted }}>
                    {phasePredicted}/{phaseMatches.length} phase
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: t.progressBg }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: phaseMatches.length > 0 ? `${(phasePredicted / phaseMatches.length) * 100}%` : "0%",
                      backgroundColor: t.accent,
                    }}
                  />
                </div>
                <span className="text-xs font-bold whitespace-nowrap" style={{ color: t.textBody }}>
                  {phasePredicted}/{phaseMatches.length} picked
                </span>
              </div>
            )}

            {/* Missing picks banner */}
            {!isLocked && currentPhase.status !== "completed" && visibleMatches.length > 0 && dayPredicted < visibleMatches.length && (
              <button
                onClick={scrollToFirstUnpicked}
                className="flex items-center gap-3 mb-4 pl-4 pr-3 py-3 rounded-2xl w-full text-left cursor-pointer"
                style={{
                  backgroundColor: mono ? "rgba(26,18,8,0.07)" : "rgba(215,255,90,0.08)",
                  borderTop:    `1px solid ${mono ? "rgba(26,18,8,0.12)" : "rgba(215,255,90,0.18)"}`,
                  borderRight:  `1px solid ${mono ? "rgba(26,18,8,0.12)" : "rgba(215,255,90,0.18)"}`,
                  borderBottom: `1px solid ${mono ? "rgba(26,18,8,0.12)" : "rgba(215,255,90,0.18)"}`,
                  borderLeft:   `3px solid ${mono ? "rgba(26,18,8,0.5)" : t.accent}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-black" style={{ fontSize: "15px", color: t.accent }}>
                    {mode === "entire_tournament"
                      ? `${totalGroupMatches - totalGroupPredicted} group picks left`
                      : visibleMatches.length - dayPredicted === 1
                        ? "1 pick left today"
                        : visibleMatches.length - dayPredicted === visibleMatches.length
                          ? `${visibleMatches.length} picks to make`
                          : `${visibleMatches.length - dayPredicted} picks left today`}
                  </span>
                  <span className="text-xs font-medium" style={{ color: t.textSec }}>
                    {mode === "entire_tournament"
                      ? " · set your full bracket in Qualifiers"
                      : ` · Locks ${dayFirstKickoff
                          ? dayFirstKickoff.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " at " +
                            dayFirstKickoff.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
                          : currentPhase.deadline}`}
                  </span>
                </div>
              </button>
            )}

            {/* Today jump pill — entire_tournament mode, when viewing a different group */}
            {mode === "entire_tournament" && isGroupPhase && todayPhases.size > 0 && !todayPhases.has(activePhase) && (() => {
              const todayPhaseId = [...todayPhases][0];
              const todayLabel = phases.find(p => p.id === todayPhaseId)?.shortLabel ?? "";
              return (
                <button
                  onClick={() => handlePhaseChange(todayPhaseId as PhaseId)}
                  className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl w-full text-left cursor-pointer"
                  style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: "#4ADE80" }} />
                  <span className="text-xs font-bold" style={{ color: "#4ADE80" }}>Today · {todayLabel}</span>
                  <span className="ml-auto text-xs font-bold" style={{ color: "#4ADE80" }}>→</span>
                </button>
              );
            })()}

            {/* Matches */}
            {visibleMatches.length === 0 ? (
              <div className="text-center py-16 text-sm" style={{ color: t.textMuted }}>
                {isLocked ? "Matches will appear once this phase opens."
                  : mode === "entire_tournament" && !isGroupPhase ? "Bracket picks are in the Qualifiers tab."
                  : "No matches on this day."}
              </div>
            ) : (
              <div className="space-y-8">
                {groupNames.map((groupName) => (
                  <div key={groupName}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: t.textSec }}>
                        {groupName}
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: t.borderInner }} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {matchesByGroup[groupName].map((match) => (
                        <div key={match.id} id={`match-${match.id}`}>
                        <MatchCard
                          match={match}
                          savedPrediction={predictions[match.id]}
                          savedScorePick={scorePredictions[match.id]}
                          onPredict={handlePredict}
                          onScorePick={handleScorePick}
                          lockedByPhase={isLocked}
                          illustrationStyle={mono ? "mono" : "color"}
                        />
                        </div>
                      ))}
                    </div>
                    <GroupStandingsWidget
                      groupName={groupName}
                      allGroupMatches={allGroupMatchesByGroup[groupName] ?? []}
                      scorePicks={scorePredictions}
                      mono={mono}
                    />
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        {/* Standings view — full width */}
        {mobileView === "standings" && (
          <div className="space-y-4">
            <RecentMatchesStrip
              matches={matches}
              predictions={predictions}
              scorePredictions={scorePredictions}
              mono={mono}
              onGoToMatches={() => setMobileView("matches")}
            />
            <Leaderboard
              members={computeStandings(matches, members, currentUserId, predictions, scorePredictions, actualScores)}
              currentUserId={currentUserId}
              mono={mono}
              variant="full"
              onSelectMember={
                // In full-bracket mode, hide other players' picks until the tournament starts
                mode === "entire_tournament" && Date.now() < Date.UTC(2026, 5, 11, 23, 0)
                  ? undefined
                  : setSelectedMember
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textSec }}>Invite friends</p>
                <div className="rounded-xl px-4 py-3 text-center" style={{ backgroundColor: t.cardBgDeep }}>
                  <span className="font-mono font-black tracking-[0.2em] text-lg" style={{ color: t.accent }}>{code}</span>
                </div>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/auth/setup?intent=join&code=${code}`;
                    navigator.clipboard.writeText(url).then(() => {
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2500);
                    });
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                  style={{
                    backgroundColor: linkCopied ? "transparent" : t.accent,
                    color: linkCopied ? t.accent : t.accentText,
                    border: `1px solid ${t.accent}`,
                  }}
                >
                  {linkCopied ? "Link copied! Send it to your friends" : "Copy invite link"}
                </button>
              </div>

              <div className="rounded-2xl border p-4" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textSec }}>Points guide</p>
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: mode === "entire_tournament" ? (mono ? "rgba(26,18,8,0.1)" : "rgba(215,255,90,0.12)") : "transparent", color: t.accent, border: `1px solid ${mono ? "rgba(26,18,8,0.2)" : "rgba(215,255,90,0.3)"}` }}
                  >
                    {mode === "entire_tournament" ? "Full bracket" : "Phase by phase"}
                  </span>
                </div>

                {/* Simple rows */}
                <div className="space-y-2">
                  {[
                    { label: "Correct result · Group", pts: "1 pt", muted: false },
                    { label: "Exact score · Group", pts: "3 pts", muted: false },
                    { label: "Exact score · KO round", pts: "5 pts", muted: false },
                  ].map(({ label, pts }) => (
                    <div key={label} className="flex justify-between items-center gap-2">
                      <span className="text-xs" style={{ color: t.textBody }}>{label}</span>
                      <span className="text-xs font-black whitespace-nowrap" style={{ color: t.accent }}>{pts}</span>
                    </div>
                  ))}

                  {/* Divider */}
                  <div style={{ height: 1, backgroundColor: t.borderInner }} />

                  {/* KO milestones — 2 col */}
                  {[
                    { label: "Reached R32", pts: "2 pts" },
                    { label: "Reached R16", pts: "3 pts" },
                    { label: "Reached QF", pts: "5 pts" },
                    { label: "Reached SF", pts: "7 pts" },
                    { label: "Reached Final", pts: "10 pts" },
                    { label: "Champion 🏆", pts: "15 pts" },
                  ].map(({ label, pts }) => (
                    <div key={label} className="flex justify-between items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: label.startsWith("Champion") ? t.accent : t.textBody }}>{label}</span>
                      <span className="text-xs font-black whitespace-nowrap" style={{ color: t.accent }}>{pts}</span>
                    </div>
                  ))}

                  {/* Divider */}
                  <div style={{ height: 1, backgroundColor: t.borderInner }} />

                  <p className="text-[10px] leading-relaxed" style={{ color: t.textMuted }}>
                    Points stack per round. Brazil reaches the Final = <span style={{ color: t.accent, fontWeight: 800 }}>27 pts</span>. Brazil wins the World Cup = <span style={{ color: t.accent, fontWeight: 800 }}>42 pts</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Groups view */}
        {mobileView === "groups" && (
          <GroupsView matches={matches} scorePicks={scorePredictions} mono={mono} mode={mode} />
        )}

        {/* Qualifiers view */}
        {mobileView === "qualifiers" && (
          <QualifiersView
            matches={matches} scorePicks={scorePredictions} actualScores={actualScores}
            mono={mono} mode={mode} onScorePick={!isPreview ? handleScorePick : undefined}
            dismissedRounds={dismissedDays}
            onDismissRound={(round) => setDismissedDays(prev => new Set([...prev, round]))}
            bannersReady={bannersHydrated}
          />
        )}
      </div>

      {/* Fixed completion banner — slides down when all picks done for day (phase_by_phase) or group (entire_tournament) */}
      {isGroupPhase && (nextDay || nextGroupPhase) && mobileView === "matches" && (
        <div
          className="fixed top-14 inset-x-0 z-[60] flex justify-center px-4 pt-2 pointer-events-none"
          style={{
            transform: (nextDayBannerVisible || nextGroupBannerVisible) ? "translateY(0)" : "translateY(calc(-100% - 72px))",
            transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            onClick={() => {
              if (mode === "entire_tournament" && nextGroupPhase) {
                setDismissedDays(prev => new Set([...prev, activePhase]));
                handlePhaseChange(nextGroupPhase.id as PhaseId);
              } else if (nextDay) {
                setDismissedDays(prev => new Set([...prev, activeDay]));
                handleDayChange(nextDay.date);
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
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
                  {mode === "entire_tournament"
                    ? `${currentPhase.shortLabel} complete`
                    : "All done for today"}
                </p>
                <p className="text-xs font-medium" style={{ color: mono ? "rgba(247,244,238,0.6)" : "rgba(11,30,13,0.6)" }}>
                  {mode === "entire_tournament" && nextGroupPhase
                    ? `Next up: ${nextGroupPhase.shortLabel} · ${nextGroupPhase.matchCount} matches`
                    : nextDay
                      ? `Next up: ${nextDay.date} · ${nextDay.matchCount} ${nextDay.matchCount === 1 ? "match" : "matches"}`
                      : ""}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold" style={{ color: mono ? "#F7F4EE" : "#0B1E0D" }}>→</span>
          </button>
        </div>
      )}

      {/* Playoffs start banner — slides down when all group picks are done on the last group */}
      {isLastGroupPhase && mobileView === "matches" && (
        <div
          className="fixed top-14 inset-x-0 z-[60] flex justify-center px-4 pt-2 pointer-events-none"
          style={{
            transform: playoffsStartBannerVisible ? "translateY(0)" : "translateY(calc(-100% - 72px))",
            transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            onClick={() => {
              setDismissedDays(prev => new Set([...prev, "playoffs-start"]));
              handlePhaseChange("r32" as PhaseId);
              window.scrollTo({ top: 0, behavior: "smooth" });
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
                  All groups complete!
                </p>
                <p className="text-xs font-medium" style={{ color: mono ? "rgba(247,244,238,0.6)" : "rgba(11,30,13,0.6)" }}>
                  Next up: fill the playoff bracket · 31 matches
                </p>
              </div>
            </div>
            <span className="text-sm font-bold" style={{ color: mono ? "#F7F4EE" : "#0B1E0D" }}>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
