import type { Match, Member, Outcome } from "./mock-data";
import {
  TOP_R32_IDS, BOT_R32_IDS, R16_IDS, QF_IDS, SF_IDS, THIRD_PLACE_ID, FINAL_ID,
  TOP_R32_DEFS, BOT_R32_DEFS,
  resolveR32Pairs, resolveBracketTeams,
} from "./bracket";
import type { ScoreEntry } from "./bracket";
import { computeGroupTables, rankThirdPlaceTeams } from "./group-standings";
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

// Additive exact-score bonus per knockout match, keyed by the match's own round.
// Awarded on top of the "made the round" base points when both teams are in the
// correct slots and the exact score (incl. pens) is nailed.
const KO_EXACT_BONUS: Record<string, number> = {
  r32: 7, r16: 8, qf: 10, sf: 15, third: 10, final: 20,
};

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

    // ── Knockout stage ───────────────────────────────────────────────────────
    // 1. "Made the round" base points — awarded cumulatively per correctly
    //    predicted team as soon as that round's field is known (R32 = qualified
    //    from the group, R16 = won R32, … Champion = won the final).
    // 2. An additive exact-score bonus when a KO match is played and the member
    //    nailed its exact score with both teams in the correct slots.
    if (Object.keys(actualScores).length > 0) {
      // Actual bracket (same for everyone) and this member's predicted bracket.
      const { top: actualTop, bot: actualBot } = resolveR32Pairs(matches, {}, true);
      const actualBracket = resolveBracketTeams(actualTop, actualBot, actualScores);
      const { top: predTop, bot: predBot } = resolveR32Pairs(matches, scorePicks, false);
      const predBracket = resolveBracketTeams(predTop, predBot, scorePicks);

      // Set of distinct team names appearing in a list of bracket pairs.
      function teamSet(...pairs: Array<{ home: TeamRow | null; away: TeamRow | null }>): Set<string> {
        const s = new Set<string>();
        for (const p of pairs) {
          if (p.home?.team) s.add(p.home.team);
          if (p.away?.team) s.add(p.away.team);
        }
        return s;
      }

      // Predicted R32 qualifiers — only from groups this member FULLY picked.
      // (With no/partial picks, predicted group tables default to a tie-broken
      // order, which would otherwise credit a non-predictor for free.)
      const groupMatchIdsByLetter: Record<string, string[]> = {};
      for (const m of matches) {
        if (m.group?.startsWith("Group")) {
          const g = m.group.replace("Group ", "");
          (groupMatchIdsByLetter[g] ??= []).push(m.id);
        }
      }
      const fullyPickedGroups = new Set(
        Object.entries(groupMatchIdsByLetter)
          .filter(([, ids]) => ids.every(id => scorePicks[id] != null))
          .map(([g]) => g),
      );
      const predTables = computeGroupTables(matches, scorePicks, false);
      const predThirdGroups = new Set(rankThirdPlaceTeams(predTables).slice(0, 8).map(t => t.group));
      const predR32Teams = new Set<string>();
      for (const [groupKey, rows] of Object.entries(predTables)) {
        const g = groupKey.replace("Group ", "");
        if (!fullyPickedGroups.has(g)) continue;
        if (rows[0]?.team) predR32Teams.add(rows[0].team);            // group winner
        if (rows[1]?.team) predR32Teams.add(rows[1].team);            // runner-up
        if (predThirdGroups.has(g) && rows[2]?.team) predR32Teams.add(rows[2].team); // qualifying 3rd
      }

      // Teams that reached each round — actual vs. this member's prediction.
      // Points are cumulative: a team you tracked to the final scores at every tier.
      const reached: Array<{ pts: number; actual: Set<string>; pred: Set<string> }> = [
        { pts: 2,  actual: teamSet(...actualTop, ...actualBot),                       pred: predR32Teams },
        { pts: 3,  actual: teamSet(...actualBracket.r16Top, ...actualBracket.r16Bot), pred: teamSet(...predBracket.r16Top, ...predBracket.r16Bot) },
        { pts: 5,  actual: teamSet(...actualBracket.qfTop, ...actualBracket.qfBot),   pred: teamSet(...predBracket.qfTop, ...predBracket.qfBot) },
        { pts: 7,  actual: teamSet(actualBracket.sfTop, actualBracket.sfBot),         pred: teamSet(predBracket.sfTop, predBracket.sfBot) },
        { pts: 10, actual: teamSet(actualBracket.final),                              pred: teamSet(predBracket.final) },
      ];
      for (const round of reached) {
        for (const team of round.actual) {
          if (round.pred.has(team)) { koPts += round.pts; correct++; total++; }
        }
      }

      // Champion (won the final) and 3rd place (won the play-off) — single teams.
      const pairWinner = (
        pair: { home: TeamRow | null; away: TeamRow | null },
        score?: ScoreEntry,
      ): string | null => {
        if (!pair.home || !pair.away || !score) return null;
        const side = knockoutWinner(score);
        return side ? (side === "home" ? pair.home.team : pair.away.team) : null;
      };
      const actualChampion = pairWinner(actualBracket.final, actualScores[FINAL_ID]);
      if (actualChampion && actualChampion === pairWinner(predBracket.final, scorePicks[FINAL_ID])) {
        koPts += 15; correct++; total++;
      }
      const actualThird = pairWinner(actualBracket.thirdPlace, actualScores[THIRD_PLACE_ID]);
      if (actualThird && actualThird === pairWinner(predBracket.thirdPlace, scorePicks[THIRD_PLACE_ID])) {
        koPts += 5; correct++; total++;
      }

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

      // Additive exact-score bonus: both teams in the right slots and the exact
      // score (incl. pens) nailed, for each knockout match that's been played.
      for (const [matchId, actualScore] of Object.entries(actualScores)) {
        const phase = KNOCKOUT_PHASE[matchId];
        if (!phase) continue;
        const userPick = scorePicks[matchId];
        if (!userPick) continue;

        const actualTeams = actualTeamsFor(matchId);
        const predTeams = predTeamsFor(matchId);
        if (!actualTeams?.home?.team || !actualTeams.away?.team || !predTeams) continue;

        const bothSlotsCorrect =
          predTeams.home?.team === actualTeams.home.team &&
          predTeams.away?.team === actualTeams.away.team;
        const isExact = bothSlotsCorrect &&
          userPick.home === actualScore.home &&
          userPick.away === actualScore.away &&
          (!actualScore.pens || userPick.pens === actualScore.pens);

        if (isExact) { koPts += KO_EXACT_BONUS[phase]; exact++; }
      }
    }

    return { ...member, points: groupPts + koPts, groupPts, koPts, bonusPts: 0, correct, exact, total, picked };
  });
}
