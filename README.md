# Stock research agent (starter)

Educational demo: enter a ticker, get a mock research memo. Research runs **inside the HTTP request**.

For the tutorial that moves this onto Render Workflows, see the Render Tutorials site (`stock-research-with-workflows`).

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000`. Mock tickers: `NVDA`, `AAPL`, `MSFT`.

`RESEARCH_DELAY_MS` (default `8000`) controls how long a run takes so you can close the browser mid-request.

## Deploy

### 1. Namespace your fork (attendees)

After you fork, run the **Setup attendee Blueprint names** GitHub Action
(`workflow_dispatch`), or locally:

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
