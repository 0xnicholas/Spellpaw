# Deploying Spellpaw to a Cloud Server

A single Node process serves the API, the LLM tool-server endpoint,
the WebSocket, and the static frontend SPA. Deploy by editing
`server/.env` and running four commands.

## What you need on the server

| Requirement | Version | Why |
|---|---|---|
| Node.js | ≥ 22 | ES modules + native `fetch` |
| SQLite | bundled (`better-sqlite3` not used — we use Prisma's `sqlite` provider which ships with the `better-sqlite3` binary) | persistent storage |
| Outbound HTTPS to your LLM provider | — | `LLM_BASE_URL` calls |
| Inbound HTTPS to the server | — | browser → API + tool-ws |

A single Linux VM (Ubuntu 22.04+, 1 vCPU, 1 GB RAM is plenty) works.

## Step 1 — Clone & install

```bash
git clone git@github.com:0xnicholas/Spellpaw.git
cd Spellpaw
npm ci                # installs frontend deps
cd server && npm ci   # installs server deps
cd ..
```

## Step 2 — Edit `server/.env`

```env
# --- Required ---
JWT_SECRET=<random 32+ char hex; openssl rand -hex 32>
PORT=3002
NODE_ENV=production

# --- LLM provider (choose one of: deepseek / openai / doubao / siliconflow / minimax) ---
LLM_API_KEY=sk-your-api-key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# --- Optional ---
# Comma-separated CORS origins. Default: http://localhost:5173
CLIENT_ORIGIN=https://yourdomain.com

# Tool server endpoint. Defaults to same-origin (http://localhost:3002/tool)
# Override only if you put the tool server on a different host.
# TOOL_SERVER_ENDPOINT=https://yourdomain.com/tool

# Database. Defaults to sqlite file at server/prisma/spellpaw.db
# DATABASE_URL=file:./spellpaw.db
```

That's the entire config surface. Six variables for a complete deploy.

## Step 3 — Build + migrate

```bash
# Initialize / migrate the SQLite DB
npm run db:push

# Build frontend (dist/) + compile server (server/dist/)
npm run build
```

## Step 4 — Run

```bash
npm start
```

That's it. One process serves everything on port 3002:

- `GET /` → React SPA from `dist/`
- `GET /project/:id` → SPA fallback (client-side routing)
- `POST /api/auth/login` → JWT auth
- `POST /api/v1/sessions` + `GET /api/v1/events` (SSE) → LLM proxy
- `POST /tool` → browser-side tool execution
- `WS /tool-ws` → browser subscribes for tool calls

The demo account (`demo@spellpaw.xyz` / `password123`) is auto-seeded
on first startup so you can log in immediately.

## Step 5 — Reverse proxy (recommended)

For TLS termination and `Host` header hygiene, run nginx or Caddy in
front. Example Caddyfile:

```
yourdomain.com {
    reverse_proxy localhost:3002
}
```

Or nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;

        # WebSocket support for /tool-ws
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 60s;
    }
}
```

Caddy handles the WebSocket upgrade automatically. With nginx you must
include the `Upgrade` / `Connection` headers as shown.

## Keeping it alive — systemd

`/etc/systemd/system/spellpaw.service`:

```ini
[Unit]
Description=Spellpaw
After=network.target

[Service]
Type=simple
User=spellpaw
WorkingDirectory=/home/spellpaw/Spellpaw
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
EnvironmentFile=/home/spellpaw/Spellpaw/server/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now spellpaw
sudo journalctl -u spellpaw -f   # tail logs
```

## Upgrading

```bash
git pull
npm ci && cd server && npm ci && cd ..
npm run build
sudo systemctl restart spellpaw
```

The demo user is re-seeded only if missing. Projects created by the
demo user are owned by it; signing in as `demo@spellpaw.xyz` lets
you reset them via the project list page.

## What's NOT in this guide

- Multi-user deployment beyond the demo account. Real users must be
  created via `POST /api/auth/register` (or directly in the DB).
- Database backups. Run `sqlite3 server/prisma/spellpaw.db ".backup
  /path/to/snap.db"` on a cron.
- For PostgreSQL/MySQL: change the Prisma `datasource` provider and
  set `DATABASE_URL` accordingly. No app code changes required.