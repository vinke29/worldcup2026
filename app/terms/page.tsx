import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Quiniela",
  description: "Terms of service for Quiniela — the World Cup 2026 prediction game.",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm mb-12" style={{ color: "#4A6B50" }}>
          Last updated: April 9, 2026
        </p>

        <div className="space-y-10">

          <Section title="Acceptance">
            By creating an account or using quinielatikitaka.com you agree to these terms. If you do not agree, please do not use the service.
          </Section>

          <Section title="The service">
            Quiniela is a free prediction game for the 2026 FIFA World Cup. It is a game of skill and knowledge — no real money, prizes, or gambling of any kind is involved. We are not affiliated with FIFA, any football confederation, or any national football association.
          </Section>

          <Section title="Eligibility">
            You must be at least 13 years old to use Quiniela. By creating an account you confirm that you meet this requirement.
          </Section>

          <Section title="Your account">
            <ul>
              <li>You are responsible for keeping your password secure.</li>
              <li>You may not share your account with others or create accounts on behalf of other people.</li>
              <li>You may not create more than one account per person.</li>
              <li>We reserve the right to suspend or delete accounts that violate these terms.</li>
            </ul>
          </Section>

          <Section title="Acceptable use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for any unlawful purpose.</li>
              <li>Attempt to manipulate, cheat, or exploit the scoring system.</li>
              <li>Harass, impersonate, or harm other users.</li>
              <li>Attempt to gain unauthorized access to any part of the service or its infrastructure.</li>
              <li>Reverse-engineer or scrape the app in a way that disrupts the service.</li>
            </ul>
          </Section>

          <Section title="Predictions and results">
            We aim to keep match results and scores accurate, but we are not responsible for errors or delays in result updates. Points are calculated automatically based on the data we have — if we discover a scoring error we will correct it as soon as possible.
          </Section>

          <Section title="Availability">
            We provide Quiniela on a best-effort basis. We do not guarantee 100% uptime, particularly during high-traffic moments like match kickoffs. We are not liable for any losses caused by downtime or technical issues.
          </Section>

          <Section title="Intellectual property">
            The Quiniela name, logo, and all content on this site are our property. You may not reproduce or use them without written permission.
          </Section>

          <Section title="Limitation of liability">
            Quiniela is provided "as is" without warranties of any kind. To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
          </Section>

          <Section title="Changes to these terms">
            We may update these terms from time to time. We will update the date at the top of this page when we do. Continued use of the service after changes constitutes acceptance of the updated terms.
          </Section>

          <Section title="Contact">
            Questions about these terms? Email us at{" "}
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
        className="font-black uppercase tracking-widest mb-4"
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
