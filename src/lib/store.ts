import fs from "node:fs/promises";
import path from "node:path";
import { MissionStore } from "./types";

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "mission-control.json");

const initialData: MissionStore = {
  agents: [
    {
      id: "coder",
      name: "Alan Turing",
      status: "working",
      task: "Build OpenClaw Mission Control",
      lastHeartbeatAt: new Date().toISOString(),
    },
    {
      id: "research-agent",
      name: "Research Agent",
      status: "idle",
      task: "No active task",
      lastHeartbeatAt: new Date().toISOString(),
    },
    {
      id: "work",
      name: "Work",
      status: "idle",
      task: "No active task",
      lastHeartbeatAt: new Date().toISOString(),
    },
    {
      id: "kay",
      name: "Kay Summersby",
      status: "idle",
      task: "No active task",
      lastHeartbeatAt: new Date().toISOString(),
    },
  ],
  cronJobs: [
    {
      id: "sync-spotify",
      name: "Spotify snapshot sync",
      schedule: "every 6 hours",
      intervalMinutes: 360,
      lastRunAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      lastStatus: "ok",
      nextRunAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      recentLog: "Synced 50 tracks and 50 artists",
    },
    {
      id: "usage-rollup",
      name: "Token usage rollup",
      schedule: "every 1 hour",
      intervalMinutes: 60,
      lastRunAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      lastStatus: "running",
      nextRunAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
      recentLog: "Rolling up hourly totals",
    },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Design mission control home",
      description: "Dashboard for agents, cron and token KPIs",
      assignee: "Alan Turing",
      status: "doing",
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: "task-2",
      title: "Add Docker deployment",
      description: "Dockerfile and compose for one-command deploy",
      assignee: "Alan Turing",
      status: "todo",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
  tokenUsage: [
    {
      id: "tok-1",
      agent: "Alan Turing",
      taskId: "task-1",
      tokens: 16800,
      recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "tok-2",
      agent: "Alan Turing",
      taskId: "task-1",
      tokens: 24300,
      recordedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "tok-3",
      agent: "Research Agent",
      tokens: 5200,
      recordedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

export async function readStore(): Promise<MissionStore> {
  await ensureStore();
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as MissionStore;
}

export async function writeStore(store: MissionStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}
