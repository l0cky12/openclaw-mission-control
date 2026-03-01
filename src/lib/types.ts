export type AgentStatus = "idle" | "working" | "error";

export type Agent = {
  id: string;
  name: string;
  status: AgentStatus;
  task: string;
  lastHeartbeatAt: string;
};

export type CronStatus = "ok" | "failed" | "running";

export type CronJob = {
  id: string;
  name: string;
  schedule: string;
  intervalMinutes: number;
  lastRunAt: string;
  lastStatus: CronStatus;
  nextRunAt: string;
  recentLog: string;
};

export type TaskStatus = "todo" | "doing" | "done";

export type AgentTask = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type TokenUsage = {
  id: string;
  agent: string;
  taskId?: string;
  tokens: number;
  recordedAt: string;
};

export type MissionStore = {
  agents: Agent[];
  cronJobs: CronJob[];
  tasks: AgentTask[];
  tokenUsage: TokenUsage[];
};
