import type { Match } from "./mock-data";

export interface TeamRow {
  team: string;
  flag: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

function ensureTeam(rows: Record<string, TeamRow>, team: string, flag: string) {
  if (!rows[team]) {
    rows[team] = { team, flag, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }
}

function applyResult(
  rows: Record<string, TeamRow>,
  homeTeam: string, homeFlag: string, homeGoals: number,
  awayTeam: string, awayFlag: string, awayGoals: number,
) {
  ensureTeam(rows, homeTeam, homeFlag);
  ensureTeam(rows, awayTeam, awayFlag);

  const h = rows[homeTeam];
  const a = rows[awayTeam];

  h.mp++; a.mp++;
  h.gf += homeGoals; h.ga += awayGoals;
  a.gf += awayGoals; a.ga += homeGoals;
  h.gd = h.gf - h.ga;
  a.gd = a.gf - a.ga;

  if (homeGoals > awayGoals) {
    h.w++; h.pts += 3; a.l++;
  } else if (homeGoals === awayGoals) {
    h.d++; h.pts++; a.d++; a.pts++;
  } else {
    h.l++; a.w++; a.pts += 3;
  }
}

function sortTable(rows: TeamRow[]): TeamRow[] {
  return [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
}

export function computeGroupTables(
  matches: Match[],
  scorePicks: Record<string, { home: number; away: number }>,
  useActual = false,
): Record<string, TeamRow[]> {
  const groupRows: Record<string, Record<string, TeamRow>> = {};

  for (const match of matches) {
    if (!match.group || !match.group.startsWith("Group")) continue;
    if (!groupRows[match.group]) groupRows[match.group] = {};

    const rows = groupRows[match.group];

    if (useActual) {
      if (match.homeScore !== null && match.awayScore !== null) {
        applyResult(rows, match.homeTeam, match.homeFlag, match.homeScore, match.awayTeam, match.awayFlag, match.awayScore);
      } else {
        ensureTeam(rows, match.homeTeam, match.homeFlag);
        ensureTeam(rows, match.awayTeam, match.awayFlag);
      }
    } else {
      const pick = scorePicks[match.id];
      if (pick) {
        applyResult(rows, match.homeTeam, match.homeFlag, pick.home, match.awayTeam, match.awayFlag, pick.away);
      } else {
        ensureTeam(rows, match.homeTeam, match.homeFlag);
        ensureTeam(rows, match.awayTeam, match.awayFlag);
      }
    }
  }

  const result: Record<string, TeamRow[]> = {};
  for (const group of Object.keys(groupRows).sort()) {
    result[group] = sortTable(Object.values(groupRows[group]));
  }
  return result;
}

/** How many teams land in the same position in both tables (0–4 per group) */
export function countCorrectPositions(predicted: TeamRow[], actual: TeamRow[]): number {
  return predicted.reduce((acc, row, i) => {
    return acc + (actual[i]?.team === row.team ? 1 : 0);
  }, 0);
}

/** True if any match in the dataset has actual scores filled in */
export function hasAnyActualResults(matches: Match[]): boolean {
  return matches.some(m => m.homeScore !== null && m.awayScore !== null);
}
