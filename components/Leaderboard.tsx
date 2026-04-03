import type { Member } from "@/lib/mock-data";

interface LeaderboardProps {
  members: Member[];
  currentUserId?: string;
  mono?: boolean;
}

export default function Leaderboard({ members, currentUserId, mono = false }: LeaderboardProps) {
  const sorted = [...members].sort((a, b) => b.points - a.points);

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{
        backgroundColor: mono ? "#F7F4EE" : "#1A2E1F",
        borderColor: mono ? "#DDD9D0" : "#2C4832",
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${mono ? "#E5E1D8" : "#243D29"}` }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: mono ? "#8A7A6A" : "#7A9B84" }}>
          Standings
        </span>
      </div>

      <div>
        {sorted.map((member, i) => {
          const isYou = member.id === currentUserId;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderBottom: i < sorted.length - 1 ? `1px solid ${mono ? "#E8E4DC" : "#1F3A24"}` : "none",
                backgroundColor: isYou
                  ? mono ? "rgba(26,18,8,0.05)" : "rgba(215,255,90,0.05)"
                  : "transparent",
              }}
            >
              <div className="w-5 flex-shrink-0 text-center">
                {medal ? (
                  <span className="text-sm">{medal}</span>
                ) : (
                  <span className="text-xs font-bold" style={{ color: mono ? "#A09080" : "#4A6B50" }}>{i + 1}</span>
                )}
              </div>

              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                style={{
                  backgroundColor: isYou ? (mono ? "#1A1208" : "#D7FF5A") : (mono ? "#E0DAD0" : "#1F3A24"),
                  color: isYou ? (mono ? "#F7F4EE" : "#0B1E0D") : (mono ? "#6B5E4E" : "#7A9B84"),
                }}
              >
                {member.avatar}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className="text-sm font-semibold truncate block"
                  style={{ color: isYou ? (mono ? "#1A1208" : "#D7FF5A") : (mono ? "#1A1208" : "#F0EDE6") }}
                >
                  {member.name}
                  {isYou && (
                    <span
                      className="ml-1.5 text-[9px] font-black uppercase tracking-wider"
                      style={{ color: mono ? "#8A7A6A" : "#D7FF5A" }}
                    >
                      you
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-baseline gap-0.5">
                <span
                  className="text-sm font-black tabular-nums"
                  style={{ color: mono ? "#1A1208" : (isYou ? "#D7FF5A" : "#F0EDE6") }}
                >
                  {member.points}
                </span>
                <span className="text-[10px]" style={{ color: mono ? "#8A7A6A" : "#7A9B84" }}>pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
