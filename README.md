# Stock research with Workflows (workshop starter)

Workshop sample: a small web app that runs a multi-step mock job from ticker symbols. No model API.

Pinned SDK: `@renderinc/sdk@1.0.0`.

The first deploy waits for the job inside one HTTP request. The tutorial then switches `POST /api/research` to start a Render Workflow task and return a task-run ID.

`RESEARCH_DELAY_MS` defaults to `20000` and applies to both the request-bound path and the Workflow leaf tasks, so the close-tab exercise has time to land.

## Run locally

```bash
npm ci
npm run build
npm start
```

Open `http://localhost:3000`. Sample tickers: `NVDA`, `AAPL`, `MSFT`.

## Deploy

In the [Render Dashboard](https://dashboard.render.com): **New → Blueprint**, select your fork, leave the path as `render.yaml`.

This Blueprint creates the web service only. It does not create a Workflow.

If the service name is already taken in the workspace, change `name` in `render.yaml` before you deploy.

## Cleanup

Delete the web service and any Workflow you created. Revoke the API key used by the web service.
