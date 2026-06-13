import { NextResponse } from "next/server";
import { verifyUnsub } from "@/lib/daily-recap/unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function optOut(u: string | null, t: string | null): Promise<boolean> {
  if (!u || !verifyUnsub(u, t)) return false;
  const supabase = createAdminClient();
  const { error } = await supabase.from("recap_optouts").upsert({ user_id: u }, { onConflict: "user_id" });
  return !error;
}

function page(ok: boolean): Response {
  const title = ok ? "You're unsubscribed" : "Invalid link";
  const body = ok
    ? "You won't get any more daily recap emails."
    : "This unsubscribe link is invalid or expired.";
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
      `<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0F2411;color:#F0EDE6;min-height:100vh;display:flex;align-items:center;justify-content:center">` +
      `<div style="text-align:center;max-width:360px;padding:24px">` +
      `<h2 style="color:#D7FF5A;margin:0 0 8px">${title}</h2>` +
      `<p style="color:#7A9B84;line-height:1.5">${body}</p>` +
      `</div></body></html>`,
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

// Human click from the email footer.
export async function GET(req: Request) {
  const url = new URL(req.url);
  return page(await optOut(url.searchParams.get("u"), url.searchParams.get("t")));
}

// Gmail / Apple Mail one-click unsubscribe (List-Unsubscribe-Post).
export async function POST(req: Request) {
  const url = new URL(req.url);
  const ok = await optOut(url.searchParams.get("u"), url.searchParams.get("t"));
  return new NextResponse(null, { status: ok ? 200 : 400 });
}
