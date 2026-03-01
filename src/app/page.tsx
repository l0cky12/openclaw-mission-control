import { AgentsPanel } from "@/components/AgentsPanel";
import { KanbanBoard } from "@/components/KanbanBoard";
import { getOverview } from "@/lib/analytics";
import { getWatchedAgents } from "@/lib/agentWatcher";
import { readStore } from "@/lib/store";

function badgeFor(status: string) {
  if (status === "working" || status === "running") return "bg-amber-500/20 text-amber-300";
  if (status === "ok" || status === "idle") return "bg-emerald-500/20 text-emerald-300";
  return "bg-red-500/20 text-red-300";
}

export default async function Home() {
  const store = await readStore();
  const watchedAgents = await getWatchedAgents(store.agents);
  const overview = await getOverview();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">OpenClaw Mission Control</h1>
        <p className="mt-2 text-sm text-zinc-300">Agents, cron jobs, kanban tasks, and token usage in one place.</p>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat title="Active Agents" value={String(overview.activeAgents)} />
        <Stat title="Failing Jobs" value={String(overview.failingJobs)} />
        <Stat title="Tasks Doing" value={String(overview.tasks.doing)} />
        <Stat
          title="Tokens (all time)"
          value={String(Object.values(overview.tokenByAgent).reduce((sum, n) => sum + n, 0))}
        />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgentsPanel initialAgents={watchedAgents} />

        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="mb-3 text-lg font-semibold">Cron Jobs</h2>
          <div className="space-y-3">
            {store.cronJobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{job.name}</p>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${badgeFor(job.lastStatus)}`}>
                    {job.lastStatus}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">Schedule: {job.schedule}</p>
                <p className="mt-1 text-xs text-zinc-500">Last: {new Date(job.lastRunAt).toLocaleString()}</p>
                <p className="text-xs text-zinc-500">Next: {new Date(job.nextRunAt).toLocaleString()}</p>
                <p className="mt-1 text-xs text-zinc-400">Log: {job.recentLog}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Agent Task Board</h2>
        <KanbanBoard initialTasks={store.tasks} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="mb-3 text-lg font-semibold">Token Usage by Agent</h2>
          <div className="space-y-2">
            {Object.entries(overview.tokenByAgent).map(([agent, tokens]) => (
              <div key={agent}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{agent}</span>
                  <span>{tokens}</span>
                </div>
                <div className="h-2 rounded bg-zinc-800">
                  <div
                    className="h-2 rounded bg-cyan-400"
                    style={{
                      width: `${Math.max(
                        4,
                        (tokens / Math.max(...Object.values(overview.tokenByAgent), 1)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="mb-3 text-lg font-semibold">Token Usage by Day</h2>
          <div className="space-y-2">
            {overview.tokenByDay.map((row) => (
              <div key={row.day} className="flex items-center justify-between rounded bg-zinc-900/60 p-2 text-sm">
                <span>{row.day}</span>
                <span>{row.tokens}</span>
              </div>
            ))}
            {!overview.tokenByDay.length ? <p className="text-sm text-zinc-500">No token data</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}
