import { NextRequest, NextResponse } from "next/server";

const PROJECT_ID = "tap-london";

// Site facts NOVA should always know, regardless of what's in Firestore.
// This is where things like social links live - static, rarely-changing
// facts about TAP LONDON itself, not content data.
const SITE_FACTS = {
  socials: {
    instagram: "https://www.instagram.com/taplondonofficial/",
    threads: "https://www.threads.com/@taplondonofficial",
    tiktok: "https://www.tiktok.com/@taplondonofficial",
  },
  website: "https://londontap.co.uk",
  emergency: { police_fire_ambulance: "999", nhs_non_emergency: "111", tfl: "0343 222 1234" },
};

// ── Firestore field parsing (mirrors lib/firestore.ts) ──
function parseFieldValue(field: any): any {
  if (!field) return undefined;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.nullValue !== undefined) return null;
  if (field.mapValue !== undefined) return parseFields(field.mapValue.fields || {});
  if (field.arrayValue !== undefined) return (field.arrayValue.values || []).map(parseFieldValue);
  return undefined;
}
function parseFields(fields: Record<string, any>): any {
  const obj: any = {};
  Object.keys(fields).forEach((key) => (obj[key] = parseFieldValue(fields[key])));
  return obj;
}

async function searchCollection(collection: string, query: string, limit = 5): Promise<any[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?pageSize=200`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.documents) return [];

    const items = json.documents.map((doc: any) => {
      const item = parseFields(doc.fields || {});
      item.id = doc.name.split("/").pop();
      return item;
    });

    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const scored = items
      .map((item: any) => {
        const haystack = `${item.name} ${item.category} ${item.area} ${item.description} ${item.cuisine}`.toLowerCase();
        let score = 0;
        words.forEach((w) => { if (haystack.includes(w)) score += 1; });
        return { item, score };
      })
      .filter((x: any) => x.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit)
      .map((x: any) => x.item);

    // If nothing matched the query words, just return the top few items
    // (useful for broad asks like "recommend a hotel")
    return scored.length > 0 ? scored : items.slice(0, limit);
  } catch {
    return [];
  }
}

// Decide which collections are relevant to the user's message, based on keywords.
// This avoids querying all 18 collections on every single message.
const COLLECTION_KEYWORDS: Record<string, string[]> = {
  places: ["place", "attraction", "see", "visit", "museum", "gallery", "tower", "landmark", "sight"],
  food: ["food", "restaurant", "eat", "lunch", "dinner", "halal", "cuisine", "cafe"],
  hotels: ["hotel", "stay", "accommodation", "room", "book a room"],
  nightlife: ["club", "bar", "nightlife", "party", "drink"],
  shopping: ["shop", "shopping", "market", "buy", "store"],
  hiddenGems: ["hidden gem", "secret", "unusual", "off the beaten path"],
  kids: ["kid", "child", "family", "playground", "toddler"],
  theatre: ["theatre", "theater", "show", "musical", "west end"],
  music: ["music", "gig", "concert", "live music", "venue"],
  sports: ["football", "sport", "stadium", "match", "cricket", "tennis"],
  hotels_areas: [],
  universities: ["university", "college", "study"],
  daytrips: ["day trip", "windsor", "oxford", "cambridge", "stonehenge", "outside london"],
  muslim: ["mosque", "halal", "muslim", "prayer"],
  offers: ["offer", "deal", "discount"],
  events: ["event", "today", "happening", "what's on", "festival"],
};

function detectRelevantCollections(message: string): string[] {
  const m = message.toLowerCase();
  const matched = Object.entries(COLLECTION_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => m.includes(k)))
    .map(([collection]) => collection);
  return matched;
}

function detectsSocialQuestion(message: string): boolean {
  const m = message.toLowerCase();
  return /instagram|social media|threads|tiktok|follow you|your (page|account)/.test(m);
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();
    if (typeof message !== 'string' || !message.trim() || message.length > 600 || !Array.isArray(history)) {
      return NextResponse.json({ reply: "Please send a question under 600 characters." }, { status: 400 });
    }
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
      return NextResponse.json({ reply: "NOVA is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    // ── Ground NOVA in real site data before answering ──
    let contextBlock = "";

    if (detectsSocialQuestion(message)) {
      contextBlock += `\n\nTAP LONDON's official social media:\n- Instagram: ${SITE_FACTS.socials.instagram}\n- Threads: ${SITE_FACTS.socials.threads}\n- TikTok: ${SITE_FACTS.socials.tiktok}`;
    }

    const relevantCollections = detectRelevantCollections(message);
    if (relevantCollections.length > 0) {
      const results = await Promise.all(
        relevantCollections.slice(0, 3).map(async (col) => {
          const items = await searchCollection(col, message, 4);
          return { col, items };
        })
      );
      const usable = results.filter((r) => r.items.length > 0);
      if (usable.length > 0) {
        contextBlock += "\n\nReal current listings from TAP LONDON's database (use these facts, don't invent your own):\n";
        usable.forEach(({ col, items }) => {
          contextBlock += `\n${col}:\n`;
          items.forEach((it: any) => {
            const bits = [it.name, it.area, it.priceRange || it.entryFee || it.priceType, it.category].filter(Boolean).join(" — ");
            contextBlock += `- ${bits}\n`;
          });
        });
      }
    }

    const SYSTEM = `You are NOVA, a friendly AI guide for TAP LONDON. You talk like a knowledgeable local friend, not a travel brochure.

Rules:
- Match the tone of the message. If someone says "hi" or "hey", just greet them back casually and ask what they're looking for — do NOT dump a list of recommendations.
- Only give structured lists (bullets, bold headers) when the person actually asks for recommendations, options, or a plan.
- For simple questions, answer in plain conversational sentences — no bullet points, no bold text, no headers.
- Keep replies short by default (1-3 sentences) unless the person asks for detail or a list.
- Don't over-use emojis — one or two per message max, only when natural.
- Detect the user's language and reply in the same language.
- CRITICAL: If real listings data is provided below, you MUST use those exact names and facts in your answer instead of making up your own recommendations. Never invent a place, hotel, or venue name that isn't in the provided data or your own general knowledge of well-known London landmarks.
- If asked about TAP LONDON's social media, always give the exact links provided below - never say you don't have social media or make up a handle.
- You know London well: places, halal food, transport, hotels, kids activities, hidden gems, shopping, sports, nightlife, emergencies (999/111). You also happily answer general questions on any topic.${contextBlock}`;

    const messages = [
      { role: "system", content: SYSTEM },
      ...history.slice(-6).filter((m: any) => typeof m?.content === 'string').map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content.slice(0, 600),
      })),
      { role: "user", content: message },
    ];

    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens: 600,
          temperature: 0.7,
        }),
      });
      const d = await r.json();
      const reply = d?.choices?.[0]?.message?.content;
      if (reply) return NextResponse.json({ reply });
    } catch {}

    return NextResponse.json({ reply: "I am having a moment! For urgent help: Emergency 999, NHS 111, TfL 0343 222 1234" });

  } catch (e: any) {
    return NextResponse.json({ reply: "Something went wrong. Please try again!" });
  }
}
