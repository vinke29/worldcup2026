"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";


export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [leagueMode, setLeagueMode] = useState<"phase_by_phase" | "entire_tournament">("entire_tournament");
  const [mono, setMono] = useState(false);
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

  function scrollToForm(t: "create" | "join") {
    setTab(t);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Theme tokens
  const t = {
    pageBg:      mono ? "#F5F0E8" : "#0B1E0D",
    navBg:       mono ? "rgba(245,240,232,0.95)" : "rgba(11,30,13,0.35)",
    border:      mono ? "#DDD9D0" : "#2C4832",
    borderInner: mono ? "#E5E1D8" : "#1A2E1F",
    cardBg:      mono ? "#F7F4EE" : "#1A2E1F",
    inputBg:     mono ? "#EDE8E0" : "#0F2411",
    textPrimary: mono ? "#1A1208" : "#F0EDE6",
    textSec:     mono ? "#6B5E4E" : "#7A9B84",
    textMuted:   mono ? "#A09080" : "#4A6B50",
    accent:      mono ? "#1A1208" : "#D7FF5A",
    accentText:  mono ? "#F7F4EE" : "#0B1E0D",
    numColor:    mono ? "#E5E1D8" : "#1A2E1F",
    liveGlow:    "#4ADE80",
  };

  return (
    <main style={{ backgroundColor: t.pageBg, minHeight: "100vh", transition: "background-color 0.3s" }}>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col min-h-screen overflow-hidden">

        {/* Hero background — desktop only */}
        <div className="hidden sm:block absolute inset-0 overflow-hidden">
          {/* Hero visual — right half */}
          <video
            autoPlay muted loop playsInline
            className="absolute"
            style={{
              right: "-18%",
              top: "42%",
              transform: "translateY(-50%)",
              height: "82%",
              width: "auto",
              filter: mono ? "none" : "invert(1) brightness(0.15) sepia(1) hue-rotate(80deg) saturate(3)",
              opacity: mono ? 0.92 : 0.5,
              transition: "filter 0.4s, opacity 0.4s",
            }}
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          {/* Left fade — blends illustration into page bg */}
          <div className="absolute inset-0" style={{
            background: mono
              ? `linear-gradient(to right, ${t.pageBg} 25%, ${t.pageBg}CC 50%, transparent 80%)`
              : `linear-gradient(to right, #0B1E0D 30%, #0B1E0D99 55%, transparent 82%)`,
            transition: "background 0.4s",
          }} />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0" style={{
            height: "40%",
            background: mono
              ? `linear-gradient(to bottom, transparent, ${t.pageBg})`
              : "linear-gradient(to bottom, transparent, #0B1E0D)",
            transition: "background 0.4s",
          }} />
        </div>

        {/* Nav */}
        <nav
          className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-7"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: t.accent, transition: "background-color 0.3s" }}
            >
              <span className="text-xs font-black" style={{ color: t.accentText }}>Q</span>
            </div>
            <span className="font-black text-base tracking-tight" style={{ color: t.textPrimary, transition: "color 0.3s" }}>
              quiniel<span style={{ color: mono ? t.textSec : "#D7FF5A" }}>a</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Mono toggle */}
            <button
              onClick={() => setMono(v => !v)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 border cursor-pointer transition-all duration-200"
              style={{
                borderColor: mono ? "#C8C0B0" : "rgba(44,72,50,0.7)",
                backgroundColor: mono ? "rgba(26,18,8,0.06)" : "rgba(26,46,31,0.4)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="text-sm" style={{ lineHeight: 1 }}>{mono ? "🎨" : "◑"}</span>
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: mono ? "#1A1208" : "#7A9B84" }}>
                {mono ? "Color" : "Ink"}
              </span>
            </button>

            <a
              href="/auth/login"
              className="text-xs font-semibold transition-opacity hover:opacity-60"
              style={{ color: t.textSec }}
            >
              Sign in
            </a>
          </div>
        </nav>

        {/* Mobile video strip — below nav, above text */}
        <div className="sm:hidden relative overflow-hidden flex-shrink-0" style={{ height: "260px", marginTop: "12px" }}>
          <video
            autoPlay muted loop playsInline
            className="absolute"
            style={{
              height: "170%",
              width: "auto",
              top: "50%",
              left: "52%",
              transform: "translate(-50%, -42%)",
              filter: mono ? "none" : "invert(1) brightness(0.15) sepia(1) hue-rotate(80deg) saturate(3)",
              opacity: mono ? 1 : 0.5,
              mixBlendMode: mono ? "multiply" : "normal",
            }}
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0" style={{
            height: "45%",
            background: `linear-gradient(to bottom, transparent, ${t.pageBg})`,
            pointerEvents: "none",
          }} />
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex-1 flex flex-col justify-start sm:justify-end px-6 sm:px-10 pt-4 sm:pt-0 pb-20 max-w-5xl mx-auto w-full">

          <div className="flex items-center gap-2 mb-8">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: t.liveGlow }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: t.textSec, transition: "color 0.3s" }}>
              World Cup 2026 · 104 matches
            </span>
          </div>

          <h1
            className="font-black leading-[0.92] tracking-tight mb-8"
            style={{ fontSize: "clamp(52px, 9vw, 108px)", color: t.textPrimary, transition: "color 0.3s" }}
          >
            Pick every<br />
            <span style={{ color: mono ? t.textPrimary : "#D7FF5A", transition: "color 0.3s", fontStyle: mono ? "italic" : "normal" }}>match.</span><br />
            Prove them<br />
            wrong.
          </h1>

          <p
            className="mb-10 leading-relaxed max-w-sm"
            style={{ fontSize: "clamp(14px, 1.6vw, 17px)", color: t.textSec, transition: "color 0.3s" }}
          >
            A private prediction game for you and your friends.
            Pick every match. See who really knows football.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => scrollToForm("create")}
              className="px-7 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: t.accent, color: t.accentText, transition: "background-color 0.3s, color 0.3s" }}
            >
              Create a league
            </button>
            <button
              onClick={() => scrollToForm("join")}
              className="px-7 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest border transition-all"
              style={{
                borderColor: mono ? "#C8C0B0" : "#2C4832",
                color: t.textSec,
                backgroundColor: mono ? "rgba(232,228,220,0.6)" : "rgba(26,46,31,0.6)",
                backdropFilter: "blur(8px)",
                transition: "all 0.3s",
              }}
            >
              Join with code
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8">
          <div className="flex flex-col items-center gap-1.5 opacity-25">
            <div className="w-px h-10" style={{ backgroundColor: t.textSec }} />
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: t.textSec }}>scroll</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-28" style={{ transition: "all 0.3s" }}>
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
                style={{ fontSize: "72px", color: t.numColor, letterSpacing: "-0.04em", transition: "color 0.3s" }}
              >
                {num}
              </span>
              <h3 className="font-black text-xl tracking-tight" style={{ color: t.textPrimary, transition: "color 0.3s" }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: t.textSec, transition: "color 0.3s" }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10">
        <div className="h-px" style={{ backgroundColor: t.borderInner, transition: "background-color 0.3s" }} />
      </div>

      {/* ── FORM SECTION ───────────────────────────────────────────────── */}
      <section ref={formRef} className="max-w-5xl mx-auto px-6 sm:px-10 py-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-16 items-start">

          {/* Copy */}
          <div className="sm:pt-2">
            <h2
              className="font-black leading-none tracking-tight mb-5"
              style={{ fontSize: "clamp(40px, 5vw, 64px)", color: t.textPrimary, transition: "color 0.3s" }}
            >
              Ready to<br />
              <span style={{ color: mono ? t.textPrimary : "#D7FF5A", transition: "color 0.3s", fontStyle: mono ? "italic" : "normal" }}>play?</span>
            </h2>
            <p className="text-sm leading-relaxed mb-10 max-w-xs" style={{ color: t.textSec, transition: "color 0.3s" }}>
              Create a private league and share your invite code.
              Friends join in seconds.
            </p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ backgroundColor: t.cardBg, borderColor: t.border, transition: "all 0.3s" }}
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
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                >
                  {v === "create" ? "New league" : "Join league"}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "create" ? (
                <form onSubmit={handleCreate} className="space-y-4">
                  <Field label="Your name" mono={mono} inputBg={t.inputBg} border={t.border} textPrimary={t.textPrimary} textMuted={t.textMuted}>
                    <input
                      type="text" value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ignacio" required
                    />
                  </Field>
                  <Field label="League name" mono={mono} inputBg={t.inputBg} border={t.border} textPrimary={t.textPrimary} textMuted={t.textMuted}>
                    <input
                      type="text" value={leagueName}
                      onChange={(e) => setLeagueName(e.target.value)}
                      placeholder="La Banda del Martes" required
                    />
                  </Field>
                  {/* Mode picker */}
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
                              backgroundColor: active ? (mono ? "rgba(26,18,8,0.08)" : "rgba(215,255,90,0.08)") : t.inputBg,
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
                  <Btn mono={mono} accent={t.accent} accentText={t.accentText}>Create league →</Btn>
                </form>
              ) : (
                <form onSubmit={handleJoin} className="space-y-4">
                  <Field label="Your name" mono={mono} inputBg={t.inputBg} border={t.border} textPrimary={t.textPrimary} textMuted={t.textMuted}>
                    <input
                      type="text" value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ignacio" required
                    />
                  </Field>
                  <Field label="Invite code" mono={mono} inputBg={t.inputBg} border={t.border} textPrimary={t.textPrimary} textMuted={t.textMuted} accent={t.accent}>
                    <input
                      type="text" value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="BANDA26" required maxLength={10}
                      className="font-mono tracking-widest"
                    />
                  </Field>
                  <Btn mono={mono} accent={t.accent} accentText={t.accentText}>Join league →</Btn>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer
        className="max-w-5xl mx-auto px-6 sm:px-10 pb-12"
        style={{ borderTop: `1px solid ${t.borderInner}`, paddingTop: "32px", transition: "border-color 0.3s" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <span className="font-black text-sm tracking-tight" style={{ color: t.textMuted }}>
            quiniel<span style={{ color: mono ? t.textMuted : "#D7FF5A" }}>a</span>
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
  label, children, mono, inputBg, border, textPrimary, textMuted, accent,
}: {
  label: string;
  children: React.ReactElement;
  mono: boolean;
  inputBg: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  accent?: string;
}) {
  const focusBorder = accent ?? (mono ? "#1A1208" : "#D7FF5A");
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
          transition: border-color 0.15s, background 0.3s, color 0.3s;
          font-family: inherit;
        }
        .qf-input::placeholder { color: ${textMuted}; }
        .qf-input:focus { border-color: ${focusBorder}; }
      `}</style>
      {/* Clone child and inject className */}
      {(() => {
        const child = children as React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
        return <child.type {...child.props} className={["qf-input", child.props.className ?? ""].join(" ").trim()} />;
      })()}
    </div>
  );
}

function Btn({ children, mono, accent, accentText }: { children: React.ReactNode; mono: boolean; accent: string; accentText: string }) {
  return (
    <button
      type="submit"
      className="w-full mt-2 font-black text-sm uppercase tracking-widest rounded-xl cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
      style={{
        backgroundColor: accent,
        color: accentText,
        padding: "13px 24px",
        border: "none",
        fontFamily: "inherit",
        display: "block",
        textAlign: "center",
        transition: "background-color 0.3s, color 0.3s, opacity 0.15s, transform 0.1s",
      }}
    >
      {children}
    </button>
  );
}
