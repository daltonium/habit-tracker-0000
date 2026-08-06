// app/api/insights/route.ts
import { NextResponse } from "next/server";

const apiKey = process.env.COHERE_API_KEY;

if (!apiKey) {
  throw new Error("COHERE_API_KEY is not set in environment");
}

const COHERE_URL = "https://api.cohere.com/v2/chat";
// Use a current Cohere chat model; update if docs show a newer default.
const COHERE_MODEL = "command-a-plus-05-2026";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body as { prompt?: string };

    const effectivePrompt =
      prompt ||
      "You are a helpful assistant that explains habit tracking analytics briefly.";

    const res = await fetch(COHERE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: COHERE_MODEL,
        messages: [
          {
            role: "user",
            content: effectivePrompt,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Cohere HTTP error:", res.status, text);
      return NextResponse.json(
        { ok: false, error: `Cohere HTTP ${res.status}` },
        { status: 500 },
      );
    }

    const data = await res.json();
    console.log("Cohere raw response:", JSON.stringify(data, null, 2));

    // Cohere v2 Chat: message.content is an array of parts; find the first with text
    let text = "No response from Cohere.";

    if (data?.message?.content && Array.isArray(data.message.content)) {
      const part = data.message.content.find(
        (p: any) => typeof p.text === "string" && p.text.length > 0,
      );
      if (part) {
        text = part.text;
      }
    }

    return NextResponse.json({ ok: true, text });
  } catch (err: any) {
    console.error("Cohere error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Cohere API error" },
      { status: 500 },
    );
  }
}