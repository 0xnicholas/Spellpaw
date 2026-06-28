# Deploying Spellpaw — autonomous cloud-server guide

This guide is written for an autonomous coding agent (or human) that
must deploy Spellpaw to a fresh Linux VM **without further human
intervention**. Every step is a self-contained shell block, runs
without a TTY, and ends with a validation that the step succeeded.
If a validation fails, the failure cause and fix are in
[Appendix A](#appendix-a--troubleshooting).

## How to read this document

Each numbered step has three parts:

1. **Commands** — copy-paste shell block. Run as a regular user
   unless the step says `sudo`.
2. **Validation** — a `curl` / `test` / `systemctl` line whose exit
   code or output proves the step worked. If the validation fails,
   consult [Appendix A](#appendix-a--troubleshooting) before
   continuing.
3. **Done** — a one-line "you can move to step N+1" marker.

Where the step needs an input the agent can't derive (a domain
name, an LLM API key), the step is split into a "decide" sub-step
and an "execute" sub-step.

## 0. Pre-flight

```bash
# Run on the target server. If any check fails, stop and remediate
# before proceeding.
set -euo pipefail

# We need bash ≥ 4 for set -u, Node ≥ 22, sudo, openssl, curl, jq.
[ "$(id -u)" -ne 0 ] && echo "ERROR: run as a regular user with sudo" && exit 1
sudo -n true 2>/dev/null || { echo "ERROR: passwordless sudo required"; exit 1; }

command -v node >/dev/null || { echo "ERROR: node not installed"; exit 1; }
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 22 ] || { echo "ERROR: node ≥ 22 required, have $NODE_MAJOR"; exit 1; }

command -v git >/dev/null || { echo "ERROR: git not installed"; exit 1; }
command -v openssl >/dev/null || { echo "ERROR: openssl not installed"; exit 1; }
command -v curl >/dev/null || { echo "ERROR: curl not installed"; exit 1; }
command -v jq >/dev/null || { echo "ERROR: jq not installed (apt-get install jq)"; exit 1; }

# Outbound HTTPS must work (we'll fetch from github + npm + LLM)
curl -s -o /dev/null -w "%{http_code}\n" https://github.com | grep -q '^200$' \
  || { echo "ERROR: cannot reach github.com"; exit 1; }

echo "✓ pre-flight OK (node $(node -v))"
```

Done when: prints `✓ pre-flight OK (node v…)`.

## 1. Install system packages

```bash
set -euo pipefail
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
    git curl openssl jq ufw ca-certificates rsync

# NodeSource repo for Node 22 (Ubuntu's stock nodejs is too old)
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Caddy for reverse proxy + automatic HTTPS. Caddy is preferred over
# nginx because it handles Let's Encrypt cert provisioning + renewal
# with zero config (the Caddyfile is two lines).
sudo apt-get install -y --no-install-recommends debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy

# Create the runtime user (no password, no sudo, no shell)
if ! id spellpaw >/dev/null 2>&1; then
  sudo useradd --system --create-home --shell /usr/sbin/nologin --user-group spellpaw
fi
```

**Validation:**

```bash
node -v | grep -q '^v2[2-9]' && echo "node OK"
caddy version | grep -q '^v' && echo "caddy OK"
id spellpaw >/dev/null && echo "user OK"
```

Done when: all three lines print `OK`.

## 2. Get the code

We clone over **HTTPS** (no SSH key required on the server). The
repo is public; no auth needed.

```bash
set -euo pipefail
INSTALL_DIR=/home/spellpaw/Spellpaw
sudo rm -rf "$INSTALL_DIR"
sudo -u spellpaw git clone https://github.com/0xnicholas/Spellpaw.git "$INSTALL_DIR"
cd "$INSTALL_DIR"
sudo -u spellpaw git log -1 --format="%h %s"
```

**Validation:**

```bash
[ -f /home/spellpaw/Spellpaw/package.json ] && \
  [ -d /home/spellpaw/Spellpaw/server ] && \
  [ -f /home/spellpaw/Spellpaw/DEPLOY.md ] && \
  echo "clone OK"
```

Done when: prints `clone OK` and the most recent commit is visible.

## 3. Collect required inputs

The agent must have these before continuing. If it doesn't, prompt
the user or read from env / a secret store.

```bash
set -euo pipefail
# Read from environment if not set interactively. The deployment
# script should source these from wherever the operator keeps them.
: "${LLM_API_KEY:?LLM_API_KEY not set — pass as env or prompt the user}"
: "${PUBLIC_HOST:?PUBLIC_HOST not set — pass the domain or public IP}"

# LLM provider defaults to DeepSeek. Override LLM_BASE_URL + LLM_MODEL
# for any OpenAI-compatible endpoint.
: "${LLM_BASE_URL:=https://api.deepseek.com/v1}"
: "${LLM_MODEL:=deepseek-chat}"
export LLM_API_KEY PUBLIC_HOST LLM_BASE_URL LLM_MODEL

echo "PUBLIC_HOST = $PUBLIC_HOST"
echo "LLM_BASE_URL = $LLM_BASE_URL"
echo "LLM_MODEL   = $LLM_MODEL"
# LLM_API_KEY intentionally not echoed.
```

Done when: the four echo lines print. If any `?` triggered, the
operator must supply the missing var.

## 4. Write `server/.env`

```bash
set -euo pipefail
INSTALL_DIR=/home/spellpaw/Spellpaw
JWT_SECRET=$(openssl rand -hex 32)
sudo tee "$INSTALL_DIR/server/.env" >/dev/null <<EOF
# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) by DEPLOY.md
JWT_SECRET=$JWT_SECRET
PORT=3002
NODE_ENV=production

PUBLIC_HOST=$PUBLIC_HOST
CLIENT_ORIGIN=https://$PUBLIC_HOST,http://$PUBLIC_HOST,http://localhost:3002

LLM_API_KEY=$LLM_API_KEY
LLM_BASE_URL=$LLM_BASE_URL
LLM_MODEL=$LLM_MODEL
EOF
sudo chown spellpaw:spellpaw "$INSTALL_DIR/server/.env"
sudo chmod 600 "$INSTALL_DIR/server/.env"
```

**Validation:**

```bash
sudo test -f /home/spellpaw/Spellpaw/server/.env && \
  sudo grep -q '^JWT_SECRET=[a-f0-9]\{64\}$' /home/spellpaw/Spellpaw/server/.env && \
  sudo grep -q '^LLM_API_KEY=' /home/spellpaw/Spellpaw/server/.env && \
  echo "env OK"
```

Done when: prints `env OK`.

## 5. Install dependencies

```bash
set -euo pipefail
cd /home/spellpaw/Spellpaw
sudo -u spellpaw npm ci
sudo -u spellpaw bash -c 'cd server && npm ci'
```

**Validation:**

```bash
[ -d /home/spellpaw/Spellpaw/node_modules ] && \
  [ -d /home/spellpaw/Spellpaw/server/node_modules ] && \
  echo "deps OK"
```

Done when: prints `deps OK`.

## 6. Initialize the database

```bash
set -euo pipefail
cd /home/spellpaw/Spellpaw
sudo -u spellpaw npm run db:push
```

**Validation:**

```bash
test -f /home/spellpaw/Spellpaw/server/prisma/spellpaw.db && \
  echo "db OK ($(stat -c %s /home/spellpaw/Spellpaw/server/prisma/spellpaw.db) bytes)"
```

Done when: prints `db OK (N bytes)`.

## 7. Build

```bash
set -euo pipefail
cd /home/spellpaw/Spellpaw
sudo -u spellpaw npm run build
```

**Validation:**

```bash
[ -d /home/spellpaw/Spellpaw/dist ] && \
  [ -f /home/spellpaw/Spellpaw/dist/index.html ] && \
  [ -f /home/spellpaw/Spellpaw/server/dist/index.js ] && \
  echo "build OK"
```

If `build OK` doesn't print, run `cd /home/spellpaw/Spellpaw && sudo -u spellpaw npm run build 2>&1 | tail -30` and look for the first error.

Done when: prints `build OK`.

## 8. Smoke test (manual run, no systemd yet)

Run the server in the foreground briefly to confirm it boots and
serves the SPA + API. This catches 80% of problems before we set
up systemd.

```bash
set -euo pipefail
cd /home/spellpaw/Spellpaw
sudo -u spellpaw bash -c 'cd server && PORT=3002 NODE_ENV=production node dist/index.js' &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null || true" EXIT
# Give the server a moment to bind
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null http://localhost:3002/ && break
  sleep 0.5
done

# Frontend
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/)" = "200" && echo "GET / OK"
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/project/proj_1)" = "200" && echo "SPA fallback OK"
test "$(curl -s http://localhost:3002/skills/index.json | jq -r '.skills | length')" -gt 30 && echo "skills index OK"
test "$(curl -s -X POST http://localhost:3002/api/auth/login -H 'Content-Type: application/json' -d '{"email":"demo@spellpaw.xyz","password":"password123"}' | jq -r .user.id)" = "demo-user" && echo "demo auth OK"
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/api/projects)" = "401" && echo "projects requires auth OK"

kill $SERVER_PID
wait $SERVER_PID 2>/dev/null || true
trap - EXIT
```

All five `OK` lines must print. If any `OK` is missing, the most
likely cause is in [Appendix A](#appendix-a--troubleshooting).

## 9. Reverse proxy + automatic HTTPS (Caddy)

We use Caddy. It provisions a Let's Encrypt cert on first request
and renews it automatically — no separate certbot step.

```bash
set -euo pipefail
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
# Plain HTTP → HTTPS redirect
http://$PUBLIC_HOST, http://$PUBLIC_HOST:3002 {
    redir https://$PUBLIC_HOST{uri} permanent
}

# Main site
https://$PUBLIC_HOST {
    reverse_proxy 127.0.0.1:3002 {
        # WebSocket upgrade for /tool-ws
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    encode zstd gzip
}
EOF

sudo systemctl reload caddy
```

**Validation:**

```bash
sudo systemctl is-active --quiet caddy && echo "caddy active"
sudo caddy validate --config /etc/caddy/Caddyfile && echo "config valid"
sleep 2  # give caddy a moment to bind
test "$(curl -sk -o /dev/null -w '%{http_code}' https://$PUBLIC_HOST/)" = "200" \
  && echo "https OK"
```

All three lines must print. **The third line (`https OK`) requires
the domain to resolve to this server's public IP and port 443 to be
reachable from where the agent runs the curl.** If the agent runs
on the server itself, replace `https://$PUBLIC_HOST/` with
`https://localhost/` to skip the DNS check.

If `https OK` fails with `Connection refused`, see
[Appendix A.4 — firewall not open](#appendix-a--troubleshooting).

## 10. Firewall

```bash
set -euo pipefail
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH           # 22/tcp
sudo ufw allow "Caddy"            # 80 + 443/tcp via Caddy's UFW profile
sudo ufw --force enable
sudo ufw status numbered
```

**Validation:**

```bash
sudo ufw status | grep -q "80/tcp" && \
  sudo ufw status | grep -q "443/tcp" && \
  echo "firewall OK"
```

Done when: prints `firewall OK`.

## 11. systemd service

The app must run as the unprivileged `spellpaw` user and restart
automatically on crash or reboot.

```bash
set -euo pipefail

# Locate the absolute path of node on this system
NODE_PATH=$(command -v node)

sudo tee /etc/systemd/system/spellpaw.service >/dev/null <<EOF
[Unit]
Description=Spellpaw
Documentation=https://github.com/0xnicholas/Spellpaw
After=network.target

[Service]
Type=simple
User=spellpaw
Group=spellpaw
WorkingDirectory=/home/spellpaw/Spellpaw/server
EnvironmentFile=/home/spellpaw/Spellpaw/server/.env
ExecStart=$NODE_PATH dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=spellpaw

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/spellpaw/Spellpaw/server/prisma
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
RestrictNamespaces=true
MemoryDenyWriteExecute=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now spellpaw
```

**Validation:**

```bash
sudo systemctl is-active --quiet spellpaw && echo "active"
sudo systemctl is-enabled --quiet spellpaw && echo "enabled"
sudo journalctl -u spellpaw -n 5 --no-pager
```

The first two lines print `active` and `enabled`. The last command
shows the most recent 5 log lines; you should see `🧙 Spellpaw Server
running on http://localhost:3002` within the first ~10 seconds. If
you don't, run `sudo systemctl status spellpaw -l` for the last
200 lines of logs.

## 12. End-to-end verification

```bash
set -euo pipefail

# 1. Service is running
sudo systemctl is-active --quiet spellpaw && echo "[1/5] service running"

# 2. Caddy is running
sudo systemctl is-active --quiet caddy && echo "[2/5] caddy running"

# 3. Public HTTPS serves the SPA
test "$(curl -sk -o /dev/null -w '%{http_code}' https://$PUBLIC_HOST/)" = "200" \
  && echo "[3/5] SPA served via HTTPS"

# 4. Public HTTPS serves the skills index
SKILL_COUNT=$(curl -sk https://$PUBLIC_HOST/skills/index.json | jq -r '.skills | length')
[ "$SKILL_COUNT" -gt 30 ] && echo "[4/5] $SKILL_COUNT skills exposed"

# 5. Public HTTPS login works
USER_ID=$(curl -sk -X POST https://$PUBLIC_HOST/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@spellpaw.xyz","password":"password123"}' | jq -r .user.id)
[ "$USER_ID" = "demo-user" ] && echo "[5/5] demo login works (user=$USER_ID)"
```

**All five `[N/5]` lines must print.** If any is missing, the agent
should re-run the relevant numbered step (e.g. step 11 if
`[1/5]` failed, step 4 if `[5/5]` failed) and re-validate.

## 13. Hand off

The deployment is done. The operator can now:

1. Visit `https://$PUBLIC_HOST/` in a browser
2. Log in with `demo@spellpaw.xyz` / `password123`
3. Type `/` in the chat composer to see the 34-skill autocomplete

Tell the operator the deployment is complete, the public URL, and
the systemd log command (`sudo journalctl -u spellpaw -f`) for
ongoing monitoring.

---

## Appendix A — Troubleshooting

### A.1 `node ≥ 22` check fails after step 0

Your system ships an older Node. Run step 1 (it adds NodeSource)
and re-run step 0.

### A.2 `npm ci` fails with `EACCES` on `node_modules`

You ran as root. `npm ci` must run as `spellpaw`. Re-run:

```bash
sudo chown -R spellpaw:spellpaw /home/spellpaw/Spellpaw
sudo -u spellpaw bash -c 'cd /home/spellpaw/Spellpaw && npm ci && cd server && npm ci'
```

### A.3 `npm run build` fails with "Cannot find module './routes/auth.js'"

You have a stale `server/dist/` from an older `tsconfig`. Delete it
and rebuild:

```bash
sudo -u spellpaw rm -rf /home/spellpaw/Spellpaw/server/dist
sudo -u spellpaw bash -c 'cd /home/spellpaw/Spellpaw && npm run build'
```

If that doesn't fix it, the source has imports without `.js` —
report upstream.

### A.4 Step 9 `https OK` returns `000` (connection refused)

Port 443 is not open from where you ran the curl. If the curl ran
on the server itself, that's fine — the firewall blocked the loopback
to 443. From outside:

- Verify the domain's DNS A record points to this server's public IP:
  `dig +short $PUBLIC_HOST`
- Verify the cloud security group / firewall allows inbound 443.
  (This is OUTSIDE the VM's ufw; the cloud provider may block it.)
- Verify Caddy is listening on 443: `sudo ss -tlnp | grep :443`

### A.5 Step 11 journal shows `EADDRINUSE :::3002`

The smoke test from step 8 didn't fully release the port, or
another process is using 3002. Find and kill it:

```bash
sudo lsof -i :3002        # who has the port
sudo systemctl restart spellpaw
```

### A.6 Step 11 journal shows `PrismaClientKnownRequestError: Table main.User does not exist`

You skipped `npm run db:push` (step 6). Run it now:

```bash
cd /home/spellpaw/Spellpaw && sudo -u spellpaw npm run db:push
sudo systemctl restart spellpaw
```

### A.7 Step 12 `[5/5]` returns empty `user.id` (login fails)

The `LLM_*` env vars didn't get into the running process. systemd's
`EnvironmentFile=` only re-reads the file when you run
`systemctl daemon-reload && systemctl restart`. Re-run those and
verify with `systemctl show spellpaw -p Environment`.

If login still fails with `Invalid credentials`, the demo user wasn't
seeded. The seed runs on first startup if the user doesn't exist;
restart systemd to trigger:

```bash
sudo systemctl restart spellpaw
sudo journalctl -u spellpaw -n 20 --no-pager | grep -i "seed\|demo"
```

You should see `seeded demo user` (or `demo user already exists`).

### A.8 Caddy says `DNS problem: NXDOMAIN` on cert issuance

`$PUBLIC_HOST` doesn't resolve. Either:

- The DNS A record isn't pointing at this server's public IP
- You're using a subdomain that doesn't exist
- You're behind a CDN that requires DNS-01 challenge instead of
  HTTP-01; in that case set up the Caddy Cloudflare module or move
  to DNS-01 with a wildcard cert

For local-only or pre-DNS testing, replace `$PUBLIC_HOST` in the
Caddyfile with the server's public IP and switch to a self-signed
cert (`tls internal` directive). Browsers will warn; click through.

---

## Appendix B — Upgrading

```bash
set -euo pipefail
cd /home/spellpaw/Spellpaw
sudo -u spellpaw git pull
sudo -u spellpaw npm ci
sudo -u spellpaw bash -c 'cd server && npm ci'
sudo -u spellpaw npm run build
sudo -u spellpaw npm run db:push      # applies any new migrations
sudo systemctl restart spellpaw
sudo journalctl -u spellpaw -n 20 --no-pager   # confirm clean restart
```

## Appendix C — Backups

The only mutable state is the SQLite database. Back it up with
`sqlite3`'s `.backup` (safe while the server is running):

```bash
mkdir -p /var/backups/spellpaw
sqlite3 /home/spellpaw/Spellpaw/server/prisma/spellpaw.db \
  ".backup /var/backups/spellpaw/$(date +%Y%m%d-%H%M%S).db"
# Add this line to /etc/cron.d/spellpaw-backup for daily snapshots:
# 0 3 * * * root sqlite3 /home/spellpaw/Spellpaw/server/prisma/spellpaw.db ".backup /var/backups/spellpaw/$(date +\%Y\%m\%d-\%H\%M\%S).db"
```

## Appendix D — What this guide does NOT cover

- **Multi-user setup beyond the demo account.** Real users register
  via `POST /api/auth/register` (the demo user is auto-seeded; other
  users must register through the UI or directly in the DB).
- **PostgreSQL / MySQL.** Change the Prisma `datasource` provider
  and `DATABASE_URL`. No app code changes required.
- **Horizontal scaling.** The current architecture is single-process.
  The static frontend is CDN-friendly; the API + WebSocket are not.
  For multi-instance, put the API behind a sticky-session load
  balancer and move the database to PostgreSQL.
- **Custom domain email / SES.** Out of scope; users self-register.