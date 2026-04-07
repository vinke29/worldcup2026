import type { Match, Member, Outcome } from "./mock-data";

function actualOutcome(match: Match): Outcome | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return "home";
  if (match.awayScore > match.homeScore) return "away";
  return "draw";
}

// Points for [correct outcome, exact score] by phase
const PHASE_POINTS: Record<string, [number, number]> = {
  "group-md1": [1, 3],
  "group-md2": [1, 3],
  "group-md3": [1, 3],
  "r32":       [2, 5],
  "r16":       [3, 7],
  "qf":        [5, 10],
  "sf":        [7, 12],
  "final":     [10, 15],
};

export function phasePoints(phase: string): [number, number] {
  return PHASE_POINTS[phase] ?? [1, 3];
}

function pointsForPick(
  match: Match,
  prediction: Outcome,
  scorePick?: { home: number; away: number }
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
  liveScorePicks: Record<string, { home: number; away: number }>
): Member[] {
  const finished = matches.filter((m) => m.homeScore !== null && m.awayScore !== null);

  return members.map((member) => {
    const isCurrentUser = member.id === currentUserId;
    const predictions = isCurrentUser ? livePredictions : member.predictions;
    const scorePicks   = isCurrentUser ? liveScorePicks  : (member.scorePicks ?? {});

    let points = 0, correct = 0, exact = 0, total = 0;
    const picked = Object.keys(predictions).length;

    for (const match of finished) {
      const pred = predictions[match.id];
      if (!pred) continue;
      total++;
      const sp = scorePicks[match.id];
      const pts = pointsForPick(match, pred, sp);
      if (pts > 0) {
        correct++;
        if (sp && sp.home === match.homeScore && sp.away === match.awayScore) exact++;
      }
      points += pts;
    }

    return { ...member, points, correct, exact, total, picked };
  });
}
