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
// Seed the well-known FIFA/provider spelling differences. Extend this as the
// unmatched-fixtures report (see sync.ts) surfaces names the provider uses
// that we don't recognise. Each value MUST be a key that exists in OUR_KEYS.
const ALIAS: Record<string, string> = {
  korearepublic: "southkorea",
  republicofkorea: "southkorea",
  koreasouth: "southkorea",
  koreadpr: "northkorea",
  usa: "unitedstates",
  unitedstatesofamerica: "unitedstates",
  iranislamicrepublic: "iran",
  irar: "iran",
  bosniaandherzegovina: "bosniaherz",
  bosniaherzegovina: "bosniaherz",
  bosnaihercegovina: "bosniaherz",
  ivorycoast: "cotedivoire",
  capeverde: "caboverde",
  czechia: "czechrepublic",
  turkiye: "turkey",
};

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
