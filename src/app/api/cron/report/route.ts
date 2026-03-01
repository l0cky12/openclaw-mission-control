import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";
import { CronStatus } from "@/lib/types";

function calcNextRun(lastRunAt: string, intervalMinutes: number): string {
  const next = new Date(lastRunAt).getTime() + intervalMinutes * 60 * 1000;
  return new Date(next).toISOString();
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    id?: string;
    name?: string;
    schedule?: string;
    intervalMinutes?: number;
    status?: CronStatus;
    log?: string;
  };

  if (!body.id || !body.name || !body.intervalMinutes) {
    return NextResponse.json({ error: "id, name, intervalMinutes are required" }, { status: 400 });
  }

  const store = await readStore();
  const now = new Date().toISOString();
  const status = body.status ?? "ok";

  const idx = store.cronJobs.findIndex((j) => j.id === body.id);
  const row = {
    id: body.id,
    name: body.name,
    schedule: body.schedule ?? `every ${body.intervalMinutes} minutes`,
    intervalMinutes: body.intervalMinutes,
    lastRunAt: now,
    lastStatus: status,
    nextRunAt: calcNextRun(now, body.intervalMinutes),
    recentLog: body.log ?? "No log provided",
  };

  if (idx >= 0) {
    store.cronJobs[idx] = row;
  } else {
    store.cronJobs.push(row);
  }

  await writeStore(store);
  return NextResponse.json({ ok: true });
}
