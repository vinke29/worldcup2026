import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HomeClient from "./HomeClient";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: memberships } = await supabase
      .from("league_members")
      .select("leagues(id, name, code)")
      .eq("user_id", user.id);

    const leagues = (memberships ?? [])
      .flatMap((m) => (Array.isArray(m.leagues) ? m.leagues : m.leagues ? [m.leagues] : []))
      .filter((l): l is { id: string; name: string; code: string } => Boolean(l?.id));

    if (leagues.length === 0) redirect("/auth/setup");
    if (leagues.length === 1) redirect(`/league/${leagues[0].code}`);

    return <LeaguePicker leagues={leagues} />;
  }

  return <HomeClient />;
}

function LeaguePicker({
  leagues,
}: {
  leagues: { id: string; name: string; code: string }[];
}) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0B1E0D" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#D7FF5A" }}
          >
            <span className="text-xs font-black" style={{ color: "#0B1E0D" }}>Q</span>
          </div>
          <span className="font-black text-base tracking-tight" style={{ color: "#F0EDE6" }}>
            quiniel<span style={{ color: "#D7FF5A" }}>a</span>
          </span>
        </div>

        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: "#1A2E1F", borderColor: "#2C4832" }}
        >
          <div className="px-6 pt-6 pb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4A6B50" }}>
              My Leagues
            </p>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {leagues.map((league) => (
              <Link
                key={league.id}
                href={`/league/${league.code}`}
                className="flex items-center justify-between px-4 py-4 rounded-xl border transition-colors"
                style={{ backgroundColor: "#0F2411", borderColor: "#2C4832" }}
              >
                <span className="font-bold text-sm" style={{ color: "#F0EDE6" }}>
                  {league.name}
                </span>
                <span
                  className="font-mono text-xs tracking-widest"
                  style={{ color: "#4A6B50" }}
                >
                  {league.code} →
                </span>
              </Link>
            ))}
          </div>
          <div className="border-t px-6 py-4" style={{ borderColor: "#2C4832" }}>
            <Link
              href="/auth/setup"
              className="block text-center text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-60"
              style={{ color: "#7A9B84" }}
            >
              + Create or join another league
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
