// app/api/insights/route.ts
import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    const result = await geminiModel.generateContent(prompt || "Say hello");
    const text = result.response.text();

    return NextResponse.json({ ok: true, text });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Gemini error" },
      { status: 500 }
    );
  }
}