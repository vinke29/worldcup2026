import type { Match, Member, Outcome } from "./mock-data";
import { TOP_R32_IDS, BOT_R32_IDS, R16_IDS, QF_IDS, SF_IDS, THIRD_PLACE_ID, FINAL_ID } from "./bracket";
import type { ScoreEntry } from "./bracket";

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

    let points = 0, correct = 0, exact = 0, total = 0;

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
      points += pts;
    }

    // ── Knockout stage (score-pick-based) ────────────────────────────────────
    for (const [matchId, actualScore] of Object.entries(actualScores)) {
      const phase = KNOCKOUT_PHASE[matchId];
      if (!phase) continue;

      const userPick = scorePicks[matchId];
      if (!userPick) continue;

      const actualWinner = knockoutWinner(actualScore);
      const pickedWinner = knockoutWinner(userPick);
      if (!actualWinner || !pickedWinner) continue;

      total++;
      if (pickedWinner === actualWinner) {
        correct++;
        const [outcomePts, exactPts] = phasePoints(phase);
        const isExact =
          userPick.home === actualScore.home &&
          userPick.away === actualScore.away &&
          (!actualScore.pens || userPick.pens === actualScore.pens);
        if (isExact) { exact++; points += exactPts; }
        else { points += outcomePts; }
      }
    }

    return { ...member, points, correct, exact, total, picked };
  });
}
