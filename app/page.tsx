"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Design tokens — light/cream, lime as the only color ──────────────────────
const t = {
  pageBg:      "#F5F0E8",
  border:      "#DDD9D0",
  borderInner: "#E5E1D8",
  cardBg:      "#EDE8E0",
  inputBg:     "#E8E3DB",
  textPrimary: "#111111",
  textSec:     "#888880",
  textMuted:   "#AAAAAA",
  accent:      "#D7FF5A",
  accentText:  "#111111",
  liveGlow:    "#111111",
};

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [leagueMode, setLeagueMode] = useState<"phase_by_phase" | "entire_tournament">("entire_tournament");
  const formRef = useRef<HTMLDivElement>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (name.trim()) params.set("name", name.trim());
    if (leagueName.trim()) params.set("leagueName", leagueName.trim());
    params.set("mode", leagueMode);
    router.push(`/auth/signup?${params}`);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const params = new URLSearchParams();
    if (name.trim()) params.set("name", name.trim());
    params.set("intent", "join");
    params.set("code", joinCode.trim().toUpperCase());
    router.push(`/auth/signup?${params}`);
  }

  function scrollToForm(v: "create" | "join") {
    setTab(v);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main style={{ backgroundColor: t.pageBg, minHeight: "100vh" }}>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col min-h-screen overflow-hidden">

        {/* Video background — desktop */}
        <div className="hidden sm:block absolute inset-0 overflow-hidden">
          <video
            autoPlay muted playsInline preload="auto"
            className="absolute"
            style={{
              left: "32%",
              top: "50%",
              transform: "translateY(-50%)",
              height: "110%",
              width: "auto",
              filter: "grayscale(1) contrast(1.1) brightness(1.05)",
              mixBlendMode: "multiply",
              opacity: 0.9,
            }}
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          {/* Left fade */}
          <div className="absolute inset-0" style={{
            background: `linear-gradient(to right, ${t.pageBg} 25%, ${t.pageBg}DD 45%, ${t.pageBg}44 70%, transparent 90%)`,
          }} />
          {/* Right fade */}
          <div className="absolute inset-0" style={{
            background: `linear-gradient(to left, ${t.pageBg} 0%, transparent 18%)`,
          }} />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0" style={{
            height: "30%",
            background: `linear-gradient(to bottom, transparent, ${t.pageBg})`,
          }} />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-7">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: t.accent }}
            >
              <span className="text-xs font-black" style={{ color: t.accentText }}>Q</span>
            </div>
            <span className="font-black text-base tracking-tight" style={{ color: t.textPrimary }}>
              quiniel<span style={{ color: t.accent }}>a</span>
            </span>
          </div>
          <a
            href="/auth/login"
            className="text-xs font-semibold transition-opacity hover:opacity-100"
            style={{ color: t.textSec, opacity: 0.8 }}
          >
            Sign in
          </a>
        </nav>

        {/* Mobile video strip */}
        <div className="sm:hidden relative overflow-hidden flex-shrink-0" style={{ height: "280px", marginTop: "12px" }}>
          <video
            autoPlay muted playsInline preload="auto"
            className="absolute"
            style={{
              height: "160%",
              width: "auto",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -42%)",
              filter: "grayscale(1) contrast(1.1) brightness(1.05)",
              mixBlendMode: "multiply",
              opacity: 0.9,
            }}
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-x-0 bottom-0" style={{
            height: "50%",
            background: `linear-gradient(to bottom, transparent, ${t.pageBg})`,
          }} />
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex-1 flex flex-col justify-start sm:justify-end px-6 sm:px-10 pt-4 sm:pt-0 pb-20 max-w-5xl mx-auto w-full">

          <div className="flex items-center gap-2 mb-8">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.textPrimary }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: t.textSec }}>
              World Cup 2026 · 104 matches
            </span>
          </div>

          <h1
            className="font-black leading-[0.92] tracking-tight mb-10"
            style={{ fontSize: "clamp(52px, 9vw, 108px)", color: t.textPrimary }}
          >
            Pick every<br />
            game.<br />
            <span style={{ color: t.accent }}>Beat your</span><br />
            <span style={{ color: t.accent }}>friends.</span>
          </h1>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => scrollToForm("create")}
              className="px-7 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: t.accent, color: t.accentText }}
            >
              Create a league
            </button>
            <button
              onClick={() => scrollToForm("join")}
              className="px-7 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest border transition-all hover:border-white/30"
              style={{
                borderColor: t.border,
                color: t.textSec,
                backgroundColor: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(8px)",
              }}
            >
              Join with code
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8">
          <div className="flex flex-col items-center gap-1.5 opacity-20">
            <div className="w-px h-10" style={{ backgroundColor: t.textSec }} />
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: t.textSec }}>scroll</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-28">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-16 sm:gap-10">
          {[
            {
              num: "01",
              title: "Predict every match",
              body: "Fill in results for all 104 matches — group stage through the final. Every match, before the tournament begins.",
            },
            {
              num: "02",
              title: "Watch the table move",
              body: "Points land the moment final whistles blow. Your leaderboard updates live as the tournament unfolds.",
            },
            {
              num: "03",
              title: "One champion",
              body: "Exact scores earn bonus points. The sharpest predictor across the entire tournament wins.",
            },
          ].map(({ num, title, body }) => (
            <div key={num} className="space-y-5">
              <span
                className="block font-black leading-none tabular-nums"
                style={{ fontSize: "72px", color: t.borderInner, letterSpacing: "-0.04em" }}
              >
                {num}
              </span>
              <h3 className="font-black text-xl tracking-tight" style={{ color: t.textPrimary }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: t.textSec }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10">
        <div className="h-px" style={{ backgroundColor: t.borderInner }} />
      </div>

      {/* ── FORM SECTION ───────────────────────────────────────────────── */}
      <section ref={formRef} className="max-w-5xl mx-auto px-6 sm:px-10 py-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-16 items-start">

          <div className="sm:pt-2">
            <h2
              className="font-black leading-none tracking-tight mb-5"
              style={{ fontSize: "clamp(40px, 5vw, 64px)", color: t.textPrimary }}
            >
              Ready to<br />
              <span style={{ color: t.accent }}>play?</span>
            </h2>
            <p className="text-sm leading-relaxed mb-10 max-w-xs" style={{ color: t.textSec }}>
              Create a private league and share your invite code.
              Friends join in seconds.
            </p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ backgroundColor: t.cardBg, borderColor: t.border }}
          >
            <div className="flex border-b" style={{ borderColor: t.border }}>
              {(["create", "join"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  className="flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer border-b-2"
                  style={{
                    color: tab === v ? t.accent : t.textSec,
                    borderBottomColor: tab === v ? t.accent : "transparent",
                  }}
                >
                  {v === "create" ? "New league" : "Join league"}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "create" ? (
                <form onSubmit={handleCreate} className="space-y-4">
                  <Field label="Your name" inputBg={t.inputBg} border={t.border} textPrimary={t.textPrimary} textMuted={t.textMuted}>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ignacio" required />
                  </Field>
                  <Field label="League name" inputBg={t.inputBg} border={t.border} textPrimary={t.textPrimary} textMuted={t.textMuted}>
                    <input type="text" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} placeholder="La Banda del Martes" required />
                  </Field>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: "phase_by_phase", label: "Phase by phase", sub: "Unlock each round after the last ends" },
                        { value: "entire_tournament", label: "Full bracket", sub: "Pick every round before it starts" },
                      ] as const).map(({ value, label, sub }) => {
                        const active = leagueMode === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setLeagueMode(value)}
                            className="text-left px-3 py-3 rounded-xl border transition-all cursor-pointer"
                            style={{
                              backgroundColor: active ? "rgba(215,255,90,0.06)" : t.inputBg,
                              borderColor: active ? t.accent : t.border,
                            }}
                          >
                            <p className="text-xs font-black mb-0.5" style={{ color: active ? t.accent : t.textPrimary }}>{label}</p>
                            <p className="text-[10px] leading-snug" style={{ color: t.textMuted }}>{sub}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Btn>Create league →</Btn>
                </form>
              ) : (
                <form onSubmit={handleJoin} className="space-y-4">
                  <Field label="Your name" inputBg={t.inputBg} border={t.border} textPrimary={t.textPrimary} textMuted={t.textMuted}>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ignacio" required />
                  </Field>
                  <Field label="Invite code" inputBg={t.inputBg} border={t.border} textPrimary={t.textPrimary} textMuted={t.textMuted} accent={t.accent}>
                    <input
                      type="text" value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="BANDA26" required maxLength={10}
                      className="font-mono tracking-widest"
                    />
                  </Field>
                  <Btn>Join league →</Btn>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer
        className="max-w-5xl mx-auto px-6 sm:px-10 pb-12"
        style={{ borderTop: `1px solid ${t.borderInner}`, paddingTop: "32px" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <span className="font-black text-sm tracking-tight" style={{ color: t.textMuted }}>
            quiniel<span style={{ color: t.accent }}>a</span>
            <span className="font-normal ml-2" style={{ color: t.textMuted, opacity: 0.5 }}>· World Cup 2026</span>
          </span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { label: "FAQ",     href: "/faq" },
              { label: "Blog",    href: "/blog" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms",   href: "/terms" },
              { label: "Contact", href: "/contact" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="text-xs font-semibold transition-opacity hover:opacity-100"
                style={{ color: t.textMuted, opacity: 0.7 }}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({
  label, children, inputBg, border, textPrimary, textMuted, accent,
}: {
  label: string;
  children: React.ReactElement;
  inputBg: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  accent?: string;
}) {
  const focusBorder = accent ?? "#D7FF5A";
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: textMuted }}>
        {label}
      </label>
      <style>{`
        .qf-input {
          width: 100%;
          background: ${inputBg};
          border: 1px solid ${border};
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: ${textPrimary};
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
        }
        .qf-input::placeholder { color: ${textMuted}; }
        .qf-input:focus { border-color: ${focusBorder}; }
      `}</style>
      {(() => {
        const child = children as React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
        return <child.type {...child.props} className={["qf-input", child.props.className ?? ""].join(" ").trim()} />;
      })()}
    </div>
  );
}

function Btn({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full mt-2 font-black text-sm uppercase tracking-widest rounded-xl cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
      style={{
        backgroundColor: "#D7FF5A",
        color: "#080808",
        padding: "13px 24px",
        border: "none",
        fontFamily: "inherit",
        display: "block",
        textAlign: "center",
      }}
    >
      {children}
    </button>
  );
}
