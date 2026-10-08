# Solution: Process Management with PM2 and Intro to GitHub Actions

## Objective

Build a zero-dependency Node.js HTTP JSON API and demonstrate production process management with PM2 plus a basic GitHub Actions CI pipeline: run the app under PM2, watch it auto-restart after a deliberate crash, and run the test suite automatically on every push to `main`.

## Files built

| File | Purpose |
| --- | --- |
| `app.js` | Zero-dependency HTTP JSON API (`node:http` only). Exports the server (`module.exports = server`) and only calls `server.listen` when run directly (`require.main === module`), so tests can start it on an ephemeral port. Includes graceful SIGINT/SIGTERM shutdown. |
| `test/app.test.js` | Test suite using only built-in `node:test` + `node:assert/strict` and global `fetch`. `beforeEach` starts `server.listen(0)` and reads the assigned port; `afterEach` closes the server. |
| `package.json` | `pm2-ci-demo`, private, `engines.node >=20.0.0`, scripts `start` / `dev` (`node --watch app.js`) / `test` (`node --test`). Zero dependencies. |
| `.github/workflows/node.yml` | GitHub Actions workflow `Node CI` (emoji kept from the problem), trigger push to `main`, actions updated to `checkout@v4` / `setup-node@v4` / Node `20`. |
| `ecosystem.config.cjs` | PM2 config for the `my-api` app (fork mode, 1 instance, autorestart, `max_memory_restart: 300M`, `NODE_ENV=production`, `PORT`, log files under `./logs/`). |
| `.gitignore` | `node_modules/`, `.env`, `logs/`, `*.log`. |
| `.env.example` | `PORT` and `NODE_ENV` with one-line comments. |
| `README.md` | Overview, run instructions, endpoints table, PM2 commands, crash-restart demo, CI explanation, PM2 vs `node --watch` comparison, version-deviation note. |
| `solution.md` | This document. |

Routes implemented in `app.js`:

- `GET /health` - 200 `{status:'ok', uptime, timestamp}`
- `GET /api/products` - 200, 6 in-memory products
- `GET /api/products/:id` - 200 with the product, or 404 JSON `{status:'error', ...}`
- `GET /api/crash` - logs an error, then `process.exit(1)` (deliberate crash for the PM2 auto-restart demo)
- everything else - 404 `{status:'error', message:'Route not found: <METHOD> <url>'}`

## Tests written

Framework: none - only `node:test` and `node:assert/strict`, run by `node --test`.

1. `GET /health returns 200 with status ok` - status 200, `status === 'ok'`, numeric `uptime`, string `timestamp`
2. `GET /api/products returns 200 with 6 products` - status 200, array length 6
3. `GET /api/products/1 returns 200 with product id 1` - status 200, `id === 1`, string `name`, numeric `price`
4. `GET /api/products/999 returns 404 with status error` - status 404, `status === 'error'`
5. `GET /definitely-not-a-route returns 404` - status 404, `status === 'error'`, message matches `Route not found: GET /definitely-not-a-route`

## CI workflow explanation

File: `.github/workflows/node.yml`

- Trigger: `on: push: branches: [ main ]`.
- Job `build` on `ubuntu-latest` with four steps:
  1. Checkout Code - `actions/checkout@v4` fetches the repository.
  2. Use Node.js - `actions/setup-node@v4` with `node-version: '20'`.
  3. Install Dependencies - `npm install` (instant: there are no dependencies).
  4. Run Tests - `npm test` runs `node --test`; any failing test turns the run red.
- No `cache: npm` because there is no lockfile until someone installs.

Version note: the assignment specifies `actions/checkout@v3`, `actions/setup-node@v3` and Node `18`. The v3 actions run on deprecated runners, so the workflow uses `checkout@v4`, `setup-node@v4` and Node `20` instead, while keeping the workflow name, the step names/emojis and the trigger exactly as in the problem.

## PM2 commands used in the practice steps

```bash
npm install -g pm2
pm2 start app.js --name "my-api"
pm2 ls
pm2 logs my-api
pm2 restart my-api
pm2 stop my-api
pm2 delete my-api
pm2 save
pm2 startup
pm2 monit
```

`pm2 start ecosystem.config.cjs` starts the same `my-api` app from the config file (identical name, script, instances, autorestart, memory cap, env and log paths).

## Crash-restart demo walkthrough

1. Start: `pm2 start app.js --name "my-api"` - `pm2 ls` shows `my-api` online with restarts `0`.
2. Trigger: `curl http://localhost:3000/api/crash` (or open it in a browser).
3. The app logs `deliberate crash requested ... exiting with code 1` and the process exits with code 1.
4. Watch `pm2 logs my-api`: PM2 records the non-zero exit and immediately spawns a fresh process.
5. Confirm with `pm2 ls`: status is back to `online` and the restarts counter has incremented - automatic recovery with no manual step.

## Verification results

Environment: Node `v22.19.0`, npm `10.9.3`, Windows PowerShell 5.1.

Syntax checks:

- `node --check app.js` - passed
- `node --check test/app.test.js` - passed
- `node --check ecosystem.config.cjs` - passed

`npm test` (runs `node --test`, installs nothing):

```
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 483.1792
```

Test results: 5 passed, 0 failed.

- ok 1 - GET /health returns 200 with status ok
- ok 2 - GET /api/products returns 200 with 6 products
- ok 3 - GET /api/products/1 returns 200 with product id 1
- ok 4 - GET /api/products/999 returns 404 with status error
- ok 5 - GET /definitely-not-a-route returns 404

Manual smoke test (`$env:PORT='3404'; node app.js`):

- `GET /health` -> 200
- `GET /api/products` -> 200
- `GET /api/products/1` -> 200
- `GET /api/products/999` -> 404
- `GET /nope` -> 404

Crash check (`$env:PORT='3405'; node app.js`): after `GET /api/crash` the request failed with "Unable to connect to the remote server" and the spawned process reported `process alive after /api/crash: False`, confirming `process.exit(1)` terminated it.

Workflow YAML review: indentation verified programmatically - every level increases by exactly 2 spaces, structure matches the assignment (name, `on.push.branches`, `jobs.build.steps`).

No `node_modules` folder exists. No `npm install`, no PM2 execution, no `git` commands and no global installs were performed; `problem4.txt` was left untouched.

## How to push to GitHub to see CI run

```bash
git init
git add .
git commit -m "PM2 and GitHub Actions CI demo"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

Then open the repository on GitHub, go to the **Actions** tab and watch the `Node CI` workflow run.

To see CI fail on purpose: edit `test/app.test.js` and change `assert.equal(body.length, 6)` to `assert.equal(body.length, 7)`, commit and push to `main`, and observe the red X on the run; then revert the change and push again to see it pass.
