import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielatikitaka.com";

// Signs unsubscribe links so a member can opt out from an email (no login) but
// nobody can opt out someone else. Reuses CRON_SECRET unless a dedicated
// UNSUBSCRIBE_SECRET is set.
function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET ?? "dev-unsub-secret";
}

export function unsubToken(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("hex").slice(0, 32);
}

export function unsubscribeUrl(userId: string): string {
  return `${BASE}/api/recap/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}`;
}

export function verifyUnsub(userId: string, token: string | null): boolean {
  if (!token) return false;
  const expected = unsubToken(userId);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
