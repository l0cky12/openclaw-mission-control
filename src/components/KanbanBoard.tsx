"use client";

import { useMemo, useState } from "react";
import { AgentTask, TaskStatus } from "@/lib/types";

type Props = {
  initialTasks: AgentTask[];
};

const columns: { key: TaskStatus; title: string }[] = [
  { key: "todo", title: "To Do" },
  { key: "doing", title: "Doing" },
  { key: "done", title: "Done" },
];

export function KanbanBoard({ initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === "todo"),
      doing: tasks.filter((t) => t.status === "doing"),
      done: tasks.filter((t) => t.status === "done"),
    };
  }, [tasks]);

  async function moveTask(taskId: string, status: TaskStatus) {
    setLoading(taskId + status);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    }

    setLoading(null);
  }

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {columns.map((col) => (
        <article key={col.key} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h3 className="mb-3 text-lg font-semibold">{col.title}</h3>
          <div className="space-y-3">
            {grouped[col.key].map((task) => (
              <div key={task.id} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <p className="font-semibold">{task.title}</p>
                <p className="text-sm text-zinc-400">{task.assignee}</p>
                {task.description ? <p className="mt-1 text-xs text-zinc-500">{task.description}</p> : null}
                <div className="mt-3 flex gap-2">
                  {columns
                    .filter((c) => c.key !== col.key)
                    .map((target) => (
                      <button
                        key={target.key}
                        onClick={() => moveTask(task.id, target.key)}
                        disabled={Boolean(loading)}
                        className="rounded bg-zinc-700 px-2 py-1 text-xs hover:bg-zinc-600 disabled:opacity-50"
                      >
                        {loading === task.id + target.key ? "..." : target.title}
                      </button>
                    ))}
                </div>
              </div>
            ))}
            {!grouped[col.key].length ? <p className="text-sm text-zinc-500">No tasks</p> : null}
          </div>
        </article>
      ))}
    </section>
  );
}
