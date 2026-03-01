"use client";

import { useEffect, useMemo, useState } from "react";
import { Agent } from "@/lib/types";

type Props = {
  initialAgents: Agent[];
};

function badgeFor(status: string) {
  if (status === "working" || status === "running") return "bg-amber-500/20 text-amber-300";
  if (status === "ok" || status === "idle") return "bg-emerald-500/20 text-emerald-300";
  return "bg-red-500/20 text-red-300";
}

function ageLabel(isoTime: string): string {
  const then = new Date(isoTime).getTime();
  if (!Number.isFinite(then) || then <= 0) return "unknown";

  const diffMs = Date.now() - then;
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AgentsPanel({ initialAgents }: Props) {
  const [agents, setAgents] = useState(initialAgents);
  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());
  const [, setTicker] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTicker((v) => v + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const refreshedLabel = useMemo(() => ageLabel(new Date(lastRefreshedAt).toISOString()), [lastRefreshedAt]);

  async function refreshAgents() {
    setLoading(true);
    try {
      const response = await fetch("/api/agents?watched=true", { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as Agent[];
      setAgents(next);
      setLastRefreshedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Agents</h2>
        <div className="flex items-center gap-3">
          <p className="text-xs text-zinc-500">Refreshed {refreshedLabel}</p>
          <button
            onClick={refreshAgents}
            disabled={loading}
            className="rounded bg-zinc-700 px-2 py-1 text-xs hover:bg-zinc-600 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Agents"}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{agent.name}</p>
              <span className={`rounded px-2 py-1 text-xs font-medium ${badgeFor(agent.status)}`}>{agent.status}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">{agent.task}</p>
            <p className="mt-1 text-xs text-zinc-500">Last heartbeat: {new Date(agent.lastHeartbeatAt).toLocaleString()}</p>
            <p className="mt-1 text-xs text-zinc-500">Last seen: {ageLabel(agent.lastHeartbeatAt)}</p>
          </div>
        ))}
        {!agents.length ? <p className="text-sm text-zinc-500">No agents found</p> : null}
      </div>
    </article>
  );
}
