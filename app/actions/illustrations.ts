"use server";

import { createClient } from "@/lib/supabase/server";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

export interface IllustrationSetting {
  x: number; // 0–100 percentage
  y: number; // 0–100 percentage
  scale: number; // 1.0+
}

export async function saveIllustrationSetting(
  matchId: string,
  x: number,
  y: number,
  scale: number,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== ADMIN_USER_ID) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("illustration_settings").upsert(
    {
      match_id: matchId,
      x_pct: x,
      y_pct: y,
      scale,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "match_id" }
  );

  if (error) throw new Error(error.message);
}

export async function getIllustrationSettings(): Promise<Record<string, IllustrationSetting>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("illustration_settings")
    .select("match_id, x_pct, y_pct, scale");

  if (error || !data) return {};

  const result: Record<string, IllustrationSetting> = {};
  for (const row of data) {
    result[row.match_id] = { x: row.x_pct, y: row.y_pct, scale: row.scale };
  }
  return result;
}
