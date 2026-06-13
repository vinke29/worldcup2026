import { Resend } from "resend";
import { getRecapData, type MemberRecap, type RecapData } from "./data";
import { generateQuips, type Quips } from "./quip";
import { renderRecapEmail } from "./render";
import { unsubscribeUrl } from "./unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";

export type RecapMode = "preview" | "test" | "live";

const FROM = "Quiniela <noreply@quinielatikitaka.com>";

/** Build league data + the (league-wide) quips once. */
export async function buildLeagueRecap(leagueCode: string, asOf?: Date): Promise<{ data: RecapData; quips: Quips } | null> {
  const data = await getRecapData(leagueCode, asOf);
  if (!data) return null;
  const quips = await generateQuips(data.worstPicks, data.bestCalls);
  return { data, quips };
}

/** id -> email for every member of a league, via the auth admin API. */
async function memberEmails(leagueCode: string): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const { data: league } = await supabase.from("leagues").select("id").eq("code", leagueCode).maybeSingle();
  const out = new Map<string, string>();
  if (!league) return out;
  const { data: rows } = await supabase.from("league_members").select("user_id").eq("league_id", league.id);
  const ids = new Set((rows ?? []).map((r) => r.user_id));
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) if (ids.has(u.id) && u.email) out.set(u.id, u.email);
    if (data.users.length < 200) break;
  }
  return out;
}

/** Members who've opted out of the recap. Resilient if the table doesn't exist yet. */
async function optedOut(): Promise<Set<string>> {
  try {
    const { data } = await createAdminClient().from("recap_optouts").select("user_id");
    return new Set((data ?? []).map((r) => r.user_id));
  } catch {
    return new Set();
  }
}

function unsubHeaders(userId: string) {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(userId)}>, <mailto:hello@quinielatikitaka.com?subject=Unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export interface SendResult {
  ok: boolean;
  mode: RecapMode;
  subject?: string;
  html?: string;
  recipients?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

/**
 * preview → render one member's email and return it (no send).
 * test    → send one member's email to a single address (defaults to you).
 * live    → render + send each member their own personalized email.
 */
export async function sendDailyRecap(opts: {
  leagueCode: string;
  mode: RecapMode;
  asOf?: Date;
  testTo?: string;
  asMember?: string; // name substring to render as, for preview/test
}): Promise<SendResult> {
  const built = await buildLeagueRecap(opts.leagueCode, opts.asOf);
  if (!built) return { ok: false, mode: opts.mode, error: "league not found" };
  const { data, quips } = built;

  const pickMember = (): MemberRecap | undefined => {
    if (opts.asMember) {
      const q = opts.asMember.toLowerCase();
      return data.members.find((m) => m.name.toLowerCase().includes(q)) ?? data.members[0];
    }
    return data.members[0];
  };

  if (opts.mode === "preview") {
    const m = pickMember();
    if (!m) return { ok: false, mode: "preview", error: "no members" };
    const { subject, html } = renderRecapEmail(data, m, quips, opts.leagueCode, unsubscribeUrl(m.id));
    return { ok: true, mode: "preview", subject, html };
  }

  if (!data.hasContent) return { ok: true, mode: opts.mode, skipped: true, reason: "no games" };

  const resend = new Resend(process.env.RESEND_API_KEY);

  if (opts.mode === "test") {
    const m = pickMember();
    if (!m) return { ok: false, mode: "test", error: "no members" };
    const { subject, html } = renderRecapEmail(data, m, quips, opts.leagueCode, unsubscribeUrl(m.id));
    const to = opts.testTo ?? "ignaciovinke@gmail.com";
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, headers: unsubHeaders(m.id) });
    return error ? { ok: false, mode: "test", error: String(error) } : { ok: true, mode: "test", subject, recipients: 1 };
  }

  // live — each member gets their own personalized email; skip opt-outs.
  const [emails, opted] = await Promise.all([memberEmails(opts.leagueCode), optedOut()]);
  let sent = 0;
  for (const m of data.members) {
    if (opted.has(m.id)) continue;
    const to = emails.get(m.id);
    if (!to) continue;
    const { subject, html } = renderRecapEmail(data, m, quips, opts.leagueCode, unsubscribeUrl(m.id));
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, headers: unsubHeaders(m.id) });
    if (!error) sent++;
  }
  return { ok: true, mode: "live", recipients: sent };
}
