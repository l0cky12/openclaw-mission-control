import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";
import { AgentStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    id?: string;
    name?: string;
    status?: AgentStatus;
    task?: string;
  };

  if (!body.id || !body.name) {
    return NextResponse.json({ error: "id and name are required" }, { status: 400 });
  }

  const store = await readStore();
  const now = new Date().toISOString();
  const status = body.status ?? "working";
  const task = body.task ?? "Active task";

  const idx = store.agents.findIndex((a) => a.id === body.id);
  if (idx >= 0) {
    store.agents[idx] = {
      ...store.agents[idx],
      name: body.name,
      status,
      task,
      lastHeartbeatAt: now,
    };
  } else {
    store.agents.push({
      id: body.id,
      name: body.name,
      status,
      task,
      lastHeartbeatAt: now,
    });
  }

  await writeStore(store);
  return NextResponse.json({ ok: true });
}
