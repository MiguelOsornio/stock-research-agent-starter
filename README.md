# Stock research with Workflows (workshop starter)

Workshop sample: a public web app that analyzes dated financial, filing, news, and peer packets, then writes one cited brief. Pin: `@renderinc/sdk@1.0.0`.

This is not a production job system. The start endpoint is throttled and, if `WORKSHOP_TOKEN` is set, token-gated. Do not put `RENDER_API_KEY` in the browser, screenshots, or git.

## Highlights

- Four source analyses share the same functions in the request-bound path and the Workflow graph.
- `analyzeNews` can fail once per job ID so you can inspect a retry without repeating successful siblings.
- Synthesis uses an OpenAI-compatible model when `MODEL_API_KEY` is set. Otherwise it assembles the cited brief from the four analyses.
- Source packets are dated **2026-08-15** and live in `data/packets/`. They are workshop cache, not live market data.

## Usage

1. Open the app and start `NVDA`, `AAPL`, or `MSFT`.
2. Keep the tab open until the cited brief appears. The first deploy has no task-run ID.
3. Check **Fail the news source once** to watch the HTTP request fail after the other analyses complete.

After the tutorial edit, `POST /api/research` returns HTTP 202 and a `taskRunId`. The same browser profile can reopen that run.

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `MODEL_API_KEY` | Web and Workflow | Optional. Enables model-driven synthesis. |
| `MODEL_BASE_URL` | Web and Workflow | OpenAI-compatible base URL. Default `https://api.openai.com/v1`. |
| `MODEL_NAME` | Web and Workflow | Default `gpt-4o-mini`. |
| `WORKSHOP_TOKEN` | Web and Workflow | Optional. If set, `/api/research` and the news probe require `x-workshop-token`. |
| `WORKFLOW_SERVICE_SLUG` | Web | Set after you create the Workflow. |
| `RENDER_API_KEY` | Web | Server-side only. Used to start and look up task runs. |
| `NEWS_FAIL_ENDPOINT` | Workflow | `{web-service-url}/api/workshop/news-source` so news retries share fail-once state. |

## Deploy

In the [Render Dashboard](https://dashboard.render.com): **New → Blueprint**, select your fork, leave the path as `render.yaml`.

This Blueprint creates the web service only. It does not create a Workflow. You can leave `MODEL_API_KEY` and `WORKSHOP_TOKEN` empty for the first deploy.

If the service name is already taken, change `name` in `render.yaml` before you deploy.

## Local checks

```bash
npm ci
npm run build
npm test
npm start
```

## Cleanup

Delete the web service and any Workflow you created. Revoke the API key used by the web service.
