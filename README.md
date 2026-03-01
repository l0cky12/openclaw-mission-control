# OpenClaw Mission Control

Mission control dashboard for OpenClaw with:

- Agent activity/status tracking
- Auto-watch mode for all local OpenClaw workspaces (`workspace*`)
- Cron job monitoring
- Kanban board for agent tasks (`To Do`, `Doing`, `Done`)
- Token usage analytics
- Docker deployment

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API endpoints

- `GET /api/overview` - overview KPIs and token aggregates
- `GET /api/agents` - agent status
- `GET /api/agents?watched=true` - merged heartbeat + auto-discovered workspace agents
- `POST /api/agents/heartbeat` - upsert agent heartbeat
- `GET /api/cron` - cron job state
- `POST /api/cron/report` - upsert cron run status
- `GET /api/tasks` - list tasks
- `POST /api/tasks` - create task
- `PATCH /api/tasks/:id` - move task status
- `GET /api/tokens` - token usage rows
- `POST /api/tokens` - append token usage row

## Basic auth

Set env vars to protect UI + API with HTTP Basic Auth:

```bash
ADMIN_USER=admin
ADMIN_PASS=change-me
OPENCLAW_HOME=/home/liam/.openclaw
```

If unset, auth is disabled.

## Docker deploy

```bash
docker compose up -d --build
```

App runs on `http://localhost:3000`.

## Data persistence

Data is persisted in `data/mission-control.json`.
In Docker, `/app/data` is mapped to named volume `mission_control_data`.
