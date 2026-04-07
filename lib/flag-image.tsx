// Cross-platform flag rendering via flagcdn.com.
// Flag emojis don't render on Windows; this converts them to <img> tags.

const SUBDIVISION: Record<string, string> = {
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "gb-eng",
  "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "gb-sct",
  "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "gb-wls",
};

function emojiToCode(emoji: string): string {
  if (SUBDIVISION[emoji]) return SUBDIVISION[emoji];
  const pts = [...emoji].map((c) => c.codePointAt(0) ?? 0);
  if (pts.length >= 2 && pts[0] >= 0x1f1e6 && pts[1] >= 0x1f1e6) {
    return String.fromCharCode(pts[0] - 0x1f1e6 + 65, pts[1] - 0x1f1e6 + 65).toLowerCase();
  }
  return "";
}

export default function FlagImage({
  emoji,
  size = 20,
  team,
}: {
  emoji: string;
  size?: number;
  team?: string;
}) {
  const code = emojiToCode(emoji);
  if (!code) return <span style={{ fontSize: size * 0.8 }}>{emoji}</span>;
  // flagcdn.com only serves specific widths; pick the next valid one above display size
  const CDN_WIDTHS = [20, 40, 80, 160, 320];
  const cdnW = CDN_WIDTHS.find((w) => w >= size * 2) ?? 320;
  return (
    <img
      src={`https://flagcdn.com/w${cdnW}/${code}.png`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={team ?? ""}
      style={{ borderRadius: 2, objectFit: "cover", display: "inline-block", flexShrink: 0 }}
    />
  );
}
