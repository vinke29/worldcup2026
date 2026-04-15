import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MATCHES, PHASES } from "@/lib/mock-data";
import { getActualScores } from "@/app/actions/scores";
import { getIllustrationSettings } from "@/app/actions/illustrations";
import { getBonusAnswers } from "@/app/actions/bonuses";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/");
  }

  const [initialScores, initialIllustrationSettings, initialBonusAnswers] = await Promise.all([
    getActualScores(),
    getIllustrationSettings(),
    getBonusAnswers(),
  ]);

  return (
    <AdminClient
      matches={MATCHES}
      phases={PHASES}
      initialScores={initialScores}
      initialIllustrationSettings={initialIllustrationSettings}
      initialBonusAnswers={initialBonusAnswers}
    />
  );
}
