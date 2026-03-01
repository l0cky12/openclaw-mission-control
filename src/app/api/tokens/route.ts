import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store.tokenUsage);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    agent?: string;
    taskId?: string;
    tokens?: number;
  };

  if (!body.agent || !body.tokens || body.tokens <= 0) {
    return NextResponse.json({ error: "agent and positive tokens are required" }, { status: 400 });
  }

  const store = await readStore();
  store.tokenUsage.push({
    id: crypto.randomUUID(),
    agent: body.agent,
    taskId: body.taskId,
    tokens: body.tokens,
    recordedAt: new Date().toISOString(),
  });

  await writeStore(store);
  return NextResponse.json({ ok: true });
}
