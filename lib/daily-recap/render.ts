import type { MemberRecap, RecapData, RecapGame } from "./data";
import type { Quips } from "./quip";

const BG = "#0F2411";
const CARD = "#1A2E1F";
const CARD2 = "#16271A";
const BORDER = "#2C4832";
const TEXT = "#F0EDE6";
const MUTED = "#7A9B84";
const ACCENT = "#D7FF5A";
const GREEN = "#4ADE80";
const RED = "#F87171";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function first(name: string): string { return name.split(" ")[0]; }
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function moveBadge(movement: number): string {
  if (movement > 0) return `<span style="color:${GREEN};font-size:12px">▲${movement}</span>`;
  if (movement < 0) return `<span style="color:${RED};font-size:12px">▼${-movement}</span>`;
  return `<span style="color:${MUTED};font-size:12px">–</span>`;
}

function upcomingRow(g: RecapGame, pickLabel: string | null): string {
  const pick = pickLabel
    ? `your pick: <span style="color:${TEXT};font-weight:600">${esc(pickLabel)}</span>`
    : `<span style="color:${MUTED}">no pick</span>`;
  return `<tr>
      <td class="recap-team" style="padding:8px 0 1px;text-align:right;color:${TEXT};font-size:14px;width:42%">${esc(g.home)}&nbsp;${esc(g.homeFlag)}</td>
      <td style="padding:8px 12px 1px;text-align:center;font-size:14px;white-space:nowrap;color:${MUTED}">${esc(g.time)}</td>
      <td class="recap-team" style="padding:8px 0 1px;text-align:left;color:${TEXT};font-size:14px;width:42%">${esc(g.awayFlag)}&nbsp;${esc(g.away)}</td>
    </tr>
    <tr><td colspan="3" style="padding:0 0 10px;text-align:center;font-size:12px;color:${MUTED}">${pick}</td></tr>`;
}

function section(title: string, inner: string): string {
  return `<p style="margin:26px 0 8px;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${title}</p>${inner}`;
}

function subjectFor(m: MemberRecap, data: RecapData): string {
  const name = first(m.name);
  if (data.results.length === 0) return `${name}, what's on today in ${data.leagueName}`;
  if (m.rankNow === 1) {
    const wasFirst = m.rankBefore === 1;
    return wasFirst ? `👑 ${name}, you're still top of ${data.leagueName}` : `👑 ${name}, you've taken the lead!`;
  }
  const movement = m.rankBefore ? m.rankBefore - m.rankNow : 0;
  if (movement > 0) return `${name}, you climbed to ${ordinal(m.rankNow)} 📈`;
  if (movement < 0) return `${name}, you slipped to ${ordinal(m.rankNow)} 📉`;
  return `${name}, you're holding ${ordinal(m.rankNow)}`;
}

function yesterdayBlock(m: MemberRecap): string {
  if (m.yesterday.length === 0) return "";
  if (!m.hadAnyPick) {
    return `<p style="margin:4px 0 0;color:${MUTED};font-size:14px">You sat this one out — no picks on yesterday's games.</p>`;
  }
  const hits = m.yesterday.filter((y) => y.played && y.correct).length;
  const playedN = m.yesterday.filter((y) => y.played).length;
  const gained = m.pointsGained > 0 ? `+${m.pointsGained} pts` : `${m.pointsGained} pts`;
  const head = `<p style="margin:4px 0 10px;color:${TEXT};font-size:15px"><strong>${hits} for ${playedN}</strong> yesterday · <span style="color:${ACCENT};font-weight:700">${gained}</span></p>`;
  const rows = m.yesterday.map((y) => {
    if (!y.played) {
      return `<div style="margin:5px 0;color:${MUTED};font-size:14px">·&nbsp; ${esc(y.home)} ${esc(y.scoreLabel)} ${esc(y.away)} — no pick</div>`;
    }
    const icon = y.correct ? `<span style="color:${GREEN}">✓</span>` : `<span style="color:${RED}">✗</span>`;
    const note = y.exact ? `<span style="color:${ACCENT}">exact!</span>` : `you said ${esc(y.pickLabel)}`;
    return `<div style="margin:5px 0;color:${TEXT};font-size:14px">${icon}&nbsp; ${esc(y.home)} ${esc(y.scoreLabel)} ${esc(y.away)} &nbsp;<span style="color:${MUTED}">· ${note}</span></div>`;
  }).join("");
  return head + rows;
}

function standingsBlock(m: MemberRecap, data: RecapData): string {
  const top = data.standings.slice(0, 5);
  const inTop = top.some((s) => s.id === m.id);
  const rows = [...top];
  if (!inTop) {
    const me = data.standings.find((s) => s.id === m.id);
    if (me) rows.push(me);
  }
  const html = rows.map((s, idx) => {
    const isMe = s.id === m.id;
    const gap = !inTop && idx === rows.length - 1 ? `<tr><td colspan="3" style="text-align:center;color:${MUTED};font-size:12px;padding:2px 0">⋯</td></tr>` : "";
    const nameCol = isMe ? `<strong style="color:${ACCENT}">${esc(s.name)} (you)</strong>` : `<span style="color:${s.rank === 1 ? ACCENT : TEXT}">${esc(s.name)}${s.rank === 1 ? " &nbsp;👑" : ""}</span>`;
    return `${gap}<tr style="background:${isMe ? CARD2 : "transparent"}">
        <td style="padding:6px 8px;color:${MUTED};font-size:14px;width:34px">${s.rank}.</td>
        <td style="padding:6px 0;font-size:14px;font-weight:${s.rank === 1 || isMe ? 700 : 400}">${nameCol}</td>
        <td style="padding:6px 8px;text-align:right;font-size:13px;white-space:nowrap">${moveBadge(s.movement)} &nbsp;<span style="color:${isMe || s.rank === 1 ? ACCENT : TEXT};font-weight:700">${s.points}</span></td>
      </tr>`;
  }).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${html}</table>`;
}

function standingLine(m: MemberRecap): string {
  if (m.rankNow === 1) return `You're <strong style="color:${ACCENT}">top of the table</strong> 👑`;
  return `You're <strong style="color:${ACCENT}">${ordinal(m.rankNow)}</strong>, ${m.gapToFirst} pt${m.gapToFirst === 1 ? "" : "s"} off the lead.`;
}

export function renderRecapEmail(data: RecapData, m: MemberRecap, quips: Quips, leagueCode: string, unsubscribeUrl: string): { subject: string; html: string } {
  const subject = subjectFor(m, data);
  const link = `https://quinielatikitaka.com/league/${leagueCode}`;

  const callouts = [
    quips.hero ? `<p style="margin:6px 0;color:${TEXT};font-size:14px;line-height:1.5">🔥 <strong style="color:${ACCENT}">Called it.</strong> ${esc(quips.hero)}</p>` : "",
    quips.goat ? `<p style="margin:6px 0;color:${TEXT};font-size:14px;line-height:1.5">😬 <strong style="color:${ACCENT}">Goat of the day.</strong> ${esc(quips.goat)}</p>` : "",
  ].join("");

  const upcoming = data.upcoming.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${data.upcoming.map((g) => upcomingRow(g, m.todayPicks[g.matchId] ?? null)).join("")}</table>`
    : `<p style="color:${MUTED};font-size:14px;margin:4px 0">No games today.</p>`;

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <style>
    @media only screen and (max-width:480px) {
      .recap-outer { padding:12px 6px !important; }
      .recap-card  { padding:18px 16px !important; border-radius:12px !important; }
      .recap-team  { font-size:13px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG}"><tr><td align="center" class="recap-outer" style="padding:24px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" class="recap-card" style="max-width:480px;background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:28px"><tr><td>

      <p style="margin:0;color:${ACCENT};font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase">${esc(data.leagueName)}</p>
      <p style="margin:2px 0 0;color:${MUTED};font-size:13px">${data.recapLabel} recap</p>

      <p style="margin:18px 0 0;color:${TEXT};font-size:17px;font-weight:700">Morning, ${esc(first(m.name))} 👋</p>

      ${data.results.length ? section("Your day", yesterdayBlock(m) + `<p style="margin:12px 0 0;color:${TEXT};font-size:14px">${standingLine(m)}</p>`) : ""}

      ${callouts ? section("Hits &amp; misses", callouts) : ""}

      ${section("The race", standingsBlock(m, data))}

      ${section("Coming up today", upcoming)}

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px"><tr><td align="center">
        <a href="${link}" style="display:inline-block;background:${ACCENT};color:#0B1E0D;font-weight:800;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:10px">Open standings →</a>
      </td></tr></table>

      <p style="margin:28px 0 0;border-top:1px solid ${BORDER};padding-top:16px;color:${MUTED};font-size:11px;line-height:1.6">
        You're getting this as a member of ${esc(data.leagueName)}.<br>
        <a href="${unsubscribeUrl}" style="color:${MUTED};text-decoration:underline">Unsubscribe</a>
      </p>

    </td></tr></table>
  </td></tr></table>
</body></html>`;

  return { subject, html };
}
