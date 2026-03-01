import fs from "node:fs/promises";
import { Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Agent, AgentStatus } from "./types";

type DiscoverySource = "workspace" | "standalone" | "runtime";

type DiscoveredAgent = {
  id: string;
  name: string;
  lastActivityAt: string;
  status: AgentStatus;
  task: string;
  source: DiscoverySource;
};

const HEARTBEAT_WORKING_MINUTES = 15;
const HEARTBEAT_IDLE_MINUTES = 180;
const RUNTIME_AGENTS_DIR = "agents";
const STANDALONE_AGENT_EXCLUDE = new Set([
  "agents",
  "backups",
  "canvas",
  "completions",
  "credentials",
  "cron",
  "delivery-queue",
  "devices",
  "identity",
  "logs",
  "media",
  "memory",
  "scripts",
  "settings",
  "skills",
  "subagents",
]);

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

function prettifyAgentName(id: string): string {
  return id
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function safeMtimeMs(fullPath: string): Promise<number | null> {
  try {
    const stat = await fs.stat(fullPath);
    return stat.mtimeMs;
  } catch {
    return null;
  }
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
    return safeMtimeMs(path.join(workspacePath, fileName));
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

async function listSubdirs(fullPath: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(fullPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function mkDiscoveredRow(
  id: string,
  name: string,
  lastActivityMs: number | null,
  now: number,
  source: DiscoverySource,
  task: { ok: string; stale: string },
): DiscoveredAgent {
  const lastActivityAt = lastActivityMs ? new Date(lastActivityMs).toISOString() : new Date(0).toISOString();
  const status = lastActivityMs ? statusFromLastActivity(lastActivityMs, now) : "error";
  const taskText = status === "error" ? task.stale : task.ok;
  return { id, name, lastActivityAt, status, task: taskText, source };
}

async function discoverWorkspaceAgents(openClawHome: string): Promise<DiscoveredAgent[]> {
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
      return mkDiscoveredRow(
        dirName,
        identityName ?? fallbackName,
        lastActivityMs,
        now,
        "workspace",
        {
          ok: "Watching workspace activity",
          stale: "No recent workspace activity detected",
        },
      );
    }),
  );

  return discovered;
}

async function discoverStandaloneAgents(openClawHome: string): Promise<DiscoveredAgent[]> {
  const entries = await listSubdirs(openClawHome);
  const now = Date.now();
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith("."))
    .filter((entry) => !entry.name.startsWith("workspace"))
    .filter((entry) => !STANDALONE_AGENT_EXCLUDE.has(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const discovered = await Promise.all(
    candidates.map(async (dirName) => {
      const dirPath = path.join(openClawHome, dirName);
      const [hasSoul, hasAgentsMd] = await Promise.all([
        safeMtimeMs(path.join(dirPath, "SOUL.md")),
        safeMtimeMs(path.join(dirPath, "AGENTS.md")),
      ]);
      if (!hasSoul && !hasAgentsMd) return null;

      const lastActivityMs = await getWorkspaceActivityTimestamp(dirPath);
      const identityName = await readAgentNameFromSoul(dirPath);
      return mkDiscoveredRow(
        dirName,
        identityName ?? prettifyAgentName(dirName),
        lastActivityMs,
        now,
        "standalone",
        {
          ok: "Watching standalone agent workspace",
          stale: "No recent standalone workspace activity detected",
        },
      );
    }),
  );

  return discovered.filter((row): row is DiscoveredAgent => row !== null);
}

async function discoverRuntimeAgents(openClawHome: string): Promise<DiscoveredAgent[]> {
  const runtimeRoot = path.join(openClawHome, RUNTIME_AGENTS_DIR);
  const entries = await listSubdirs(runtimeRoot);
  const now = Date.now();
  const runtimeAgentDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const discovered = await Promise.all(
    runtimeAgentDirs.map(async (agentId) => {
      const agentPath = path.join(runtimeRoot, agentId);
      const [sessionsMtime, agentConfigMtime] = await Promise.all([
        safeMtimeMs(path.join(agentPath, "sessions")),
        safeMtimeMs(path.join(agentPath, "agent")),
      ]);
      const lastActivityMs = [sessionsMtime, agentConfigMtime].filter((value): value is number => value !== null).length
        ? Math.max(...[sessionsMtime, agentConfigMtime].filter((value): value is number => value !== null))
        : null;

      return mkDiscoveredRow(
        agentId,
        prettifyAgentName(agentId),
        lastActivityMs,
        now,
        "runtime",
        {
          ok: "Watching runtime session activity",
          stale: "No recent runtime session activity detected",
        },
      );
    }),
  );

  return discovered;
}

export async function getWatchedAgents(existingAgents: Agent[]): Promise<Agent[]> {
  const openClawHome = process.env.OPENCLAW_HOME ?? path.join(os.homedir(), ".openclaw");
  const [workspaces, standaloneAgents, runtimeAgents] = await Promise.all([
    discoverWorkspaceAgents(openClawHome),
    discoverStandaloneAgents(openClawHome),
    discoverRuntimeAgents(openClawHome),
  ]);
  const discovered = [...workspaces, ...standaloneAgents, ...runtimeAgents];
  const existingById = new Map(existingAgents.map((agent) => [agent.id, agent]));

  for (const discoveredAgent of discovered) {
    const current = existingById.get(discoveredAgent.id);
    if (!current) {
      existingById.set(discoveredAgent.id, {
        id: discoveredAgent.id,
        name: discoveredAgent.name,
        status: discoveredAgent.status,
        task: discoveredAgent.task,
        lastHeartbeatAt: discoveredAgent.lastActivityAt,
      });
      continue;
    }

    if (new Date(discoveredAgent.lastActivityAt).getTime() > new Date(current.lastHeartbeatAt).getTime()) {
      existingById.set(discoveredAgent.id, {
        ...current,
        name: discoveredAgent.name,
        status: discoveredAgent.status,
        task: discoveredAgent.task,
        lastHeartbeatAt: discoveredAgent.lastActivityAt,
      });
    }
  }

  return Array.from(existingById.values()).sort((a, b) => a.name.localeCompare(b.name));
}
