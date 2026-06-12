// Spellpaw PM2 Ecosystem Configuration
module.exports = {
  apps: [
    {
      name: 'spellpaw-server',
      cwd: '/root/Spellpaw/server',
      script: 'npx',
      args: 'tsx src/index.ts',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'spellpaw-frontend',
      cwd: '/root/Spellpaw',
      script: 'npx',
      args: 'vite --host 0.0.0.0 --port 5173 --mode development',
      env: {
        // Must NOT be "production" — Vite uses NODE_ENV to determine mode,
        // and production mode disables React Fast Refresh preamble while
        // still injecting $RefreshReg$ calls, causing ReferenceError.
        NODE_ENV: 'development',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
