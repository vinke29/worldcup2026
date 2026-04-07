export type Outcome = "home" | "draw" | "away";

export type PhaseId =
  | "group-md1" | "group-md2" | "group-md3"
  | "group-a" | "group-b" | "group-c" | "group-d" | "group-e" | "group-f"
  | "group-g" | "group-h" | "group-i" | "group-j" | "group-k" | "group-l"
  | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export interface Phase {
  id: PhaseId;
  label: string;
  shortLabel: string;
  deadline: string;
  status: "open" | "locked" | "completed";
  matchCount: number;
}

export interface Match {
  id: string;
  phase: PhaseId;
  group: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  date: string;
  time: string;
  venue: string;
  illustration?: string;
  imagePosition?: string;
  communityHome: number;
  communityDraw: number;
  communityAway: number;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  homeScore: number | null;
  awayScore: number | null;
}

export interface Member {
  id: string; name: string; avatar: string;
  points: number; correct: number; exact: number; total: number; picked: number;
  predictions: Record<string, Outcome>;
  scorePicks?: Record<string, import("./bracket").ScoreEntry>;
}

export type LeagueMode = "phase_by_phase" | "entire_tournament";

export interface League {
  id: string; name: string; code: string; mode: LeagueMode; members: Member[];
}

export const PHASES: Phase[] = [
  { id: "group-md1", label: "Group Stage · MD1", shortLabel: "MD 1", deadline: "Jun 11 · 13:00", status: "open",   matchCount: 24 },
  { id: "group-md2", label: "Group Stage · MD2", shortLabel: "MD 2", deadline: "Jun 18 · 12:00", status: "open", matchCount: 24 },
  { id: "group-md3", label: "Group Stage · MD3", shortLabel: "MD 3", deadline: "Jun 24 · 12:00", status: "open", matchCount: 24 },
  { id: "r32",       label: "Round of 32",        shortLabel: "R32",  deadline: "Jun 29 · 12:00", status: "locked", matchCount: 16 },
  { id: "r16",       label: "Round of 16",        shortLabel: "R16",  deadline: "Jul 4 · 12:00",  status: "locked", matchCount: 8  },
  { id: "qf",        label: "Quarter-finals",     shortLabel: "QF",   deadline: "Jul 9 · 12:00",  status: "locked", matchCount: 4  },
  { id: "sf",        label: "Semi-finals",        shortLabel: "SF",    deadline: "Jul 13 · 12:00", status: "locked", matchCount: 2  },
  { id: "third",     label: "3rd Place",          shortLabel: "3rd",   deadline: "Jul 18 · 12:00", status: "locked", matchCount: 1  },
  { id: "final",     label: "Final",              shortLabel: "Final", deadline: "Jul 19 · 12:00", status: "locked", matchCount: 1  },
];

/** Per-group phases used in entire_tournament mode (Group A … L, then KO rounds) */
export const WHOLE_GROUP_PHASES: Phase[] = [
  { id: "group-a", label: "Group A", shortLabel: "A", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-b", label: "Group B", shortLabel: "B", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-c", label: "Group C", shortLabel: "C", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-d", label: "Group D", shortLabel: "D", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-e", label: "Group E", shortLabel: "E", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-f", label: "Group F", shortLabel: "F", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-g", label: "Group G", shortLabel: "G", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-h", label: "Group H", shortLabel: "H", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-i", label: "Group I", shortLabel: "I", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-j", label: "Group J", shortLabel: "J", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-k", label: "Group K", shortLabel: "K", deadline: "Jun 25", status: "open", matchCount: 6 },
  { id: "group-l", label: "Group L", shortLabel: "L", deadline: "Jun 25", status: "open", matchCount: 6 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
type M = Omit<Match, "homeScore" | "awayScore"> & { homeScore?: null; awayScore?: null };
const m = (data: M): Match => ({ ...data, homeScore: null, awayScore: null });

// ─── GROUP A: Mexico, South Africa, South Korea, Czech Republic ───────────────
// ─── GROUP B: Canada, Bosnia and Herzegovina, Qatar, Switzerland ──────────────
// ─── GROUP C: Brazil, Morocco, Haiti, Scotland ────────────────────────────────
// ─── GROUP D: United States, Paraguay, Australia, Turkey ─────────────────────
// ─── GROUP E: Germany, Curaçao, Ivory Coast, Ecuador ─────────────────────────
// ─── GROUP F: Netherlands, Japan, Sweden, Tunisia ────────────────────────────
// ─── GROUP G: Belgium, Egypt, Iran, New Zealand ──────────────────────────────
// ─── GROUP H: Spain, Cape Verde, Saudi Arabia, Uruguay ───────────────────────
// ─── GROUP I: France, Senegal, Iraq, Norway ──────────────────────────────────
// ─── GROUP J: Argentina, Algeria, Austria, Jordan ────────────────────────────
// ─── GROUP K: Portugal, DR Congo, Uzbekistan, Colombia ───────────────────────
// ─── GROUP L: England, Croatia, Ghana, Panama ────────────────────────────────

export const MATCHES: Match[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP A
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"a1-1", phase:"group-md1", group:"Group A", homeTeam:"Mexico",       homeFlag:"🇲🇽", awayTeam:"South Africa", awayFlag:"🇿🇦", date:"Jun 11", time:"19:00", venue:"Estadio Azteca · Mexico City",          communityHome:55, communityDraw:24, communityAway:21, oddsHome:58, oddsDraw:23, oddsAway:19, illustration:"/match-a-mex-rsa.png" }),
  m({ id:"a1-2", phase:"group-md1", group:"Group A", homeTeam:"South Korea",  homeFlag:"🇰🇷", awayTeam:"Czech Republic",awayFlag:"🇨🇿", date:"Jun 11", time:"22:00", venue:"Estadio Akron · Guadalupe",             communityHome:40, communityDraw:30, communityAway:30, oddsHome:38, oddsDraw:31, oddsAway:31, illustration:"/match-a-kor-cze.png" }),
  m({ id:"a2-1", phase:"group-md2", group:"Group A", homeTeam:"Czech Republic",homeFlag:"🇨🇿", awayTeam:"South Africa", awayFlag:"🇿🇦", date:"Jun 18", time:"16:00", venue:"Mercedes-Benz Stadium · Atlanta",       communityHome:42, communityDraw:30, communityAway:28, oddsHome:44, oddsDraw:29, oddsAway:27, illustration:"/match-a-cze-rsa.png" }),
  m({ id:"a2-2", phase:"group-md2", group:"Group A", homeTeam:"Mexico",       homeFlag:"🇲🇽", awayTeam:"South Korea",   awayFlag:"🇰🇷", date:"Jun 18", time:"22:00", venue:"Estadio Akron · Guadalupe",             communityHome:48, communityDraw:27, communityAway:25, oddsHome:46, oddsDraw:28, oddsAway:26, illustration:"/match-a-mex-kor.png" }),
  m({ id:"a3-1", phase:"group-md3", group:"Group A", homeTeam:"Czech Republic",homeFlag:"🇨🇿", awayTeam:"Mexico",        awayFlag:"🇲🇽", date:"Jun 24", time:"22:00", venue:"Estadio Azteca · Mexico City",          communityHome:28, communityDraw:26, communityAway:46, oddsHome:26, oddsDraw:25, oddsAway:49, illustration:"/match-a-cze-mex.png" }),
  m({ id:"a3-2", phase:"group-md3", group:"Group A", homeTeam:"South Africa", homeFlag:"🇿🇦", awayTeam:"South Korea",   awayFlag:"🇰🇷", date:"Jun 24", time:"22:00", venue:"Estadio BBVA · Guadalupe",              communityHome:30, communityDraw:30, communityAway:40, oddsHome:28, oddsDraw:30, oddsAway:42, illustration:"/match-a-rsa-kor.png" }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP B
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"b1-1", phase:"group-md1", group:"Group B", homeTeam:"Canada",       homeFlag:"🇨🇦", awayTeam:"Bosnia & Herz.", awayFlag:"🇧🇦", date:"Jun 12", time:"18:00", venue:"BMO Field · Toronto",                   communityHome:45, communityDraw:28, communityAway:27, oddsHome:42, oddsDraw:30, oddsAway:28, illustration:"/match-b-can-bih.png", imagePosition:"center 5%" }),
  m({ id:"b1-2", phase:"group-md1", group:"Group B", homeTeam:"Qatar",        homeFlag:"🇶🇦", awayTeam:"Switzerland",   awayFlag:"🇨🇭", date:"Jun 13", time:"21:00", venue:"Levi's Stadium · San Francisco",         communityHome:20, communityDraw:28, communityAway:52, oddsHome:18, oddsDraw:26, oddsAway:56, illustration:"/match-b-qat-sui.png", imagePosition:"center 50%" }),
  m({ id:"b2-1", phase:"group-md2", group:"Group B", homeTeam:"Switzerland",  homeFlag:"🇨🇭", awayTeam:"Bosnia & Herz.", awayFlag:"🇧🇦", date:"Jun 18", time:"18:00", venue:"SoFi Stadium · Los Angeles",             communityHome:48, communityDraw:28, communityAway:24, oddsHome:50, oddsDraw:27, oddsAway:23 }),
  m({ id:"b2-2", phase:"group-md2", group:"Group B", homeTeam:"Canada",       homeFlag:"🇨🇦", awayTeam:"Qatar",          awayFlag:"🇶🇦", date:"Jun 18", time:"22:00", venue:"BC Place · Vancouver",                   communityHome:62, communityDraw:22, communityAway:16, oddsHome:65, oddsDraw:21, oddsAway:14 }),
  m({ id:"b3-1", phase:"group-md3", group:"Group B", homeTeam:"Switzerland",  homeFlag:"🇨🇭", awayTeam:"Canada",         awayFlag:"🇨🇦", date:"Jun 24", time:"22:00", venue:"BC Place · Vancouver",                   communityHome:35, communityDraw:28, communityAway:37, oddsHome:34, oddsDraw:27, oddsAway:39 }),
  m({ id:"b3-2", phase:"group-md3", group:"Group B", homeTeam:"Bosnia & Herz.",homeFlag:"🇧🇦", awayTeam:"Qatar",          awayFlag:"🇶🇦", date:"Jun 24", time:"22:00", venue:"Lumen Field · Seattle",                 communityHome:50, communityDraw:28, communityAway:22, oddsHome:52, oddsDraw:27, oddsAway:21 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP C
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"c1-1", phase:"group-md1", group:"Group C", homeTeam:"Brazil",       homeFlag:"🇧🇷", awayTeam:"Morocco",        awayFlag:"🇲🇦", date:"Jun 13", time:"18:00", venue:"MetLife Stadium · New York",             communityHome:58, communityDraw:22, communityAway:20, oddsHome:60, oddsDraw:21, oddsAway:19, illustration:"/match-c-bra-mar.png" }),
  m({ id:"c1-2", phase:"group-md1", group:"Group C", homeTeam:"Haiti",        homeFlag:"🇭🇹", awayTeam:"Scotland",       awayFlag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", date:"Jun 13", time:"21:00", venue:"Gillette Stadium · Boston",              communityHome:22, communityDraw:28, communityAway:50, oddsHome:20, oddsDraw:27, oddsAway:53, illustration:"/match-c-hai-sco.png" }),
  m({ id:"c2-1", phase:"group-md2", group:"Group C", homeTeam:"Scotland",     homeFlag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", awayTeam:"Morocco",       awayFlag:"🇲🇦", date:"Jun 19", time:"18:00", venue:"Gillette Stadium · Boston",              communityHome:30, communityDraw:28, communityAway:42, oddsHome:28, oddsDraw:27, oddsAway:45 }),
  m({ id:"c2-2", phase:"group-md2", group:"Group C", homeTeam:"Brazil",       homeFlag:"🇧🇷", awayTeam:"Haiti",          awayFlag:"🇭🇹", date:"Jun 19", time:"22:00", venue:"Lincoln Financial Field · Philadelphia",  communityHome:88, communityDraw:8,  communityAway:4,  oddsHome:90, oddsDraw:7,  oddsAway:3  }),
  m({ id:"c3-1", phase:"group-md3", group:"Group C", homeTeam:"Scotland",     homeFlag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", awayTeam:"Brazil",       awayFlag:"🇧🇷", date:"Jun 24", time:"22:00", venue:"Hard Rock Stadium · Miami",              communityHome:15, communityDraw:20, communityAway:65, oddsHome:13, oddsDraw:19, oddsAway:68 }),
  m({ id:"c3-2", phase:"group-md3", group:"Group C", homeTeam:"Morocco",      homeFlag:"🇲🇦", awayTeam:"Haiti",          awayFlag:"🇭🇹", date:"Jun 24", time:"22:00", venue:"Mercedes-Benz Stadium · Atlanta",       communityHome:72, communityDraw:16, communityAway:12, oddsHome:74, oddsDraw:15, oddsAway:11 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP D
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"d1-1", phase:"group-md1", group:"Group D", homeTeam:"United States", homeFlag:"🇺🇸", awayTeam:"Paraguay",      awayFlag:"🇵🇾", date:"Jun 12", time:"21:00", venue:"SoFi Stadium · Los Angeles",             communityHome:55, communityDraw:24, communityAway:21, oddsHome:52, oddsDraw:25, oddsAway:23, illustration:"/match-d-usa-par.png" }),
  m({ id:"d1-2", phase:"group-md1", group:"Group D", homeTeam:"Australia",    homeFlag:"🇦🇺", awayTeam:"Turkey",         awayFlag:"🇹🇷", date:"Jun 13", time:"18:00", venue:"BC Place · Vancouver",                   communityHome:38, communityDraw:30, communityAway:32, oddsHome:36, oddsDraw:31, oddsAway:33, illustration:"/match-d-aus-tur.png" }),
  m({ id:"d2-1", phase:"group-md2", group:"Group D", homeTeam:"United States", homeFlag:"🇺🇸", awayTeam:"Australia",     awayFlag:"🇦🇺", date:"Jun 19", time:"21:00", venue:"Lumen Field · Seattle",                 communityHome:55, communityDraw:24, communityAway:21, oddsHome:54, oddsDraw:24, oddsAway:22 }),
  m({ id:"d2-2", phase:"group-md2", group:"Group D", homeTeam:"Turkey",       homeFlag:"🇹🇷", awayTeam:"Paraguay",       awayFlag:"🇵🇾", date:"Jun 19", time:"21:00", venue:"Levi's Stadium · San Francisco",         communityHome:42, communityDraw:28, communityAway:30, oddsHome:40, oddsDraw:29, oddsAway:31 }),
  m({ id:"d3-1", phase:"group-md3", group:"Group D", homeTeam:"Turkey",       homeFlag:"🇹🇷", awayTeam:"United States", awayFlag:"🇺🇸", date:"Jun 25", time:"22:00", venue:"SoFi Stadium · Los Angeles",             communityHome:32, communityDraw:26, communityAway:42, oddsHome:30, oddsDraw:25, oddsAway:45 }),
  m({ id:"d3-2", phase:"group-md3", group:"Group D", homeTeam:"Paraguay",     homeFlag:"🇵🇾", awayTeam:"Australia",      awayFlag:"🇦🇺", date:"Jun 25", time:"22:00", venue:"Levi's Stadium · San Francisco",         communityHome:40, communityDraw:30, communityAway:30, oddsHome:38, oddsDraw:31, oddsAway:31 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP E
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"e1-1", phase:"group-md1", group:"Group E", homeTeam:"Germany",      homeFlag:"🇩🇪", awayTeam:"Curaçao",        awayFlag:"🇨🇼", date:"Jun 14", time:"18:00", venue:"NRG Stadium · Houston",                  communityHome:82, communityDraw:12, communityAway:6,  oddsHome:85, oddsDraw:10, oddsAway:5, illustration:"/match-e-ger-cur.png"  }),
  m({ id:"e1-2", phase:"group-md1", group:"Group E", homeTeam:"Ivory Coast",  homeFlag:"🇨🇮", awayTeam:"Ecuador",        awayFlag:"🇪🇨", date:"Jun 14", time:"21:00", venue:"Lincoln Financial Field · Philadelphia",  communityHome:38, communityDraw:30, communityAway:32, oddsHome:36, oddsDraw:31, oddsAway:33, illustration:"/match-e-civ-ecu.png" }),
  m({ id:"e2-1", phase:"group-md2", group:"Group E", homeTeam:"Germany",      homeFlag:"🇩🇪", awayTeam:"Ivory Coast",    awayFlag:"🇨🇮", date:"Jun 20", time:"18:00", venue:"BMO Field · Toronto",                    communityHome:58, communityDraw:24, communityAway:18, oddsHome:60, oddsDraw:23, oddsAway:17 }),
  m({ id:"e2-2", phase:"group-md2", group:"Group E", homeTeam:"Ecuador",      homeFlag:"🇪🇨", awayTeam:"Curaçao",        awayFlag:"🇨🇼", date:"Jun 20", time:"21:00", venue:"Arrowhead Stadium · Kansas City",        communityHome:65, communityDraw:22, communityAway:13, oddsHome:68, oddsDraw:21, oddsAway:11 }),
  m({ id:"e3-1", phase:"group-md3", group:"Group E", homeTeam:"Curaçao",      homeFlag:"🇨🇼", awayTeam:"Ivory Coast",    awayFlag:"🇨🇮", date:"Jun 25", time:"22:00", venue:"Lincoln Financial Field · Philadelphia",  communityHome:25, communityDraw:28, communityAway:47, oddsHome:22, oddsDraw:27, oddsAway:51 }),
  m({ id:"e3-2", phase:"group-md3", group:"Group E", homeTeam:"Ecuador",      homeFlag:"🇪🇨", awayTeam:"Germany",        awayFlag:"🇩🇪", date:"Jun 25", time:"22:00", venue:"MetLife Stadium · New York",             communityHome:18, communityDraw:22, communityAway:60, oddsHome:16, oddsDraw:20, oddsAway:64 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP F
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"f1-1", phase:"group-md1", group:"Group F", homeTeam:"Netherlands",  homeFlag:"🇳🇱", awayTeam:"Japan",          awayFlag:"🇯🇵", date:"Jun 14", time:"18:00", venue:"AT&T Stadium · Dallas",                  communityHome:52, communityDraw:26, communityAway:22, oddsHome:54, oddsDraw:24, oddsAway:22, illustration:"/match-f-ned-jpn.png" }),
  m({ id:"f1-2", phase:"group-md1", group:"Group F", homeTeam:"Sweden",       homeFlag:"🇸🇪", awayTeam:"Tunisia",        awayFlag:"🇹🇳", date:"Jun 14", time:"21:00", venue:"Estadio BBVA · Guadalupe",              communityHome:55, communityDraw:25, communityAway:20, oddsHome:58, oddsDraw:23, oddsAway:19, illustration:"/match-f-swe-tun.png" }),
  m({ id:"f2-1", phase:"group-md2", group:"Group F", homeTeam:"Netherlands",  homeFlag:"🇳🇱", awayTeam:"Sweden",         awayFlag:"🇸🇪", date:"Jun 20", time:"21:00", venue:"NRG Stadium · Houston",                  communityHome:48, communityDraw:27, communityAway:25, oddsHome:46, oddsDraw:28, oddsAway:26 }),
  m({ id:"f2-2", phase:"group-md2", group:"Group F", homeTeam:"Tunisia",      homeFlag:"🇹🇳", awayTeam:"Japan",          awayFlag:"🇯🇵", date:"Jun 20", time:"21:00", venue:"Estadio BBVA · Guadalupe",              communityHome:30, communityDraw:28, communityAway:42, oddsHome:28, oddsDraw:27, oddsAway:45 }),
  m({ id:"f3-1", phase:"group-md3", group:"Group F", homeTeam:"Japan",        homeFlag:"🇯🇵", awayTeam:"Sweden",         awayFlag:"🇸🇪", date:"Jun 25", time:"22:00", venue:"AT&T Stadium · Dallas",                  communityHome:38, communityDraw:28, communityAway:34, oddsHome:36, oddsDraw:29, oddsAway:35 }),
  m({ id:"f3-2", phase:"group-md3", group:"Group F", homeTeam:"Tunisia",      homeFlag:"🇹🇳", awayTeam:"Netherlands",    awayFlag:"🇳🇱", date:"Jun 25", time:"22:00", venue:"Arrowhead Stadium · Kansas City",        communityHome:20, communityDraw:24, communityAway:56, oddsHome:18, oddsDraw:22, oddsAway:60 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP G
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"g1-1", phase:"group-md1", group:"Group G", homeTeam:"Iran",         homeFlag:"🇮🇷", awayTeam:"New Zealand",   awayFlag:"🇳🇿", date:"Jun 15", time:"18:00", venue:"SoFi Stadium · Los Angeles",             communityHome:45, communityDraw:28, communityAway:27, oddsHome:48, oddsDraw:26, oddsAway:26, illustration:"/match-g-ira-nzl.png" }),
  m({ id:"g1-2", phase:"group-md1", group:"Group G", homeTeam:"Belgium",      homeFlag:"🇧🇪", awayTeam:"Egypt",         awayFlag:"🇪🇬", date:"Jun 15", time:"22:00", venue:"Lumen Field · Seattle",                 communityHome:60, communityDraw:22, communityAway:18, oddsHome:62, oddsDraw:21, oddsAway:17, illustration:"/match-g-bel-egy.png" }),
  m({ id:"g2-1", phase:"group-md2", group:"Group G", homeTeam:"Belgium",      homeFlag:"🇧🇪", awayTeam:"Iran",          awayFlag:"🇮🇷", date:"Jun 21", time:"18:00", venue:"SoFi Stadium · Los Angeles",             communityHome:62, communityDraw:22, communityAway:16, oddsHome:64, oddsDraw:21, oddsAway:15 }),
  m({ id:"g2-2", phase:"group-md2", group:"Group G", homeTeam:"New Zealand",  homeFlag:"🇳🇿", awayTeam:"Egypt",         awayFlag:"🇪🇬", date:"Jun 21", time:"22:00", venue:"BC Place · Vancouver",                   communityHome:35, communityDraw:30, communityAway:35, oddsHome:33, oddsDraw:30, oddsAway:37 }),
  m({ id:"g3-1", phase:"group-md3", group:"Group G", homeTeam:"Egypt",        homeFlag:"🇪🇬", awayTeam:"Iran",          awayFlag:"🇮🇷", date:"Jun 26", time:"22:00", venue:"Lumen Field · Seattle",                 communityHome:38, communityDraw:30, communityAway:32, oddsHome:36, oddsDraw:31, oddsAway:33 }),
  m({ id:"g3-2", phase:"group-md3", group:"Group G", homeTeam:"New Zealand",  homeFlag:"🇳🇿", awayTeam:"Belgium",       awayFlag:"🇧🇪", date:"Jun 26", time:"22:00", venue:"BC Place · Vancouver",                   communityHome:18, communityDraw:22, communityAway:60, oddsHome:16, oddsDraw:20, oddsAway:64 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP H
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"h1-1", phase:"group-md1", group:"Group H", homeTeam:"Saudi Arabia", homeFlag:"🇸🇦", awayTeam:"Uruguay",        awayFlag:"🇺🇾", date:"Jun 15", time:"18:00", venue:"Hard Rock Stadium · Miami",              communityHome:25, communityDraw:28, communityAway:47, oddsHome:22, oddsDraw:26, oddsAway:52, illustration:"/match-h-ksa-uru.png" }),
  m({ id:"h1-2", phase:"group-md1", group:"Group H", homeTeam:"Spain",        homeFlag:"🇪🇸", awayTeam:"Cape Verde",     awayFlag:"🇨🇻", date:"Jun 15", time:"22:00", venue:"Mercedes-Benz Stadium · Atlanta",       communityHome:80, communityDraw:13, communityAway:7,  oddsHome:82, oddsDraw:11, oddsAway:7, illustration:"/match-h-esp-cpv.png"  }),
  m({ id:"h2-1", phase:"group-md2", group:"Group H", homeTeam:"Uruguay",      homeFlag:"🇺🇾", awayTeam:"Cape Verde",     awayFlag:"🇨🇻", date:"Jun 21", time:"18:00", venue:"Hard Rock Stadium · Miami",              communityHome:65, communityDraw:20, communityAway:15, oddsHome:68, oddsDraw:19, oddsAway:13 }),
  m({ id:"h2-2", phase:"group-md2", group:"Group H", homeTeam:"Spain",        homeFlag:"🇪🇸", awayTeam:"Saudi Arabia",   awayFlag:"🇸🇦", date:"Jun 21", time:"22:00", venue:"Mercedes-Benz Stadium · Atlanta",       communityHome:68, communityDraw:20, communityAway:12, oddsHome:70, oddsDraw:19, oddsAway:11 }),
  m({ id:"h3-1", phase:"group-md3", group:"Group H", homeTeam:"Cape Verde",   homeFlag:"🇨🇻", awayTeam:"Saudi Arabia",   awayFlag:"🇸🇦", date:"Jun 26", time:"22:00", venue:"NRG Stadium · Houston",                  communityHome:40, communityDraw:30, communityAway:30, oddsHome:38, oddsDraw:31, oddsAway:31 }),
  m({ id:"h3-2", phase:"group-md3", group:"Group H", homeTeam:"Uruguay",      homeFlag:"🇺🇾", awayTeam:"Spain",          awayFlag:"🇪🇸", date:"Jun 26", time:"22:00", venue:"Estadio Akron · Guadalupe",             communityHome:22, communityDraw:24, communityAway:54, oddsHome:20, oddsDraw:23, oddsAway:57 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP I
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"i1-1", phase:"group-md1", group:"Group I", homeTeam:"France",       homeFlag:"🇫🇷", awayTeam:"Senegal",        awayFlag:"🇸🇳", date:"Jun 16", time:"18:00", venue:"MetLife Stadium · New York",             communityHome:64, communityDraw:20, communityAway:16, oddsHome:66, oddsDraw:19, oddsAway:15, illustration:"/match-i-fra-sen.png" }),
  m({ id:"i1-2", phase:"group-md1", group:"Group I", homeTeam:"Iraq",         homeFlag:"🇮🇶", awayTeam:"Norway",         awayFlag:"🇳🇴", date:"Jun 16", time:"21:00", venue:"Gillette Stadium · Boston",              communityHome:25, communityDraw:30, communityAway:45, oddsHome:22, oddsDraw:29, oddsAway:49, illustration:"/match-i-irq-nor.png" }),
  m({ id:"i2-1", phase:"group-md2", group:"Group I", homeTeam:"France",       homeFlag:"🇫🇷", awayTeam:"Iraq",           awayFlag:"🇮🇶", date:"Jun 22", time:"18:00", venue:"Lincoln Financial Field · Philadelphia",  communityHome:85, communityDraw:10, communityAway:5,  oddsHome:87, oddsDraw:9,  oddsAway:4  }),
  m({ id:"i2-2", phase:"group-md2", group:"Group I", homeTeam:"Norway",       homeFlag:"🇳🇴", awayTeam:"Senegal",        awayFlag:"🇸🇳", date:"Jun 22", time:"22:00", venue:"MetLife Stadium · New York",             communityHome:45, communityDraw:28, communityAway:27, oddsHome:44, oddsDraw:28, oddsAway:28 }),
  m({ id:"i3-1", phase:"group-md3", group:"Group I", homeTeam:"Norway",       homeFlag:"🇳🇴", awayTeam:"France",         awayFlag:"🇫🇷", date:"Jun 26", time:"22:00", venue:"Gillette Stadium · Boston",              communityHome:18, communityDraw:22, communityAway:60, oddsHome:16, oddsDraw:20, oddsAway:64 }),
  m({ id:"i3-2", phase:"group-md3", group:"Group I", homeTeam:"Senegal",      homeFlag:"🇸🇳", awayTeam:"Iraq",           awayFlag:"🇮🇶", date:"Jun 26", time:"22:00", venue:"BMO Field · Toronto",                    communityHome:60, communityDraw:22, communityAway:18, oddsHome:62, oddsDraw:21, oddsAway:17 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP J
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"j1-1", phase:"group-md1", group:"Group J", homeTeam:"Argentina",    homeFlag:"🇦🇷", awayTeam:"Algeria",        awayFlag:"🇩🇿", date:"Jun 16", time:"21:00", venue:"Arrowhead Stadium · Kansas City",        communityHome:70, communityDraw:18, communityAway:12, oddsHome:72, oddsDraw:17, oddsAway:11, illustration:"/match-j-arg-alg.png" }),
  m({ id:"j1-2", phase:"group-md1", group:"Group J", homeTeam:"Austria",      homeFlag:"🇦🇹", awayTeam:"Jordan",         awayFlag:"🇯🇴", date:"Jun 16", time:"21:00", venue:"Levi's Stadium · San Francisco",         communityHome:55, communityDraw:25, communityAway:20, oddsHome:58, oddsDraw:23, oddsAway:19, illustration:"/match-j-aut-jor.png" }),
  m({ id:"j2-1", phase:"group-md2", group:"Group J", homeTeam:"Argentina",    homeFlag:"🇦🇷", awayTeam:"Austria",        awayFlag:"🇦🇹", date:"Jun 22", time:"21:00", venue:"AT&T Stadium · Dallas",                  communityHome:65, communityDraw:20, communityAway:15, oddsHome:67, oddsDraw:19, oddsAway:14 }),
  m({ id:"j2-2", phase:"group-md2", group:"Group J", homeTeam:"Jordan",       homeFlag:"🇯🇴", awayTeam:"Algeria",        awayFlag:"🇩🇿", date:"Jun 22", time:"21:00", venue:"Levi's Stadium · San Francisco",         communityHome:38, communityDraw:30, communityAway:32, oddsHome:36, oddsDraw:31, oddsAway:33 }),
  m({ id:"j3-1", phase:"group-md3", group:"Group J", homeTeam:"Algeria",      homeFlag:"🇩🇿", awayTeam:"Austria",        awayFlag:"🇦🇹", date:"Jun 27", time:"22:00", venue:"Arrowhead Stadium · Kansas City",        communityHome:35, communityDraw:28, communityAway:37, oddsHome:33, oddsDraw:27, oddsAway:40 }),
  m({ id:"j3-2", phase:"group-md3", group:"Group J", homeTeam:"Jordan",       homeFlag:"🇯🇴", awayTeam:"Argentina",      awayFlag:"🇦🇷", date:"Jun 27", time:"22:00", venue:"AT&T Stadium · Dallas",                  communityHome:10, communityDraw:18, communityAway:72, oddsHome:8,  oddsDraw:16, oddsAway:76 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP K
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"k1-1", phase:"group-md1", group:"Group K", homeTeam:"Portugal",     homeFlag:"🇵🇹", awayTeam:"DR Congo",       awayFlag:"🇨🇩", date:"Jun 17", time:"18:00", venue:"NRG Stadium · Houston",                  communityHome:72, communityDraw:16, communityAway:12, oddsHome:74, oddsDraw:15, oddsAway:11, illustration:"/match-k-por-cgo.png" }),
  m({ id:"k1-2", phase:"group-md1", group:"Group K", homeTeam:"Uzbekistan",   homeFlag:"🇺🇿", awayTeam:"Colombia",       awayFlag:"🇨🇴", date:"Jun 17", time:"21:00", venue:"Estadio Azteca · Mexico City",          communityHome:20, communityDraw:28, communityAway:52, oddsHome:18, oddsDraw:26, oddsAway:56, illustration:"/match-k-uzb-col.png" }),
  m({ id:"k2-1", phase:"group-md2", group:"Group K", homeTeam:"Portugal",     homeFlag:"🇵🇹", awayTeam:"Uzbekistan",     awayFlag:"🇺🇿", date:"Jun 23", time:"18:00", venue:"NRG Stadium · Houston",                  communityHome:78, communityDraw:14, communityAway:8,  oddsHome:80, oddsDraw:13, oddsAway:7  }),
  m({ id:"k2-2", phase:"group-md2", group:"Group K", homeTeam:"Colombia",     homeFlag:"🇨🇴", awayTeam:"DR Congo",       awayFlag:"🇨🇩", date:"Jun 23", time:"21:00", venue:"Estadio Akron · Guadalupe",             communityHome:55, communityDraw:25, communityAway:20, oddsHome:58, oddsDraw:23, oddsAway:19 }),
  m({ id:"k3-1", phase:"group-md3", group:"Group K", homeTeam:"Colombia",     homeFlag:"🇨🇴", awayTeam:"Portugal",       awayFlag:"🇵🇹", date:"Jun 27", time:"22:00", venue:"Hard Rock Stadium · Miami",              communityHome:22, communityDraw:24, communityAway:54, oddsHome:20, oddsDraw:22, oddsAway:58 }),
  m({ id:"k3-2", phase:"group-md3", group:"Group K", homeTeam:"DR Congo",     homeFlag:"🇨🇩", awayTeam:"Uzbekistan",     awayFlag:"🇺🇿", date:"Jun 27", time:"22:00", venue:"Mercedes-Benz Stadium · Atlanta",       communityHome:52, communityDraw:26, communityAway:22, oddsHome:54, oddsDraw:25, oddsAway:21 }),

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP L
  // ══════════════════════════════════════════════════════════════════════════
  m({ id:"l1-1", phase:"group-md1", group:"Group L", homeTeam:"England",      homeFlag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayTeam:"Croatia",       awayFlag:"🇭🇷", date:"Jun 17", time:"21:00", venue:"AT&T Stadium · Dallas",                  communityHome:52, communityDraw:26, communityAway:22, oddsHome:54, oddsDraw:24, oddsAway:22, illustration:"/match-l-eng-cro.png" }),
  m({ id:"l1-2", phase:"group-md1", group:"Group L", homeTeam:"Ghana",        homeFlag:"🇬🇭", awayTeam:"Panama",         awayFlag:"🇵🇦", date:"Jun 17", time:"21:00", venue:"BMO Field · Toronto",                    communityHome:48, communityDraw:28, communityAway:24, oddsHome:46, oddsDraw:29, oddsAway:25, illustration:"/match-l-gha-pan.png" }),
  m({ id:"l2-1", phase:"group-md2", group:"Group L", homeTeam:"England",      homeFlag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayTeam:"Ghana",         awayFlag:"🇬🇭", date:"Jun 23", time:"21:00", venue:"Gillette Stadium · Boston",              communityHome:62, communityDraw:22, communityAway:16, oddsHome:64, oddsDraw:21, oddsAway:15 }),
  m({ id:"l2-2", phase:"group-md2", group:"Group L", homeTeam:"Panama",       homeFlag:"🇵🇦", awayTeam:"Croatia",        awayFlag:"🇭🇷", date:"Jun 23", time:"21:00", venue:"BMO Field · Toronto",                    communityHome:22, communityDraw:26, communityAway:52, oddsHome:20, oddsDraw:24, oddsAway:56 }),
  m({ id:"l3-1", phase:"group-md3", group:"Group L", homeTeam:"Panama",       homeFlag:"🇵🇦", awayTeam:"England",        awayFlag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", date:"Jun 27", time:"22:00", venue:"MetLife Stadium · New York",             communityHome:12, communityDraw:18, communityAway:70, oddsHome:10, oddsDraw:16, oddsAway:74 }),
  m({ id:"l3-2", phase:"group-md3", group:"Group L", homeTeam:"Croatia",      homeFlag:"🇭🇷", awayTeam:"Ghana",          awayFlag:"🇬🇭", date:"Jun 27", time:"22:00", venue:"Lincoln Financial Field · Philadelphia",  communityHome:48, communityDraw:28, communityAway:24, oddsHome:50, oddsDraw:27, oddsAway:23 }),
];

// Finished matches for testing: a1-1 (MEX 2-0 RSA), a1-2 (KOR 1-1 CZE), j1-1 (ARG 3-0 ALG), i1-1 (FRA 2-1 SEN)
export const MOCK_LEAGUE: League = {
  id: "abc123",
  name: "La Banda del Martes",
  code: "BANDA26",
  mode: "phase_by_phase",
  members: [
    // Ignacio (u1): predictions come from live state in the page — seeded there
    { id:"u1", name:"Ignacio",   avatar:"IG", points:0, correct:0, exact:0, total:0, picked:0, predictions:{} },
    // Rodrigo: a1-1 home ✓, a1-2 home ✗, j1-1 home ✓ exact, i1-1 home ✓
    { id:"u2", name:"Rodrigo",   avatar:"RO", points:0, correct:0, exact:0, total:0, picked:0,
      predictions:{ "a1-1":"home", "a1-2":"home", "j1-1":"home", "i1-1":"home" },
      scorePicks:{ "j1-1":{ home:3, away:0 } } },
    // Camila: a1-1 draw ✗, a1-2 draw ✓, j1-1 home ✓, i1-1 away ✗
    { id:"u3", name:"Camila",    avatar:"CA", points:0, correct:0, exact:0, total:0, picked:0,
      predictions:{ "a1-1":"draw", "a1-2":"draw", "j1-1":"home", "i1-1":"away" } },
    // Matías: a1-1 away ✗, a1-2 draw ✓ exact, j1-1 home ✓, i1-1 home ✓ exact
    { id:"u4", name:"Matías",    avatar:"MA", points:0, correct:0, exact:0, total:0, picked:0,
      predictions:{ "a1-1":"away", "a1-2":"draw", "j1-1":"home", "i1-1":"home" },
      scorePicks:{ "a1-2":{ home:1, away:1 }, "i1-1":{ home:2, away:1 } } },
    // Valentina: a1-1 home ✓, a1-2 away ✗, j1-1 draw ✗, i1-1 home ✓
    { id:"u5", name:"Valentina", avatar:"VA", points:0, correct:0, exact:0, total:0, picked:0,
      predictions:{ "a1-1":"home", "a1-2":"away", "j1-1":"draw", "i1-1":"home" } },
  ],
};
