# Stock research with Workflows (workshop starter)

Workshop sample: the same five-step research pipeline runs inside one HTTP request, then as a Render Workflow. Pin: `@renderinc/sdk@1.0.0`.

This is not a production job system. The start endpoint is throttled and, if `WORKSHOP_TOKEN` is set, token-gated. Do not put `RENDER_API_KEY` in the browser, screenshots, or git.

## Highlights

- Researching one ticker is four parallel analyses (financials, filings, news, peers) plus one synthesis step.
- Inside one HTTP request, a failed news analysis discards the three analyses that already finished.
- Retrying that request reruns every analysis, including the ones that worked.
- As a Workflow, only the failed news task retries. Finished siblings are not touched. The run has an ID from the moment it starts.
- Same analysis functions in both paths. Only the orchestration changes.

## Usage

1. Open the app and start `NVDA`.
2. Watch the step panel fill in over about 10 seconds, then read the cited brief.
3. Check **Fail the news source once** to watch three steps finish and then get discarded.
4. Check **Retry inside the request** to see those three analyses run again.

After the tutorial edit, `POST /api/research` returns HTTP 202 and a `taskRunId`. Each step is a task run you can open in the Dashboard.

## Configuration

See `.env.example`. Blueprint creation prompts for `RENDER_API_KEY` and `WORKFLOW_SERVICE_SLUG`; leave both blank for the first deploy.

## Deploy

In the [Render Dashboard](https://dashboard.render.com): **New → Blueprint**, select your fork, leave the path as `render.yaml`.

This Blueprint creates the web service only. It does not create a Workflow.

If the service name is already taken, change `name` in `render.yaml` to `stock-research-web-<github-username>` before you deploy.

## Local checks

```bash
npm ci
npm run build
npm test
npm start
```

## Cleanup

Delete the web service and any Workflow you created. Revoke the API key used by the web service.
