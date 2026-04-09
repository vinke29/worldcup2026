import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Quiniela",
  description: "Privacy policy for Quiniela — the World Cup 2026 prediction game.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm mb-12" style={{ color: "#4A6B50" }}>
          Last updated: April 9, 2026
        </p>

        <div className="space-y-10" style={{ color: "#7A9B84" }}>

          <Section title="Who we are">
            Quiniela is a free World Cup 2026 prediction game available at quinielatikitaka.com.
            We are not affiliated with FIFA or any football federation.
          </Section>

          <Section title="What we collect">
            <p>When you create an account we collect:</p>
            <ul>
              <li><strong style={{ color: "#B3C9B7" }}>Name</strong> — displayed to other members of your league.</li>
              <li><strong style={{ color: "#B3C9B7" }}>Email address</strong> — used to log in and to send transactional emails (welcome, notifications).</li>
              <li><strong style={{ color: "#B3C9B7" }}>Password</strong> — stored as a secure hash; we never see the plaintext.</li>
            </ul>
            <p className="mt-3">
              When you use the app we also store your match predictions and league memberships. We do not collect payment information, location data, or any other personal data.
            </p>
          </Section>

          <Section title="How we use your data">
            <ul>
              <li>To run your account and let you play the game.</li>
              <li>To display your name and predictions to the other members of your league.</li>
              <li>To send transactional emails (account confirmation, welcome message). We do not send marketing emails.</li>
            </ul>
          </Section>

          <Section title="Who we share it with">
            <p>We use the following third-party services to operate the app:</p>
            <ul>
              <li><strong style={{ color: "#B3C9B7" }}>Supabase</strong> — database and authentication (supabase.com).</li>
              <li><strong style={{ color: "#B3C9B7" }}>Vercel</strong> — hosting and infrastructure (vercel.com).</li>
              <li><strong style={{ color: "#B3C9B7" }}>Resend</strong> — transactional email delivery (resend.com).</li>
            </ul>
            <p className="mt-3">
              We do not sell, rent, or share your personal data with any other third parties.
            </p>
          </Section>

          <Section title="Data retention">
            We keep your data for as long as your account is active. You can request deletion at any time by emailing hello@quinielatikitaka.com. We will delete your account and associated data within 30 days.
          </Section>

          <Section title="Cookies">
            We use a single session cookie to keep you logged in. No tracking or advertising cookies are used.
          </Section>

          <Section title="Your rights">
            You have the right to access, correct, or delete your personal data at any time. Contact us at hello@quinielatikitaka.com and we will respond within 30 days.
          </Section>

          <Section title="Changes to this policy">
            If we make material changes we will update the date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated policy.
          </Section>

          <Section title="Contact">
            Questions about this policy? Email us at{" "}
            <a href="mailto:hello@quinielatikitaka.com" style={{ color: "#D7FF5A" }}>
              hello@quinielatikitaka.com
            </a>
            {" "}or use the{" "}
            <Link href="/contact" style={{ color: "#D7FF5A" }}>contact form</Link>.
          </Section>

        </div>

        <p className="text-center text-sm mt-16" style={{ color: "#4A6B50" }}>
          <Link href="/" className="font-semibold hover:opacity-80" style={{ color: "#4A6B50" }}>
            ← Back to home
          </Link>
        </p>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        className="font-black text-base uppercase tracking-widest mb-4"
        style={{ color: "#F0EDE6", fontSize: "11px", letterSpacing: "0.12em" }}
      >
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: "#7A9B84" }}>
        {children}
      </div>
    </div>
  );
}
