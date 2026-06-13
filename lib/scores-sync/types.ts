// Shared types for the automatic score-sync pipeline.

export type FixtureStatus = "scheduled" | "live" | "finished";

/** A match as reported by an external scores provider, normalised. */
export interface ProviderFixture {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  /** Penalty-shootout winner (knockout only), from the provider's POV. */
  pensWinner?: "home" | "away" | null;
  status: FixtureStatus;
  /** Kick-off time in epoch ms — used to disambiguate repeated team pairings. */
  kickoffMs: number;
}

/** A provider fixture resolved to one of our own match IDs, in OUR orientation. */
export interface MappedScore {
  matchId: string;
  home: number;
  away: number;
  pens: "home" | "away" | null;
  status: FixtureStatus;
}

export interface ScoresProvider {
  name: string;
  fetchFixtures(): Promise<ProviderFixture[]>;
}
