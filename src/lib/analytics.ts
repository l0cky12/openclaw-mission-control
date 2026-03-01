import { getWatchedAgents } from "./agentWatcher";
import { readStore } from "./store";

export async function getOverview() {
  const store = await readStore();
  const watchedAgents = await getWatchedAgents(store.agents);

  const activeAgents = watchedAgents.filter((a) => a.status === "working").length;
  const failingJobs = store.cronJobs.filter((j) => j.lastStatus === "failed").length;
  const todo = store.tasks.filter((t) => t.status === "todo").length;
  const doing = store.tasks.filter((t) => t.status === "doing").length;
  const done = store.tasks.filter((t) => t.status === "done").length;

  const daily = new Map<string, number>();
  for (const row of store.tokenUsage) {
    const day = row.recordedAt.slice(0, 10);
    daily.set(day, (daily.get(day) ?? 0) + row.tokens);
  }

  const tokenByDay = Array.from(daily.entries())
    .map(([day, tokens]) => ({ day, tokens }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const tokenByAgent = store.tokenUsage.reduce<Record<string, number>>((acc, row) => {
    acc[row.agent] = (acc[row.agent] ?? 0) + row.tokens;
    return acc;
  }, {});

  return {
    activeAgents,
    failingJobs,
    tasks: { todo, doing, done },
    tokenByDay,
    tokenByAgent,
  };
}
