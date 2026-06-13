import type { BestCall, WorstPick } from "./data";

export interface Quips {
  goat: string | null;  // roast of the worst pick
  hero: string | null;  // shout-out to the best call
}

/**
 * Two short, specific lines for the day: a good-natured roast (Goat) and a
 * shout-out (Called it). League-wide, generated once per send. Uses OpenAI when
 * OPENAI_API_KEY is set, with templated fallbacks so the email never depends on
 * the model being reachable.
 */
export async function generateQuips(worst: WorstPick[], best: BestCall[]): Promise<Quips> {
  const goatCtx = worst[0];
  const heroCtx = best[0];
  if (!goatCtx && !heroCtx) return { goat: null, hero: null };

  const key = process.env.OPENAI_API_KEY;
  if (!key) return { goat: goatCtx ? templGoat(goatCtx) : null, hero: heroCtx ? templHero(heroCtx) : null };

  const facts = [
    goatCtx ? `WORST PICK: ${goatCtx.name} ${goatCtx.pick} in ${goatCtx.game}, which ${goatCtx.actual}.` : null,
    heroCtx ? `BEST CALL: ${heroCtx.name} ${heroCtx.called} in ${heroCtx.game}${heroCtx.rarity < 0.34 ? " — almost nobody else saw it" : ""}.` : null,
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 160,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You're a member of a friendly World Cup prediction league dropping two quick lines in the group chat. " +
              "From the facts, return JSON {\"goat\": string, \"hero\": string}. " +
              "goat = light ribbing of the worst pick. hero = a quick nod to the best call. " +
              "Write like a normal person texting mates: plain, dry, lightly funny. " +
              "ALWAYS name the two teams in the match you're talking about (e.g. 'USA vs Paraguay'). " +
              "Hard rules: one sentence each, max ~22 words, no try-hard metaphors or puns, no hype words " +
              "(no 'kickboxed', 'psychic', 'out of the park'), at most one exclamation mark total, " +
              "no emojis, no hashtags, no surrounding quotes. If a fact is missing, use an empty string.",
          },
          { role: "user", content: facts },
        ],
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { goat?: string; hero?: string };
    return {
      goat: (parsed.goat && parsed.goat.trim()) || (goatCtx ? templGoat(goatCtx) : null),
      hero: (parsed.hero && parsed.hero.trim()) || (heroCtx ? templHero(heroCtx) : null),
    };
  } catch {
    return { goat: goatCtx ? templGoat(goatCtx) : null, hero: heroCtx ? templHero(heroCtx) : null };
  }
}

function templGoat(w: WorstPick): string {
  return `${w.name} ${w.pick} in ${w.game} — it ${w.actual}. Bold strategy.`;
}
function templHero(b: BestCall): string {
  return `${b.name} ${b.called} in ${b.game}. Take a bow.`;
}
