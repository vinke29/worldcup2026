import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ · Quiniela",
  description: "Frequently asked questions about Quiniela — the World Cup 2026 prediction game.",
};

const faqs = [
  {
    q: "What is Quiniela?",
    a: "Quiniela is a private prediction game for the 2026 FIFA World Cup. You and your friends each predict the result of every match — all 104 of them — and earn points as the tournament unfolds. The best predictor at the end wins.",
  },
  {
    q: "How do I start?",
    a: "Create an account, then either start a new league or join one with an invite code. Share your 6-character code with friends and you're ready to play.",
  },
  {
    q: "When do predictions lock?",
    a: "Predictions for each match lock one hour before kickoff. After that, no changes are allowed — so plan ahead.",
  },
  {
    q: "Can I change a prediction after submitting?",
    a: "Yes, as long as the match hasn't locked yet (more than one hour before kickoff). Once the lock kicks in, your pick is final.",
  },
  {
    q: "How is scoring calculated?",
    a: "Points scale with the stakes of the match. In the group stage, a correct outcome (win/draw/loss) earns 1 point; the exact score earns 3. In the knockout rounds the points increase: Round of 32 (2 / 5), Round of 16 (3 / 7), Quarter-finals (5 / 10), Semi-finals (7 / 12), Third-place play-off (7 / 12), Final (10 / 15).",
  },
  {
    q: "What are the two league formats?",
    a: "Full bracket: everyone fills in all 104 matches before the tournament starts. Phase by phase: each knockout round unlocks only after the previous one ends, so you predict as you go.",
  },
  {
    q: "How many people can join a league?",
    a: "There's no hard cap. Leagues work best with 5–20 people, but you can share your code with as many friends as you like.",
  },
  {
    q: "What happens if a match is cancelled or replayed?",
    a: "We'll handle exceptional situations manually and communicate any changes through the app. Predictions for affected matches will be voided if necessary.",
  },
  {
    q: "Is there a mobile app?",
    a: "Not yet — but the website is fully optimized for mobile. Add it to your home screen from your browser for the best experience.",
  },
  {
    q: "Is Quiniela free?",
    a: "Yes, completely free. No ads, no in-app purchases.",
  },
  {
    q: "How do I contact you?",
    a: "Use the contact form at quinielatikitaka.com/contact or email us directly at hello@quinielatikitaka.com.",
  },
];

export default function FAQPage() {
  return (
    <main
      className="min-h-screen px-4 py-16"
      style={{ backgroundColor: "#0B1E0D" }}
    >
      <div className="max-w-2xl mx-auto">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-14 justify-center">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#D7FF5A" }}
          >
            <span className="text-xs font-black" style={{ color: "#0B1E0D" }}>Q</span>
          </div>
          <span className="font-black text-base tracking-tight" style={{ color: "#F0EDE6" }}>
            quiniel<span style={{ color: "#D7FF5A" }}>a</span>
          </span>
        </Link>

        <h1
          className="font-black text-4xl tracking-tight mb-2"
          style={{ color: "#F0EDE6" }}
        >
          FAQ
        </h1>
        <p className="text-sm mb-12" style={{ color: "#7A9B84" }}>
          Frequently asked questions about the game.
        </p>

        <div className="space-y-3">
          {faqs.map(({ q, a }) => (
            <div
              key={q}
              className="rounded-2xl border p-6"
              style={{ backgroundColor: "#1A2E1F", borderColor: "#2C4832" }}
            >
              <h2 className="font-black text-base mb-2" style={{ color: "#F0EDE6" }}>
                {q}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "#7A9B84" }}>
                {a}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm mb-4" style={{ color: "#4A6B50" }}>
            Didn't find your answer?
          </p>
          <Link
            href="/contact"
            className="inline-block font-black text-xs uppercase tracking-widest rounded-xl px-6 py-3 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#D7FF5A", color: "#0B1E0D" }}
          >
            Contact us →
          </Link>
        </div>

        <p className="text-center text-sm mt-10" style={{ color: "#4A6B50" }}>
          <Link href="/" className="font-semibold hover:opacity-80" style={{ color: "#4A6B50" }}>
            ← Back to home
          </Link>
        </p>

      </div>
    </main>
  );
}
