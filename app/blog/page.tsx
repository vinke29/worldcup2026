import Link from "next/link";
import type { Metadata } from "next";
import { posts } from "./posts";

export const metadata: Metadata = {
  title: "Blog · Quiniela — World Cup 2026 Prediction Game",
  description: "Tips, guides, and previews to help you win your World Cup 2026 quiniela. Everything from how to set up your prediction league to group stage analysis.",
};

export default function BlogPage() {
  return (
    <main className="min-h-screen px-4 py-16" style={{ backgroundColor: "#0B1E0D" }}>
      <div className="max-w-2xl mx-auto">

        <Link href="/" className="flex items-center gap-2 mb-14 justify-center">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#D7FF5A" }}>
            <span className="text-xs font-black" style={{ color: "#0B1E0D" }}>Q</span>
          </div>
          <span className="font-black text-base tracking-tight" style={{ color: "#F0EDE6" }}>
            quiniel<span style={{ color: "#D7FF5A" }}>a</span>
          </span>
        </Link>

        <h1 className="font-black text-4xl tracking-tight mb-2" style={{ color: "#F0EDE6" }}>
          Blog
        </h1>
        <p className="text-sm mb-12" style={{ color: "#7A9B84" }}>
          Guides, previews, and tips for your World Cup 2026 quiniela.
        </p>

        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border p-6 transition-all hover:border-[#4A6B50]"
              style={{ backgroundColor: "#1A2E1F", borderColor: "#2C4832" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4A6B50" }}>
                  {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
                <span style={{ color: "#2C4832" }}>·</span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4A6B50" }}>
                  {post.readMinutes} min read
                </span>
              </div>
              <h2 className="font-black text-lg leading-snug mb-2" style={{ color: "#F0EDE6" }}>
                {post.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "#7A9B84" }}>
                {post.description}
              </p>
              <span className="inline-block mt-4 text-xs font-black uppercase tracking-widest" style={{ color: "#D7FF5A" }}>
                Read →
              </span>
            </Link>
          ))}
        </div>

        <p className="text-center text-sm mt-10">
          <Link href="/" className="font-semibold hover:opacity-80" style={{ color: "#4A6B50" }}>
            ← Back to home
          </Link>
        </p>

      </div>
    </main>
  );
}
