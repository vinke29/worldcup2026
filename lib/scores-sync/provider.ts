import type { FixtureStatus, ProviderFixture, ScoresProvider } from "./types";

/**
 * Default provider while no API key is configured. Returns nothing, so the
 * whole pipeline is a safe no-op until FOOTBALL_API_KEY is set.
 */
export const mockProvider: ScoresProvider = {
  name: "mock",
  async fetchFixtures() {
    return [];
  },
};

// ── API-Football (api-sports.io) ────────────────────────────────────────────
// Free tier ~100 req/day. World Cup 2026 is league 1, season 2026.
// Docs: https://www.api-football.com/documentation-v3#tag/Fixtures
//
// If you'd rather use football-data.org, write another provider with the same
// shape and swap it in getProvider() — nothing downstream changes.

interface ApiFootballItem {
  fixture: { timestamp: number; status: { short: string } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
  score: { penalty: { home: number | null; away: number | null } };
}

const FINISHED = new Set(["FT", "AET", "PEN"]);
const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);

function toStatus(short: string): FixtureStatus {
  if (FINISHED.has(short)) return "finished";
  if (LIVE.has(short)) return "live";
  return "scheduled";
}

function parseItem(item: ApiFootballItem): ProviderFixture | null {
  const status = toStatus(item.fixture.status.short);
  if (status === "scheduled") return null;

  const home = item.goals.home ?? 0;
  const away = item.goals.away ?? 0;

  let pensWinner: "home" | "away" | null = null;
  const ph = item.score.penalty.home;
  const pa = item.score.penalty.away;
  if (ph != null && pa != null && ph !== pa) {
    pensWinner = ph > pa ? "home" : "away";
  }

  return {
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeScore: home,
    awayScore: away,
    pensWinner,
    status,
    kickoffMs: item.fixture.timestamp * 1000,
  };
}

export function apiFootballProvider(apiKey: string): ScoresProvider {
  return {
    name: "api-football",
    async fetchFixtures() {
      const res = await fetch(
        "https://v3.football.api-sports.io/fixtures?league=1&season=2026",
        { headers: { "x-apisports-key": apiKey }, cache: "no-store" },
      );
      if (!res.ok) {
        throw new Error(`api-football fetch failed: ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as { response?: ApiFootballItem[] };
      return (json.response ?? [])
        .map(parseItem)
        .filter((f): f is ProviderFixture => f !== null);
    },
  };
}

/** Pick the live provider if a key is configured, otherwise the safe no-op. */
export function getProvider(): ScoresProvider {
  const key = process.env.FOOTBALL_API_KEY;
  return key ? apiFootballProvider(key) : mockProvider;
}
