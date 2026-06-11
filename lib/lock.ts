import { MATCHES, type LeagueMode } from "@/lib/mock-data";
import { KNOCKOUT_MATCH_META } from "@/lib/bracket";

// World Cup 2026 kicks off Jun 11, 2026. In entire-tournament leagues every
// pick freezes at this instant (or the moment the admin enters any score).
// Mirror of TOURNAMENT_START_UTC in LeagueClient.tsx.
export const TOURNAMENT_START_UTC = Date.UTC(2026, 5, 11, 23, 0);

const LOCK_WINDOW_MS = 60 * 60 * 1000; // phase_by_phase: lock 1h before kickoff

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// Mirrors kickoffUTC (LeagueClient) / matchKickoff (MatchCard): local kickoff
// times are stored as ET and offset by +4h to reach UTC.
function kickoffUTCFor(matchId: string): Date | null {
  const m = MATCHES.find((x) => x.id === matchId);
  const meta = m ? { date: m.date, time: m.time } : KNOCKOUT_MATCH_META[matchId];
  if (!meta) return null;
  const [mon, day] = meta.date.split(" ");
  const [h, min] = meta.time.split(":").map(Number);
  return new Date(Date.UTC(2026, MONTHS[mon], Number(day), h + 4, min));
}

export type ActualScores = Record<
  string,
  { home: number; away: number; pens?: "home" | "away" }
>;

/**
 * Server-side authority for whether a user may still write a pick for a match.
 * Mirrors the UI lock so a tampered/replayed request can't beat the deadline.
 */
export function isWriteLocked(
  mode: LeagueMode,
  matchId: string,
  actualScores: ActualScores,
): boolean {
  // A pick can never change once that match has an official result.
  if (actualScores[matchId]) return true;

  if (mode === "entire_tournament") {
    // Whole quiniela freezes at kickoff, or the instant any score is entered.
    return Date.now() >= TOURNAMENT_START_UTC || Object.keys(actualScores).length > 0;
  }

  // phase_by_phase: each match locks 1 hour before its own kickoff.
  const kickoff = kickoffUTCFor(matchId);
  return kickoff != null && Date.now() >= kickoff.getTime() - LOCK_WINDOW_MS;
}
