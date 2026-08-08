import { NextRequest, NextResponse } from "next/server";

const COHERE_API_KEY = process.env.COHERE_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stats = body?.stats ?? [];

    if (!COHERE_API_KEY) {
      return NextResponse.json(
        { insight: "AI insights are not configured." },
        { status: 200 },
      );
    }

    const summaryLines = stats
      .map(
        (s: any) =>
          `${s.name}: target ${s.target_per_day}/day, ${s.totalCompletionsLast30Days} completions in last 30 days, current streak ${s.currentStreak}, longest streak ${s.longestStreak}`,
      )
      .join("\n");

    const prompt = `You are a habit-tracking coach. Based on this data, write EXACTLY ONE short, plain-text sentence (max 25 words) giving the single most useful insight or suggestion. No markdown, no bullet points, no bold text, no asterisks, no headers. Just one plain sentence.

Data:
${summaryLines}`;

    const cohereRes = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${COHERE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "command-r-plus",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await cohereRes.json();

    const rawText =
      data?.message?.content?.[0]?.text ??
      data?.text ??
      "Keep logging your habits daily to build streak momentum.";

    const cleanText = rawText
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#+\s?/g, "")
      .replace(/\n+/g, " ")
      .trim();

    return NextResponse.json({ insight: cleanText });
  } catch (err: any) {
    return NextResponse.json(
      { insight: "Could not generate insights right now. Try again later." },
      { status: 200 },
    );
  }
}
