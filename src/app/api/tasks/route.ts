import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store.tasks);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    assignee?: string;
  };

  if (!body.title || !body.assignee) {
    return NextResponse.json({ error: "title and assignee are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const store = await readStore();

  store.tasks.push({
    id: crypto.randomUUID(),
    title: body.title,
    description: body.description ?? "",
    assignee: body.assignee,
    status: "todo",
    createdAt: now,
    updatedAt: now,
  });

  await writeStore(store);
  return NextResponse.json({ ok: true });
}
