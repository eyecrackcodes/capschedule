import { NextResponse } from "next/server";

export async function GET() {
  const hasClaudeKey = !!process.env.CLAUDE_API_KEY;

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    features: {
      aiCurriculum: hasClaudeKey ? "enabled" : "disabled (no API key)",
    },
  });
}
