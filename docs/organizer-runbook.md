# Organizer runbook (not learner-facing)

Keep city names, workspace invites, credits, and unique service names out of the public tutorial.

## Before the event

1. Confirm the workshop workspace, billing, and attendee role can create a web service, a Workflow, and an API key.
2. Fork or pin [ojusave/stock-research-agent-starter](https://github.com/ojusave/stock-research-agent-starter) to a tested tag. Do not point attendees at a moving `main`.
3. Optional: set `MODEL_API_KEY` (and `MODEL_BASE_URL` / `MODEL_NAME` if not OpenAI) on a demo web service and Workflow so synthesis is model-driven.
4. Optional: set one `WORKSHOP_TOKEN` for the room and give it to attendees in the intro.
5. Rehearse concurrent Blueprint deploys and root runs at expected attendance.

## Workflow env for the retry exercise

On each attendee Workflow service, set:

```text
NEWS_FAIL_ENDPOINT=https://<their-web-service>.onrender.com/api/workshop/news-source
```

Copy the same `WORKSHOP_TOKEN` onto the Workflow if the web service uses one.

## After the event

Attendees delete both services and revoke the API key. Confirm the workspace has no leftover workshop services.
