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

// ── TheSportsDB ─────────────────────────────────────────────────────────────
// Free tier covers FIFA World Cup 2026 (league 4429) incl. live scores. The
// public test key "3" works without signup; a personal key (Patreon) is more
// reliable. Set THESPORTSDB_KEY to override.
// Docs: https://www.thesportsdb.com/free_sports_api

const WORLD_CUP_LEAGUE = 4429;

interface SportsDbEvent {
  idEvent: string | null;
  strHomeTeam: string | null;
  strAwayTeam: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null;
  strTimestamp: string | null;
  dateEvent: string | null;
}

const SDB_FINISHED = new Set(["FT", "AET", "PEN", "Match Finished", "FT_PEN"]);
const SDB_LIVE = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "Live"]);

function sdbStatus(s: string | null): FixtureStatus {
  if (!s || s === "NS" || s === "Not Started") return "scheduled";
  if (SDB_FINISHED.has(s)) return "finished";
  if (SDB_LIVE.has(s)) return "live";
  return "scheduled";
}

function parseSdbEvent(e: SportsDbEvent): ProviderFixture | null {
  if (!e.strHomeTeam || !e.strAwayTeam) return null;
  const status = sdbStatus(e.strStatus);
  if (status === "scheduled") return null;

  const home = e.intHomeScore == null ? 0 : parseInt(e.intHomeScore, 10);
  const away = e.intAwayScore == null ? 0 : parseInt(e.intAwayScore, 10);
  if (Number.isNaN(home) || Number.isNaN(away)) return null;

  const koMs = e.strTimestamp
    ? Date.parse(e.strTimestamp)
    : e.dateEvent
    ? Date.parse(`${e.dateEvent}T00:00:00Z`)
    : 0;

  return {
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    homeScore: home,
    awayScore: away,
    pensWinner: null, // not exposed by this endpoint; enter KO shootouts manually
    status,
    kickoffMs: Number.isNaN(koMs) ? 0 : koMs,
  };
}

// Days on either side of "now" (UTC) to poll. The free key's season/league
// aggregate endpoints lag badly and silently drop recent fixtures, so we query
// per-day instead. The window always spans live + just-finished + next-day-
// published games (TheSportsDB sometimes dates a result the day after kickoff),
// and the sync is idempotent so already-written days never need re-covering.
const SDB_WINDOW_BACK = 2;
const SDB_WINDOW_FWD = 2;

function dayWindow(now = new Date()): string[] {
  const days: string[] = [];
  for (let offset = -SDB_WINDOW_BACK; offset <= SDB_WINDOW_FWD; offset++) {
    const d = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset,
    ));
    days.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
  }
  return days;
}

export function theSportsDbProvider(apiKey: string): ScoresProvider {
  return {
    name: "thesportsdb",
    async fetchFixtures() {
      const byId = new Map<string, ProviderFixture>();

      for (const day of dayWindow()) {
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsday.php?d=${day}&l=${WORLD_CUP_LEAGUE}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error(`thesportsdb fetch failed (${day}): ${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as { events?: SportsDbEvent[] };
        for (const ev of json.events ?? []) {
          const fixture = parseSdbEvent(ev);
          if (fixture) byId.set(ev.idEvent ?? `${ev.strHomeTeam}-${ev.strAwayTeam}-${day}`, fixture);
        }
      }

      return [...byId.values()];
    },
  };
}

/**
 * Active provider. TheSportsDB by default (free, covers WC 2026). To use
 * API-Football instead (paid plan needed for 2026), set FOOTBALL_API_KEY and
 * switch the return below.
 */
export function getProvider(): ScoresProvider {
  return theSportsDbProvider(process.env.THESPORTSDB_KEY ?? "3");
}
