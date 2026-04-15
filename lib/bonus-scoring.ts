import type { Match } from "./mock-data";
import type { ScoreEntry } from "./bracket";
import { BONUS_QUESTIONS } from "./bonus-data";

/** Simulate group standings from a user's score picks and return the worst team name. */
export function computeWorstGroupTeam(
  matches: Match[],
  scorePicks: Record<string, ScoreEntry>,
): string | null {
  const teamStats: Record<string, { pts: number; gd: number }> = {};

  const groupMatches = matches.filter((m) => m.phase.startsWith("group-"));

  for (const match of groupMatches) {
    const pick = scorePicks[match.id];
    if (!pick) continue;

    const home = match.homeTeam;
    const away = match.awayTeam;
    if (!teamStats[home]) teamStats[home] = { pts: 0, gd: 0 };
    if (!teamStats[away]) teamStats[away] = { pts: 0, gd: 0 };

    const hg = pick.home;
    const ag = pick.away;
    const diff = hg - ag;

    teamStats[home].gd += diff;
    teamStats[away].gd -= diff;

    if (hg > ag) {
      teamStats[home].pts += 3;
    } else if (ag > hg) {
      teamStats[away].pts += 3;
    } else {
      teamStats[home].pts += 1;
      teamStats[away].pts += 1;
    }
  }

  const entries = Object.entries(teamStats);
  if (entries.length === 0) return null;

  // Sort ascending: fewest pts first, then worst GD (most negative first)
  entries.sort(([, a], [, b]) => {
    if (a.pts !== b.pts) return a.pts - b.pts;
    return a.gd - b.gd;
  });

  return entries[0][0];
}

/** Score a single bonus question given the user's answer and the actual answer. */
export function scoreBonusQuestion(
  key: string,
  userAnswer: string,
  actualAnswer: string,
): number {
  const q = BONUS_QUESTIONS.find((q) => q.key === key);
  if (!q || !userAnswer || !actualAnswer) return 0;

  if (q.type === "number") {
    const userNum = parseInt(userAnswer);
    const actualNum = parseInt(actualAnswer);
    if (isNaN(userNum) || isNaN(actualNum)) return 0;
    const diff = Math.abs(userNum - actualNum);
    if (!q.numberScoring) return diff === 0 ? 5 : 0;
    // numberScoring: [exactPts, [withinN, pts], ...]
    if (diff === 0) return q.numberScoring[0];
    for (const [withinN, pts] of q.numberScoring.slice(1) as Array<[number, number]>) {
      if (diff <= withinN) return pts;
    }
    return 0;
  }

  // player or auto: exact string match (case-insensitive trim)
  return userAnswer.trim().toLowerCase() === actualAnswer.trim().toLowerCase() ? 5 : 0;
}

/** Total bonus points for a user given their picks and the actual answers. */
export function computeBonusPoints(
  bonusPicks: Record<string, string>,
  bonusAnswers: Record<string, string>,
  worstGroupTeam: string | null,
): number {
  let pts = 0;
  for (const q of BONUS_QUESTIONS) {
    const actual = bonusAnswers[q.key];
    if (!actual) continue;
    const userAnswer = q.type === "auto" ? (worstGroupTeam ?? "") : (bonusPicks[q.key] ?? "");
    pts += scoreBonusQuestion(q.key, userAnswer, actual);
  }
  return pts;
}
