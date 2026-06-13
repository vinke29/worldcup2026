import { NextResponse } from "next/server";
import { syncScores } from "@/lib/scores-sync/sync";

// Never cached / statically evaluated — it writes to the DB on each call.
export const dynamic = "force-dynamic";

/**
 * Automatic score sync. Triggered by Vercel Cron (see vercel.json) or any
 * external scheduler that sends `Authorization: Bearer <CRON_SECRET>`.
 *
 * Vercel automatically attaches that header to cron invocations when the
 * CRON_SECRET env var is set, so the same guard protects both paths.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await syncScores({ includeLive: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[sync-scores] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
