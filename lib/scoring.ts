import type { Match, Member, Outcome } from "./mock-data";
import {
  TOP_R32_IDS, BOT_R32_IDS, R16_IDS, QF_IDS, SF_IDS, THIRD_PLACE_ID, FINAL_ID,
  TOP_R32_DEFS, BOT_R32_DEFS,
  resolveR32Pairs, resolveBracketTeams,
} from "./bracket";
import type { ScoreEntry } from "./bracket";
import type { TeamRow } from "./group-standings";

function actualOutcome(match: Match): Outcome | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return "home";
  if (match.awayScore > match.homeScore) return "away";
  return "draw";
}

// Points for [correct outcome, exact score] by phase
// KO exact score = winner pts + 5 flat bonus
const PHASE_POINTS: Record<string, [number, number]> = {
  "group-md1": [1, 3],
  "group-md2": [1, 3],
  "group-md3": [1, 3],
  "r32":       [2, 7],   // Made R32
  "r16":       [3, 8],   // Made R16
  "qf":        [5, 10],  // Made QF
  "sf":        [10, 15], // Made Final (SF winner reaches the Final)
  "third":     [5, 10],  // 3rd place
  "final":     [15, 20], // Champion
};

export function phasePoints(phase: string): [number, number] {
  return PHASE_POINTS[phase] ?? [1, 3];
}

// Map knockout match ID → phase name
const KNOCKOUT_PHASE: Record<string, string> = {
  ...Object.fromEntries([...TOP_R32_IDS, ...BOT_R32_IDS].map(id => [id, "r32"])),
  ...Object.fromEntries(R16_IDS.map(id => [id, "r16"])),
  ...Object.fromEntries(QF_IDS.map(id => [id, "qf"])),
  ...Object.fromEntries(SF_IDS.map(id => [id, "sf"])),
  [THIRD_PLACE_ID]: "third",
  [FINAL_ID]: "final",
};

function knockoutWinner(score: ScoreEntry): "home" | "away" | null {
  if (score.home > score.away) return "home";
  if (score.away > score.home) return "away";
  return score.pens ?? null;
}

function pointsForGroupPick(
  match: Match,
  prediction: Outcome,
  scorePick?: ScoreEntry
): number {
  const actual = actualOutcome(match);
  if (!actual || prediction !== actual) return 0;

  const isExact = scorePick != null &&
    scorePick.home === match.homeScore &&
    scorePick.away === match.awayScore;

  const [outcomePts, exactPts] = phasePoints(match.phase);
  return isExact ? exactPts : outcomePts;
}

export function computeStandings(
  matches: Match[],
  members: Member[],
  currentUserId: string,
  livePredictions: Record<string, Outcome>,
  liveScorePicks: Record<string, ScoreEntry>,
  actualScores: Record<string, ScoreEntry>,
): Member[] {
  const finished = matches.filter((m) => m.homeScore !== null && m.awayScore !== null);

  return members.map((member) => {
    const isCurrentUser = member.id === currentUserId;
    const predictions = isCurrentUser ? livePredictions : member.predictions;
    const scorePicks  = isCurrentUser ? liveScorePicks  : (member.scorePicks ?? {});

    let groupPts = 0, koPts = 0, correct = 0, exact = 0, total = 0;

    // All unique match IDs where any pick was made
    const picked = new Set([...Object.keys(predictions), ...Object.keys(scorePicks)]).size;

    // ── Group stage (outcome-based) ───────────────────────────────────────────
    for (const match of finished) {
      const pred = predictions[match.id];
      if (!pred) continue;
      total++;
      const sp = scorePicks[match.id];
      const pts = pointsForGroupPick(match, pred, sp);
      if (pts > 0) {
        correct++;
        if (sp && sp.home === match.homeScore && sp.away === match.awayScore) exact++;
      }
      groupPts += pts;
    }

    // ── Knockout stage (team-based scoring) ──────────────────────────────────
    // Points require the actual winning team to appear in the member's predicted
    // bracket for that round. Exact-score bonus requires BOTH teams to be in the
    // correct slots (same match ID) in addition to the score matching.
    if (Object.keys(actualScores).length > 0) {
      // Resolve actual R32 teams once per member (actual data is the same for everyone,
      // but we need predicted per-member, so both are computed here).
      const { top: actualTop, bot: actualBot } = resolveR32Pairs(matches, {}, true);
      const actualBracket = resolveBracketTeams(actualTop, actualBot, actualScores);

      // Predicted R32 teams for this member
      const { top: predTop, bot: predBot } = resolveR32Pairs(matches, scorePicks, false);
      const predBracket = resolveBracketTeams(predTop, predBot, scorePicks);

      // Build predicted team sets per phase (which teams did this member predict
      // would be present in each round, regardless of which slot).
      function teamSet(...pairs: Array<{ home: TeamRow | null; away: TeamRow | null }>): Set<string> {
        const s = new Set<string>();
        for (const p of pairs) {
          if (p.home?.team) s.add(p.home.team);
          if (p.away?.team) s.add(p.away.team);
        }
        return s;
      }
      const predR32Teams  = teamSet(...predTop, ...predBot);
      const predR16Teams  = teamSet(...predBracket.r16Top, ...predBracket.r16Bot);
      const predQFTeams   = teamSet(...predBracket.qfTop,  ...predBracket.qfBot);
      const predSFTeams   = teamSet(predBracket.sfTop, predBracket.sfBot);
      const predFinTeams  = teamSet(predBracket.final);

      const phaseTeamSets: Record<string, Set<string>> = {
        r32: predR32Teams, r16: predR16Teams, qf: predQFTeams,
        sf: predSFTeams, final: predFinTeams, third: predSFTeams,
      };

      // Helper: get actual home/away teams for a completed KO match
      function actualTeamsFor(matchId: string): { home: TeamRow | null; away: TeamRow | null } | null {
        const ti = TOP_R32_IDS.indexOf(matchId);
        if (ti >= 0) return { home: actualTop[ti].home, away: actualTop[ti].away };
        const bi = BOT_R32_IDS.indexOf(matchId);
        if (bi >= 0) return { home: actualBot[bi].home, away: actualBot[bi].away };
        const r16ti = R16_IDS.slice(0,4).indexOf(matchId);
        if (r16ti >= 0) return { home: actualBracket.r16Top[r16ti]?.home ?? null, away: actualBracket.r16Top[r16ti]?.away ?? null };
        const r16bi = R16_IDS.slice(4).indexOf(matchId);
        if (r16bi >= 0) return { home: actualBracket.r16Bot[r16bi]?.home ?? null, away: actualBracket.r16Bot[r16bi]?.away ?? null };
        const qfti = QF_IDS.slice(0,2).indexOf(matchId);
        if (qfti >= 0) return { home: actualBracket.qfTop[qfti]?.home ?? null, away: actualBracket.qfTop[qfti]?.away ?? null };
        const qfbi = QF_IDS.slice(2).indexOf(matchId);
        if (qfbi >= 0) return { home: actualBracket.qfBot[qfbi]?.home ?? null, away: actualBracket.qfBot[qfbi]?.away ?? null };
        if (matchId === SF_IDS[0])      return { home: actualBracket.sfTop.home ?? null, away: actualBracket.sfTop.away ?? null };
        if (matchId === SF_IDS[1])      return { home: actualBracket.sfBot.home ?? null, away: actualBracket.sfBot.away ?? null };
        if (matchId === THIRD_PLACE_ID) return { home: actualBracket.thirdPlace.home ?? null, away: actualBracket.thirdPlace.away ?? null };
        if (matchId === FINAL_ID)       return { home: actualBracket.final.home ?? null, away: actualBracket.final.away ?? null };
        return null;
      }

      // Helper: get predicted home/away teams for a match slot
      function predTeamsFor(matchId: string): { home: TeamRow | null; away: TeamRow | null } | null {
        const ti = TOP_R32_IDS.indexOf(matchId);
        if (ti >= 0) return { home: predTop[ti].home, away: predTop[ti].away };
        const bi = BOT_R32_IDS.indexOf(matchId);
        if (bi >= 0) return { home: predBot[bi].home, away: predBot[bi].away };
        const r16ti = R16_IDS.slice(0,4).indexOf(matchId);
        if (r16ti >= 0) return { home: predBracket.r16Top[r16ti]?.home ?? null, away: predBracket.r16Top[r16ti]?.away ?? null };
        const r16bi = R16_IDS.slice(4).indexOf(matchId);
        if (r16bi >= 0) return { home: predBracket.r16Bot[r16bi]?.home ?? null, away: predBracket.r16Bot[r16bi]?.away ?? null };
        const qfti = QF_IDS.slice(0,2).indexOf(matchId);
        if (qfti >= 0) return { home: predBracket.qfTop[qfti]?.home ?? null, away: predBracket.qfTop[qfti]?.away ?? null };
        const qfbi = QF_IDS.slice(2).indexOf(matchId);
        if (qfbi >= 0) return { home: predBracket.qfBot[qfbi]?.home ?? null, away: predBracket.qfBot[qfbi]?.away ?? null };
        if (matchId === SF_IDS[0])      return { home: predBracket.sfTop.home ?? null, away: predBracket.sfTop.away ?? null };
        if (matchId === SF_IDS[1])      return { home: predBracket.sfBot.home ?? null, away: predBracket.sfBot.away ?? null };
        if (matchId === THIRD_PLACE_ID) return { home: predBracket.thirdPlace.home ?? null, away: predBracket.thirdPlace.away ?? null };
        if (matchId === FINAL_ID)       return { home: predBracket.final.home ?? null, away: predBracket.final.away ?? null };
        return null;
      }

      for (const [matchId, actualScore] of Object.entries(actualScores)) {
        const phase = KNOCKOUT_PHASE[matchId];
        if (!phase) continue;

        const userPick = scorePicks[matchId];
        if (!userPick) continue;

        const actualTeams = actualTeamsFor(matchId);
        if (!actualTeams) continue;

        const actualWinnerSide = knockoutWinner(actualScore);
        const pickedWinnerSide = knockoutWinner(userPick);
        if (!actualWinnerSide || !pickedWinnerSide) continue;

        // Which team actually won?
        const actualWinnerTeam = actualWinnerSide === "home" ? actualTeams.home : actualTeams.away;
        if (!actualWinnerTeam?.team) continue;

        // Condition 1: actual winner must be in member's predicted team set for this phase
        const phaseTeams = phaseTeamSets[phase];
        if (!phaseTeams?.has(actualWinnerTeam.team)) continue;

        // Condition 2: member's score pick must also identify the same side as winner
        if (pickedWinnerSide !== actualWinnerSide) continue;

        total++;
        correct++;
        const [outcomePts, exactPts] = phasePoints(phase);

        // Exact score: both teams must be in correct slots AND score must match
        const predTeams = predTeamsFor(matchId);
        const bothSlotsCorrect = !!predTeams &&
          predTeams.home?.team === actualTeams.home?.team &&
          predTeams.away?.team === actualTeams.away?.team;
        const isExact = bothSlotsCorrect &&
          userPick.home === actualScore.home &&
          userPick.away === actualScore.away &&
          (!actualScore.pens || userPick.pens === actualScore.pens);

        if (isExact) { exact++; koPts += exactPts; }
        else { koPts += outcomePts; }
      }
    }

    return { ...member, points: groupPts + koPts, groupPts, koPts, bonusPts: 0, correct, exact, total, picked };
  });
}
