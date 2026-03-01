import fs from "node:fs/promises";
import { Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Agent, AgentStatus } from "./types";

type DiscoveredWorkspace = {
  id: string;
  name: string;
  lastActivityAt: string;
  status: AgentStatus;
  task: string;
};

const HEARTBEAT_WORKING_MINUTES = 15;
const HEARTBEAT_IDLE_MINUTES = 180;

function prettifyWorkspaceName(dirName: string): string {
  if (dirName === "workspace") return "Main Agent";
  if (dirName.startsWith("workspace-")) {
    const trimmed = dirName.replace("workspace-", "");
    return trimmed
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return dirName;
}

async function readAgentNameFromSoul(workspacePath: string): Promise<string | null> {
  const soulPath = path.join(workspacePath, "SOUL.md");
  try {
    const content = await fs.readFile(soulPath, "utf-8");
    const match = content.match(/You are\s+([^,\n.]+)/i);
    if (!match?.[1]) return null;
    return match[1].trim();
  } catch {
    return null;
  }
}

async function readLatestMemoryActivity(workspacePath: string): Promise<number | null> {
  const memoryPath = path.join(workspacePath, "memory");

  let entries: string[];
  try {
    entries = await fs.readdir(memoryPath);
  } catch {
    return null;
  }

  const markdownFiles = entries.filter((name) => name.endsWith(".md"));
  if (!markdownFiles.length) return null;

  const stats = await Promise.all(
    markdownFiles.map(async (name) => {
      const fullPath = path.join(memoryPath, name);
      try {
        return await fs.stat(fullPath);
      } catch {
        return null;
      }
    }),
  );

  const mtimes = stats.filter(Boolean).map((s) => s!.mtimeMs);
  if (!mtimes.length) return null;

  return Math.max(...mtimes);
}

async function getWorkspaceActivityTimestamp(workspacePath: string): Promise<number | null> {
  const localCandidates = ["SOUL.md", "USER.md", "IDENTITY.md", "AGENTS.md", "AGENT_MEMORY.md"];
  const statPromises = localCandidates.map(async (fileName) => {
    try {
      const stat = await fs.stat(path.join(workspacePath, fileName));
      return stat.mtimeMs;
    } catch {
      return null;
    }
  });

  const [memoryMtime, ...otherTimes] = await Promise.all([readLatestMemoryActivity(workspacePath), ...statPromises]);
  const allTimes = [memoryMtime, ...otherTimes].filter((value): value is number => typeof value === "number");
  if (!allTimes.length) return null;

  return Math.max(...allTimes);
}

function statusFromLastActivity(lastActivityMs: number, nowMs: number): AgentStatus {
  const minutes = (nowMs - lastActivityMs) / (1000 * 60);
  if (minutes <= HEARTBEAT_WORKING_MINUTES) return "working";
  if (minutes <= HEARTBEAT_IDLE_MINUTES) return "idle";
  return "error";
}

async function discoverWorkspaceAgents(openClawHome: string): Promise<DiscoveredWorkspace[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(openClawHome, { withFileTypes: true });
  } catch {
    return [];
  }

  const now = Date.now();
  const workspaceDirs = entries
    .filter((entry) => entry.isDirectory() && (entry.name === "workspace" || entry.name.startsWith("workspace-")))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const discovered = await Promise.all(
    workspaceDirs.map(async (dirName) => {
      const workspacePath = path.join(openClawHome, dirName);
      const lastActivityMs = await getWorkspaceActivityTimestamp(workspacePath);
      const identityName = await readAgentNameFromSoul(workspacePath);
      const fallbackName = prettifyWorkspaceName(dirName);

      const lastActivityAt = lastActivityMs ? new Date(lastActivityMs).toISOString() : new Date(0).toISOString();
      const status = lastActivityMs ? statusFromLastActivity(lastActivityMs, now) : "error";

      return {
        id: dirName,
        name: identityName ?? fallbackName,
        lastActivityAt,
        status,
        task: status === "error" ? "No recent heartbeat/activity detected" : "Watching workspace activity",
      };
    }),
  );

  return discovered;
}

export async function getWatchedAgents(existingAgents: Agent[]): Promise<Agent[]> {
  const openClawHome = process.env.OPENCLAW_HOME ?? path.join(os.homedir(), ".openclaw");
  const discovered = await discoverWorkspaceAgents(openClawHome);
  const existingById = new Map(existingAgents.map((agent) => [agent.id, agent]));

  for (const workspace of discovered) {
    const current = existingById.get(workspace.id);
    if (!current) {
      existingById.set(workspace.id, {
        id: workspace.id,
        name: workspace.name,
        status: workspace.status,
        task: workspace.task,
        lastHeartbeatAt: workspace.lastActivityAt,
      });
      continue;
    }

    if (new Date(workspace.lastActivityAt).getTime() > new Date(current.lastHeartbeatAt).getTime()) {
      existingById.set(workspace.id, {
        ...current,
        name: workspace.name,
        status: workspace.status,
        task: workspace.task,
        lastHeartbeatAt: workspace.lastActivityAt,
      });
    }
  }

  return Array.from(existingById.values()).sort((a, b) => a.name.localeCompare(b.name));
}
