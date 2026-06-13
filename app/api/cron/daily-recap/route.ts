import { NextResponse } from "next/server";
import { sendDailyRecap } from "@/lib/daily-recap/send";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // sends one email per member

// Which league gets the recap. Defaults to Quiniela Tikitaka.
const LEAGUE_CODE = process.env.RECAP_LEAGUE_CODE ?? "P4UG3R";

/**
 * Daily recap sender. Scheduled by Vercel Cron (see vercel.json) at 9am ET.
 * Add ?test=1 to send only to the admin inbox (smoke test, doesn't email members).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const test = new URL(request.url).searchParams.get("test") === "1";

  try {
    const result = await sendDailyRecap({
      leagueCode: LEAGUE_CODE,
      mode: test ? "test" : "live",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[daily-recap] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
