import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";
import { TaskStatus } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { status?: TaskStatus };

  if (!body.status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const store = await readStore();
  const idx = store.tasks.findIndex((t) => t.id === id);

  if (idx < 0) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  store.tasks[idx].status = body.status;
  store.tasks[idx].updatedAt = new Date().toISOString();

  await writeStore(store);
  return NextResponse.json({ ok: true });
}
