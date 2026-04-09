"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sendContactMessage } from "@/app/actions/contact";

export default function ContactPage() {
  const [state, action, pending] = useActionState(sendContactMessage, null);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ backgroundColor: "#0B1E0D" }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-10 justify-center">
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

        {state?.ok ? (
          /* Success state */
          <div
            className="rounded-2xl border p-8 text-center"
            style={{ backgroundColor: "#1A2E1F", borderColor: "#2C4832" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: "rgba(215,255,90,0.1)", border: "1px solid rgba(215,255,90,0.2)" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4 4 8-8" stroke="#D7FF5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-black text-xl tracking-tight mb-2" style={{ color: "#F0EDE6" }}>
              Message sent
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "#7A9B84" }}>
              We'll get back to you soon.
            </p>
          </div>
        ) : (
          /* Form */
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: "#1A2E1F", borderColor: "#2C4832" }}
          >
            <h1 className="font-black text-xl tracking-tight mb-1" style={{ color: "#F0EDE6" }}>
              Contact us
            </h1>
            <p className="text-sm mb-6" style={{ color: "#7A9B84" }}>
              Questions, feedback, or anything else.
            </p>

            {state?.ok === false && (
              <div
                className="mb-4 px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.25)",
                  color: "#F87171",
                }}
              >
                {state.error}
              </div>
            )}

            <form action={action} className="space-y-4">
              <ContactField label="Name">
                <input type="text" name="name" placeholder="Ignacio" required autoComplete="name" />
              </ContactField>
              <ContactField label="Email">
                <input type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
              </ContactField>
              <ContactField label="Message">
                <textarea name="message" placeholder="What's on your mind?" required rows={4} />
              </ContactField>

              <button
                type="submit"
                disabled={pending}
                className="w-full mt-2 font-black text-sm uppercase tracking-widest rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: "#D7FF5A",
                  color: "#0B1E0D",
                  padding: "13px 24px",
                  border: "none",
                  fontFamily: "inherit",
                  opacity: pending ? 0.6 : 1,
                  cursor: pending ? "default" : "pointer",
                }}
              >
                {pending ? "Sending…" : "Send message →"}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-sm mt-6" style={{ color: "#4A6B50" }}>
          <Link href="/" className="font-semibold hover:opacity-80" style={{ color: "#4A6B50" }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

function ContactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement<React.InputHTMLAttributes<HTMLInputElement> | React.TextareaHTMLAttributes<HTMLTextAreaElement>>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4A6B50" }}>
        {label}
      </label>
      <style>{`
        .contact-input {
          width: 100%; background: #0F2411; border: 1px solid #2C4832;
          border-radius: 12px; padding: 12px 16px; font-size: 14px;
          color: #F0EDE6; outline: none; transition: border-color 0.15s;
          font-family: inherit; resize: vertical;
        }
        .contact-input::placeholder { color: #4A6B50; }
        .contact-input:focus { border-color: #D7FF5A; }
      `}</style>
      <children.type {...(children.props as object)} className="contact-input" />
    </div>
  );
}
