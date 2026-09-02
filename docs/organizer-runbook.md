# Organizer runbook (not learner-facing)

Keep city names, workspace invites, credits, intake forms, and unique service names out of the public tutorial.

## Before the event

1. Confirm the workshop workspace, billing, and attendee role can create a web service, a Workflow, and an API key.
2. Pin [ojusave/stock-research-agent-starter](https://github.com/ojusave/stock-research-agent-starter) to a tested tag. Do not point attendees at a moving `main`.
3. Optional: set `MODEL_API_KEY` (and `MODEL_BASE_URL` / `MODEL_NAME` if not OpenAI) on a demo web service and Workflow so synthesis is model-driven.
4. Optional: set one `WORKSHOP_TOKEN` for the room and give it to attendees in the intro.
5. Rehearse concurrent Blueprint deploys and root runs at expected attendance.

## Workflow env for the retry exercise

On each attendee Workflow service, set:

```text
RENDER_WORKFLOW=1
RESEARCH_DELAY_MS=4000
NEWS_FAIL_ENDPOINT=https://<their-web-service>.onrender.com/api/workshop/news-source
```

`RENDER_WORKFLOW=1` is the attendee-facing switch. Task instances also see `RENDER_SDK_SOCKET_PATH`; fail-once never falls back to in-memory state in either case.

Copy the same `WORKSHOP_TOKEN` onto the Workflow if the web service uses one.

A web service restart clears in-memory fail-once state on the news probe endpoint. If a retry demo never succeeds, check whether the web service redeployed mid-exercise.

## Fallback branch

If a fork or push breaks, deploy the `completed` branch. It already has the Way 2 POST swap (`startWorkflowRun` + HTTP 202). Do not put this branch in the learner tutorial.

## After the event

Attendees delete both services and revoke the API key. Confirm the workspace has no leftover workshop services.
