# Automatic score sync

Pulls live + final World Cup results from an external API and upserts them into
`match_scores` (the same table the admin page writes to). Everything downstream
— standings, pick-lock, bonuses — already keys off that table, so no game logic
changes are needed.

## Pipeline
```
Vercel Cron ─▶ GET /api/cron/sync-scores ─▶ syncScores()
                                              ├─ provider.fetchFixtures()   (provider.ts)
                                              ├─ buildMatchIndex(actual)    (map-fixtures.ts)
                                              ├─ mapFixture() per fixture   (orientation-correct)
                                              └─ upsert match_scores        (admin.ts, service role)
```

- **Group games** map by team pair + date.
- **Knockout games** map by the team pair the bracket currently resolves into
  each slot (so the previous round must be scored first; it converges across runs).
- Provider home/away orientation is normalised to ours, including penalty winner.

## Activating it (currently a safe no-op)
Until these are set, the cron runs but does nothing (mock provider, early return).

1. Sign up for a scores API. Default impl targets **API-Football** (api-sports.io),
   World Cup 2026 = `league=1&season=2026`. Set `FOOTBALL_API_KEY`.
2. Add `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → Project Settings → API).
3. Add `CRON_SECRET` (any random string) — Vercel auto-sends it as
   `Authorization: Bearer <CRON_SECRET>` on cron calls; the route rejects others.
4. Deploy. Watch the function logs for `[sync-scores] … unmatched fixtures` and
   add any missing names to `ALIAS` in `team-aliases.ts`.

## Cadence / live updates
`vercel.json` requests every 15 min. True second-by-second live needs a tighter
cadence than some Vercel plans allow for crons — if so, point an external
scheduler (cron-job.org, GitHub Actions) at the same protected URL at whatever
interval you want; it works on any plan.

To switch provider (e.g. football-data.org), implement another `ScoresProvider`
in `provider.ts` and return it from `getProvider()`. Nothing else changes.
