import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";
import { getWatchedAgents } from "@/lib/agentWatcher";

export async function GET(request: Request) {
  const store = await readStore();
  const url = new URL(request.url);
  const includeWatched = url.searchParams.get("watched") === "true";

  if (!includeWatched) {
    return NextResponse.json(store.agents);
  }

  return NextResponse.json(await getWatchedAgents(store.agents));
}
