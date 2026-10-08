# PM2 + GitHub Actions CI Demo

Zero-dependency Node.js HTTP JSON API (built-in `node:http` only) used to demonstrate PM2 process management and a basic GitHub Actions CI pipeline. The app runs both as a standalone process (PM2 / `node app.js`) and as a testable module (tests require the server and listen on an ephemeral port).

## Run locally

```bash
node app.js                 # start on PORT (default 3000), e.g. $env:PORT='3404'; node app.js
node --watch app.js         # dev mode: auto-restart on file changes (npm run dev)
npm test                    # run the test suite (node --test) - no installs needed
```

Note: nodemon is intentionally not used in this lab; Node's built-in `--watch` flag replaces it, so there is no extra dependency to install.

## Endpoints

| Method | Path                 | Description                                              | Status codes |
| ------ | -------------------- | -------------------------------------------------------- | ------------ |
| GET    | `/`                  | API index listing the available routes                   | 200          |
| GET    | `/health`            | Health check: `{status, uptime, timestamp}`               | 200          |
| GET    | `/api/products`      | List of 6 in-memory products (id, name, price)           | 200          |
| GET    | `/api/products/:id`  | Single product by id                                     | 200, 404     |
| GET    | `/api/crash`         | Deliberate crash for the PM2 demo (logs, then `process.exit(1)`) | process exits (1) |
| any    | anything else        | JSON 404 `{status:'error', message:'Route not found: <METHOD> <url>'}` | 404 |

## PM2 (process management)

```bash
npm install -g pm2

pm2 start app.js --name "my-api"    # start the app under PM2
pm2 start ecosystem.config.cjs      # equivalent: start from the PM2 config file
pm2 ls                              # list all managed processes and restart counters
pm2 logs my-api                     # tail the app logs
pm2 restart my-api                  # restart the process
pm2 stop my-api                     # stop the process
pm2 delete my-api                    # remove the process from PM2's list
pm2 save                             # snapshot the current process list
pm2 startup                         # generate the OS startup command (resurrect after reboot)
pm2 monit                            # live CPU / memory monitoring dashboard
```

`ecosystem.config.cjs` defines the same app as `pm2 start app.js --name "my-api"` (fork mode, 1 instance, autorestart, 300M memory cap, logs under `./logs/`), plus `NODE_ENV=production` and `PORT`.

## Crash-restart demo

1. `pm2 start app.js --name "my-api"` (or `pm2 start ecosystem.config.cjs`).
2. Confirm it is up: `pm2 ls` shows `my-api` as `online` with restarts `0`.
3. Trigger the deliberate crash: open `http://localhost:3000/api/crash` in a browser or run `curl http://localhost:3000/api/crash`.
4. Watch `pm2 logs my-api`: you will see the error line `deliberate crash requested ... exiting with code 1` followed by PM2's automatic restart of the app.
5. Run `pm2 ls` again: status is `online` and the restarts counter has incremented - PM2 brought the process back with no manual action.

## GitHub Actions CI

- File: `.github/workflows/node.yml`
- Trigger: every push to the `main` branch (`on: push: branches: [ main ]`).
- Steps:
  1. Checkout Code (`actions/checkout@v4`) - pulls the repository contents.
  2. Use Node.js (`actions/setup-node@v4`, node `20`) - provisions the runtime.
  3. Install Dependencies (`npm install`) - instant, because the project has zero dependencies.
  4. Run Tests (`npm test`) - executes `node --test`; a failing test fails the job.
- Watch runs on GitHub under the **Actions** tab of the repository, inside the "Node CI" workflow.
- Break it on purpose: in `test/app.test.js` change the expected product count from `6` to `7`, push to `main`, and observe the red X on the workflow run; then revert the change and push again to see it go green.

Note on versions: the assignment text uses `actions/checkout@v3`, `actions/setup-node@v3` and Node `18`. Those v3 actions run on deprecated runners, so this solution uses `actions/checkout@v4`, `actions/setup-node@v4` and Node `20` while keeping the workflow name, step names and trigger exactly as given in the problem.

## PM2 vs node --watch

| | PM2 | `node --watch` |
| --- | --- | --- |
| Role | Production process manager | Local development auto-reload |
| Restarts | Auto-restart on crash, `max_memory_restart`, resurrect on reboot (`pm2 save` + `pm2 startup`) | Restarts the process whenever a file changes |
| Modes | Fork and cluster (multiple instances), load balancing | Single process |
| Logging | Rotated log files (`logs/`), `pm2 logs`, `pm2 monit` | Output straight to the terminal |
| Install | Global (`npm install -g pm2`) | Built into Node.js, nothing to install |
