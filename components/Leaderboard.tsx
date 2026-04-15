import type { Member } from "@/lib/mock-data";

interface LeaderboardProps {
  members: Member[];
  currentUserId?: string;
  mono?: boolean;
  variant?: "compact" | "full";
  onSelectMember?: (member: Member) => void;
}

export default function Leaderboard({ members, currentUserId, mono = false, variant = "compact", onSelectMember }: LeaderboardProps) {
  const sorted = [...members].sort((a, b) => b.points - a.points);

  const t = mono
    ? { card: "#F7F4EE", border: "#DDD9D0", borderInner: "#E8E4DC", text: "#1A1208", textSec: "#6B5E4E", textMuted: "#A09080", accent: "#1A1208", accentBg: "rgba(26,18,8,0.05)", youBg: "rgba(26,18,8,0.05)", avatar: "#E0DAD0", avatarText: "#6B5E4E" }
    : { card: "#1A2E1F", border: "#2C4832", borderInner: "#1F3A24", text: "#F0EDE6", textSec: "#7A9B84", textMuted: "#4A6B50", accent: "#D7FF5A", accentBg: "rgba(215,255,90,0.05)", youBg: "rgba(215,255,90,0.05)", avatar: "#1F3A24", avatarText: "#7A9B84" };

  if (variant === "full") {
    return (
      <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: t.card, borderColor: t.border }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${t.borderInner}` }}>
          <div className="w-5 flex-shrink-0" />
          <div className="w-8 flex-shrink-0" />
          <span className="flex-1 text-[10px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>Player</span>
          <span className="w-14 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>Pts</span>
          <span className="w-14 text-right text-[10px] font-black uppercase tracking-widest hidden sm:block" style={{ color: t.textMuted }}>Group</span>
          <span className="w-10 text-right text-[10px] font-black uppercase tracking-widest hidden sm:block" style={{ color: t.textMuted }}>KO</span>
          <span className="w-14 text-right text-[10px] font-black uppercase tracking-widest hidden sm:block" style={{ color: t.textMuted }}>Bonus</span>
          <div className="w-4 flex-shrink-0" />
        </div>

        {sorted.map((member, i) => {
          const isYou = member.id === currentUserId;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

          const clickable = !!onSelectMember;

          return (
            <div
              key={member.id}
              onClick={clickable ? () => onSelectMember(member) : undefined}
              className="flex items-center gap-3 px-5 py-3.5 transition-colors"
              style={{
                borderBottom: i < sorted.length - 1 ? `1px solid ${t.borderInner}` : "none",
                backgroundColor: isYou ? t.youBg : "transparent",
                cursor: clickable ? "pointer" : "default",
              }}
            >
              {/* Rank */}
              <div className="w-5 flex-shrink-0 text-center">
                {medal
                  ? <span className="text-base">{medal}</span>
                  : <span className="text-xs font-bold" style={{ color: t.textMuted }}>{i + 1}</span>}
              </div>

              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                style={{
                  backgroundColor: isYou ? t.accent : t.avatar,
                  color: isYou ? (mono ? "#F7F4EE" : "#0B1E0D") : t.avatarText,
                }}
              >
                {member.avatar}
              </div>

              {/* Name + mobile breakdown */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold truncate block" style={{ color: isYou ? t.accent : t.text }}>
                  {member.name}
                  {isYou && (
                    <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: mono ? t.textSec : t.accent }}>you</span>
                  )}
                </span>
                {(member.koPts > 0 || member.bonusPts > 0) && (
                  <span className="text-[10px] sm:hidden" style={{ color: t.textMuted }}>
                    {[
                      member.groupPts > 0 && `Group ${member.groupPts}`,
                      member.koPts > 0    && `KO ${member.koPts}`,
                      member.bonusPts > 0 && `Bonus ${member.bonusPts}`,
                    ].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>

              {/* Pts */}
              <div className="w-14 text-right">
                <span className="text-base font-black tabular-nums" style={{ color: isYou ? t.accent : t.text }}>{member.points}</span>
                <span className="text-[10px] ml-0.5" style={{ color: t.textMuted }}>pts</span>
              </div>

              {/* Group pts */}
              <div className="w-14 text-right hidden sm:block">
                <span className="text-sm font-bold tabular-nums" style={{ color: member.groupPts > 0 ? (mono ? "#1A1208" : "#4ADE80") : t.textMuted }}>
                  {member.groupPts}
                </span>
                <span className="text-[10px] ml-0.5" style={{ color: t.textMuted }}>pts</span>
              </div>

              {/* KO pts */}
              <div className="w-10 text-right hidden sm:block">
                <span className="text-sm font-bold tabular-nums" style={{ color: member.koPts > 0 ? (mono ? "#1A1208" : "#D7FF5A") : t.textMuted }}>
                  {member.koPts}
                </span>
                <span className="text-[10px] ml-0.5" style={{ color: t.textMuted }}>pts</span>
              </div>

              {/* Bonus pts */}
              <div className="w-14 text-right hidden sm:block">
                <span className="text-sm font-bold tabular-nums" style={{ color: member.bonusPts > 0 ? (mono ? "#1A1208" : "#D7FF5A") : t.textMuted }}>
                  {member.bonusPts}
                </span>
                <span className="text-[10px] ml-0.5" style={{ color: t.textMuted }}>pts</span>
              </div>

              <div className="w-4 flex-shrink-0 text-center">
                {clickable && <span className="text-xs" style={{ color: t.textMuted }}>›</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Compact variant (original sidebar style) ──────────────────────────────────
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: t.card, borderColor: t.border }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${t.borderInner}` }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textSec }}>Standings</span>
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
                borderBottom: i < sorted.length - 1 ? `1px solid ${t.borderInner}` : "none",
                backgroundColor: isYou ? t.youBg : "transparent",
              }}
            >
              <div className="w-5 flex-shrink-0 text-center">
                {medal
                  ? <span className="text-sm">{medal}</span>
                  : <span className="text-xs font-bold" style={{ color: t.textMuted }}>{i + 1}</span>}
              </div>

              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                style={{ backgroundColor: isYou ? t.accent : t.avatar, color: isYou ? (mono ? "#F7F4EE" : "#0B1E0D") : t.avatarText }}
              >
                {member.avatar}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold truncate block" style={{ color: isYou ? t.accent : t.text }}>
                  {member.name}
                  {isYou && <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: t.accent }}>you</span>}
                </span>
              </div>

              <div className="flex items-baseline gap-0.5">
                <span className="text-sm font-black tabular-nums" style={{ color: isYou ? t.accent : t.text }}>{member.points}</span>
                <span className="text-[10px]" style={{ color: t.textMuted }}>pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
