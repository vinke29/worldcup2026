"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import PhaseNav from "@/components/PhaseNav";
import DayNav, { type Day } from "@/components/DayNav";
import MatchCard from "@/components/MatchCard";
import Leaderboard from "@/components/Leaderboard";
import OnboardingModal from "@/components/OnboardingModal";
import GroupsView from "@/components/GroupsView";
import QualifiersView from "@/components/QualifiersView";
import { MATCHES, PHASES, type Match, type Outcome, type PhaseId, type Member } from "@/lib/mock-data";
import { computeStandings } from "@/lib/scoring";
import { computePhaseStatuses } from "@/lib/bracket";
import { savePrediction, saveScorePick } from "@/app/actions/predictions";
import { logout } from "@/app/actions/auth";

interface LeagueClientProps {
  code: string;
  leagueName: string;
  currentUserId: string;
  initialPredictions: Record<string, Outcome>;
  initialScorePicks: Record<string, { home: number; away: number }>;
  members: Member[];
  actualScores?: Record<string, { home: number; away: number }>;
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
  const [activePhase, setActivePhase] = useState<PhaseId>(defaultNav.phase);
  const [activeDay, setActiveDay] = useState<string>(defaultNav.day);
  const [predictions, setPredictions] = useState<Record<string, Outcome>>(initialPredictions);
  const [scorePredictions, setScorePredictions] = useState<Record<string, { home: number; away: number }>>(initialScorePicks);
  const [mobileView, setMobileView] = useState<"matches" | "standings" | "groups" | "qualifiers">("matches");
  const [mono, setMono] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Show onboarding for new users (no picks yet) or preview visitors who haven't seen it
    const hasPredictions = Object.keys(initialPredictions).length > 0;
    if (!hasPredictions && !localStorage.getItem(`quiniela_onboarded_${currentUserId}`)) {
      setShowOnboarding(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    return PHASES.map(p => ({ ...p, status: statuses[p.id as PhaseId] ?? p.status }));
  }, [actualScores]);

  const currentPhase = phases.find((p) => p.id === activePhase)!;
  const isGroupPhase = activePhase.startsWith("group");
  const isLocked = currentPhase.status === "locked";

  const phaseMatches = useMemo(
    () => matches.filter((m) => m.phase === activePhase),
    [matches, activePhase]
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
    setActivePhase(phase);
    const first = matches.find((m) => m.phase === phase);
    if (first) setActiveDay(first.date);
  };

  const visibleMatches = useMemo(() => {
    if (isGroupPhase) return phaseMatches.filter((m) => m.date === activeDay);
    return phaseMatches;
  }, [phaseMatches, isGroupPhase, activeDay]);

  const matchesByGroup = useMemo(() => {
    const groups: Record<string, typeof visibleMatches> = {};
    for (const m of visibleMatches) {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    }
    return groups;
  }, [visibleMatches]);

  const groupNames = useMemo(() => Object.keys(matchesByGroup).sort(), [matchesByGroup]);

  const dayPredicted = visibleMatches.filter((m) => predictions[m.id]).length;
  const phasePredicted = phaseMatches.filter((m) => predictions[m.id]).length;

  const nextDay = useMemo(() => {
    const idx = days.findIndex(d => d.date === activeDay);
    return idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;
  }, [days, activeDay]);

  const nextDayBannerVisible = isGroupPhase && !!nextDay && visibleMatches.length > 0 && mobileView === "matches" && dayPredicted === visibleMatches.length;

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

  function handleScorePick(matchId: string, home: number, away: number) {
    setScorePredictions((prev) => ({ ...prev, [matchId]: { home, away } }));
    if (!isPreview) {
      startTransition(() => { saveScorePick(matchId, home, away); });
    }
  }

  function handleOnboardingComplete(matchId?: string, outcome?: Outcome, scoreHome?: number, scoreAway?: number) {
    if (matchId && outcome) {
      handlePredict(matchId, outcome);
      if (scoreHome !== undefined && scoreAway !== undefined) {
        handleScorePick(matchId, scoreHome, scoreAway);
      }
    }
    setShowOnboarding(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function scrollToFirstUnpicked() {
    const firstUnpicked = visibleMatches.find((m) => !predictions[m.id]);
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

  const firstOpenMatch = matches.find((m) => m.phase === "group-md1");

  return (
    <div className="min-h-screen" style={{ backgroundColor: t.pageBg }}>
      {showOnboarding && firstOpenMatch && (
        <OnboardingModal
          leagueName={leagueName}
          firstMatch={firstOpenMatch}
          mono={mono}
          currentUserId={currentUserId}
          onComplete={handleOnboardingComplete}
        />
      )}
      <Header
        leagueName={leagueName}
        leagueCode={code}
        mono={mono}
        onToggleMono={() => setMono(v => !v)}
        onLogout={isPreview ? undefined : () => startTransition(() => { logout(); })}
      />
      <PhaseNav phases={phases} activePhase={activePhase} onSelect={handlePhaseChange} mono={mono} />
      {isGroupPhase && days.length > 0 && (
        <DayNav days={days} activeDay={activeDay} onSelect={setActiveDay} mono={mono} />
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
                backgroundColor: mobileView === tab ? t.accent : "transparent",
                color: mobileView === tab ? t.accentText : t.textSec,
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
                  {dayPredicted}/{visibleMatches.length} today
                </span>
                <span className="text-xs whitespace-nowrap hidden sm:inline" style={{ color: t.textMuted }}>
                  {phasePredicted}/{phaseMatches.length} phase
                </span>
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
                    {visibleMatches.length - dayPredicted === 1
                      ? "1 pick left today"
                      : visibleMatches.length - dayPredicted === visibleMatches.length
                        ? `${visibleMatches.length} picks to make`
                        : `${visibleMatches.length - dayPredicted} picks left today`}
                  </span>
                  <span className="text-xs font-medium" style={{ color: t.textSec }}>
                    {" "}· Locks{" "}
                    {dayFirstKickoff
                      ? dayFirstKickoff.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " at " +
                        dayFirstKickoff.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
                      : currentPhase.deadline}
                  </span>
                </div>
              </button>
            )}

            {/* Matches */}
            {visibleMatches.length === 0 ? (
              <div className="text-center py-16 text-sm" style={{ color: t.textMuted }}>
                {isLocked ? "Matches will appear once this phase opens." : "No matches on this day."}
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
                    <div className="space-y-3">
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
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        {/* Standings view — full width */}
        {mobileView === "standings" && (
          <div className="space-y-4">
            <Leaderboard
              members={computeStandings(matches, members, currentUserId, predictions, scorePredictions)}
              currentUserId={currentUserId}
              mono={mono}
              variant="full"
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
                    if (navigator.share) {
                      navigator.share({ title: "Join my Quiniela", text: `Join my World Cup 2026 prediction league! Use code ${code} or tap the link.`, url });
                    } else {
                      navigator.clipboard.writeText(url);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:opacity-80 cursor-pointer"
                  style={{ backgroundColor: t.accent, color: t.accentText, border: "none" }}
                >
                  Share invite link
                </button>
              </div>

              <div className="rounded-2xl border p-4" style={{ backgroundColor: t.cardBg, borderColor: t.border }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: t.textSec }}>Points guide</p>
                <div className="space-y-2">
                  {[
                    { label: "Correct result · Group", pts: "1 pt" },
                    { label: "Exact score · Group", pts: "3 pts" },
                    { label: "Correct result · R32–Final", pts: "2–10 pts" },
                    { label: "Exact score · R32–Final", pts: "5–15 pts" },
                  ].map(({ label, pts }) => (
                    <div key={label} className="flex justify-between items-center gap-2">
                      <span className="text-xs" style={{ color: t.textBody }}>{label}</span>
                      <span className="text-xs font-black whitespace-nowrap" style={{ color: t.accent }}>{pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Groups view */}
        {mobileView === "groups" && (
          <GroupsView matches={matches} scorePicks={scorePredictions} mono={mono} />
        )}

        {/* Qualifiers view */}
        {mobileView === "qualifiers" && (
          <QualifiersView matches={matches} scorePicks={scorePredictions} actualScores={actualScores} mono={mono} />
        )}
      </div>

      {/* Fixed next-day banner — slides down from top when all picks are done */}
      {isGroupPhase && nextDay && mobileView === "matches" && (
        <div
          className="fixed top-14 inset-x-0 z-[60] flex justify-center px-4 pt-2 pointer-events-none"
          style={{
            transform: nextDayBannerVisible ? "translateY(0)" : "translateY(calc(-100% - 72px))",
            transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <button
            onClick={() => setActiveDay(nextDay.date)}
            className="pointer-events-auto w-full max-w-lg flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer"
            style={{
              backgroundColor: mono ? "#EDE8E0" : "#1A2E1F",
              border: `1px solid ${mono ? "rgba(26,18,8,0.2)" : "rgba(215,255,90,0.3)"}`,
              boxShadow: mono ? "0 8px 32px rgba(0,0,0,0.15)" : "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-base" style={{ color: t.accent }}>✓</span>
              <div className="text-left">
                <p className="text-sm font-black" style={{ color: t.textPrimary }}>All done for today</p>
                <p className="text-xs" style={{ color: t.textSec }}>
                  Next up: {nextDay.date} · {nextDay.matchCount} {nextDay.matchCount === 1 ? "match" : "matches"}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold" style={{ color: t.accent }}>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
