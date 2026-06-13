import { MATCHES } from "@/lib/mock-data";

// Normalise a team name to a comparison key: strip accents, lowercase,
// drop everything that isn't a letter or digit.
function strip(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// The exact team strings we use, keyed by their stripped form. Built from the
// real fixture list so we always compare against OUR canonical names.
const OUR_KEYS = new Set(
  MATCHES.flatMap((m) => [strip(m.homeTeam), strip(m.awayTeam)]),
);

// Provider name (stripped) -> our name (stripped).
// Only for cases where TheSportsDB spells a team differently from us — verified
// against the live feed + team search, NOT guessed (a wrong guess BREAKS an
// otherwise-fine match, e.g. an earlier capeverde->caboverde mistake). Most WC
// teams (incl. DR Congo, Iran, South Korea, Cape Verde, Ivory Coast) match
// directly and need no entry. Each value MUST be a key that exists in OUR_KEYS.
const ALIAS: Record<string, string> = {
  // Bosnia & Herz. — feed uses "Bosnia-Herzegovina"
  bosniaherzegovina: "bosniaherz",
  bosniaandherzegovina: "bosniaherz",
  // United States — feed uses "USA"
  usa: "unitedstates",
  unitedstatesofamerica: "unitedstates",
  // Safe fallbacks for FIFA's alternate spellings, in case a later (e.g. KO)
  // feed differs from the group-stage feed. All map to a real team key.
  korearepublic: "southkorea",
  republicofkorea: "southkorea",
  iranislamicrepublic: "iran",
  czechia: "czechrepublic",
  turkiye: "turkey",
};

// Dev guard: an alias whose value isn't a real team silently breaks matching.
// Surface it loudly at import time instead of waiting for a missed score.
if (process.env.NODE_ENV !== "production") {
  for (const [from, to] of Object.entries(ALIAS)) {
    if (!OUR_KEYS.has(to)) {
      console.error(`[team-aliases] alias "${from}" -> "${to}" points at no known team`);
    }
  }
}

/** Resolve any provider team name to our canonical comparison key. */
export function canonTeam(name: string): string {
  const s = strip(name);
  return ALIAS[s] ?? s;
}

/** True if a provider name resolves to a team we actually have a fixture for. */
export function isKnownTeam(name: string): boolean {
  return OUR_KEYS.has(canonTeam(name));
}

export { strip as stripTeamName };
