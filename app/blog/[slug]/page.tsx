import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { posts, getPost } from "../posts";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} · Quiniela`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      siteName: "Quiniela — World Cup 2026 Prediction Game",
    },
  };
}

export default async function BlogPost(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

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

        {/* Back */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-10 hover:opacity-70 transition-opacity" style={{ color: "#4A6B50" }}>
          ← All posts
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4A6B50" }}>
            {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <span style={{ color: "#2C4832" }}>·</span>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4A6B50" }}>
            {post.readMinutes} min read
          </span>
        </div>

        {/* Title */}
        <h1 className="font-black text-3xl sm:text-4xl leading-tight tracking-tight mb-10" style={{ color: "#F0EDE6" }}>
          {post.title}
        </h1>

        {/* Content */}
        <div
          className="prose-quiniela"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div
          className="mt-16 rounded-2xl border p-8 text-center"
          style={{ backgroundColor: "#1A2E1F", borderColor: "#2C4832" }}
        >
          <p className="font-black text-xl mb-2" style={{ color: "#F0EDE6" }}>
            Ready to play?
          </p>
          <p className="text-sm mb-6" style={{ color: "#7A9B84" }}>
            Start your private World Cup 2026 prediction league in two minutes.
          </p>
          <Link
            href="/"
            className="inline-block font-black text-xs uppercase tracking-widest rounded-xl px-6 py-3 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#D7FF5A", color: "#0B1E0D" }}
          >
            Create a league →
          </Link>
        </div>

        <p className="text-center text-sm mt-10">
          <Link href="/blog" className="font-semibold hover:opacity-80" style={{ color: "#4A6B50" }}>
            ← Back to blog
          </Link>
        </p>

      </div>

      <style>{`
        .prose-quiniela p { color: #B3C9B7; font-size: 15px; line-height: 1.8; margin-bottom: 1.25rem; }
        .prose-quiniela h2 { color: #F0EDE6; font-size: 20px; font-weight: 900; margin-top: 2.5rem; margin-bottom: 1rem; letter-spacing: -0.3px; }
        .prose-quiniela ul { margin-bottom: 1.25rem; padding-left: 1.25rem; }
        .prose-quiniela li { color: #B3C9B7; font-size: 15px; line-height: 1.8; margin-bottom: 0.4rem; list-style-type: disc; }
        .prose-quiniela strong { color: #F0EDE6; font-weight: 800; }
        .prose-quiniela a { color: #D7FF5A; }
      `}</style>
    </main>
  );
}
