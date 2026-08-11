# Stock research agent (starter)

Educational demo: enter a ticker, get a mock research memo. Research runs **inside the HTTP request**.

For the tutorial that moves this onto Render Workflows, see the Render Tutorials site (`stock-research-with-workflows`).

## Who this is for

Absolute beginners are welcome. The TypeScript files under `src/` and the
setup script under `scripts/` include plain-English comments that explain
what each part does.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`. Mock tickers: `NVDA`, `AAPL`, `MSFT`.

`RESEARCH_DELAY_MS` (default `8000`) controls how long a run takes so you can close the browser mid-request.

## Deploy (workshop / fork)

### 1. Make your Blueprint names unique

After you fork, run the **Setup attendee Blueprint names** GitHub Action
(Actions tab → Run workflow), or locally:

```bash
npm install
npm run setup -- your-github-username
```

That rewrites `render.yaml` so the Render **project** is
`your-github-username-renderatl-workshop` (and the web service gets a username
prefix). Commit and push if you ran setup locally.

### 2. Deploy from the Render Dashboard or CLI

Deploy is **not** done from GitHub. In the [Dashboard](https://dashboard.render.com):
**New → Blueprint**, select your fork, leave the Blueprint path as `render.yaml`,
and Apply. That creates `{username}-renderatl-workshop` in your Render workspace.

## Key files

| File | What it is |
| --- | --- |
| `src/server.ts` | Web server: UI + `POST /api/research` |
| `src/research-stock.ts` | Mock research pipeline (kept the same in later tutorial steps) |
| `src/workflows.ts` | Placeholder; tutorial wraps research in a Workflow `task()` |
| `render.yaml` | Blueprint recipe for Render |
| `scripts/setup-attendee.js` | Renames Blueprint resources for your username |
| `.github/workflows/setup-attendee.yml` | One-click GitHub Action that runs the setup script |
