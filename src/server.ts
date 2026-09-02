/**
 * Workshop web service. Not a production job system.
 *
 * Starter: POST waits for researchCompany inside the HTTP request.
 * After the tutorial edit: POST starts researchCompany and returns HTTP 202.
 */

import express from "express"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { ClientError, ServerError } from "@renderinc/sdk"
import {
  recordNewsProbe,
  ResearchStepFailed,
  type ResearchInput,
} from "./research/index.js"
import { handleRequestBound } from "./retry-in-request.js"
import {
  allowStart,
  isTaskRunId,
  parseResearchInput,
  publicMessage,
  renderClient,
  requireWorkshopToken,
  workflowSlug,
} from "./workshop.js"

const app = express()
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = join(root, "public")

app.use(express.json())
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store")
  next()
})

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true })
})

function sendIndex(res: express.Response): void {
  const css = readFileSync(join(publicDir, "styles.css"), "utf8")
  let html = readFileSync(join(publicDir, "index.html"), "utf8")
  html = html.replace(
    /<link\s+rel="stylesheet"\s+href="\/styles\.css[^"]*"\s*\/?>/,
    `<style>\n${css}\n</style>`,
  )
  if (process.env.SHOW_PUBLIC_HEADER === "true") {
    html = html.replace(' hidden="until-public"', "")
  }
  res.type("html").set("Cache-Control", "no-cache").send(html)
}

app.get("/", (_req, res) => sendIndex(res))
app.get("/index.html", (_req, res) => sendIndex(res))
app.use(
  express.static(publicDir, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".js") || filePath.endsWith(".html") || filePath.endsWith(".css")) {
        res.set("Cache-Control", "no-cache")
      }
    },
  }),
)

app.use("/api/research", requireWorkshopToken)
app.use("/api/workshop", requireWorkshopToken)

/** Used after the tutorial edit. Do not call this until POST is switched. */
export async function startWorkflowRun(input: ResearchInput) {
  const started = await renderClient().workflows.startTask(
    `${workflowSlug()}/researchCompany`,
    [input],
  )
  return {
    taskRunId: started.taskRunId,
    statusUrl: `/api/research/${started.taskRunId}`,
  }
}

app.get("/api/workshop/news-source/:jobId", (req, res) => {
  const jobId = String(req.params.jobId ?? "")
  if (!jobId) {
    res.status(400).json({ error: "jobId is required" })
    return
  }
  const status = recordNewsProbe(jobId)
  if (status === "unavailable") {
    res.status(503).json({ ok: false, reason: "fail-once" })
    return
  }
  res.status(200).json({ ok: true })
})

app.post("/api/research", async (req, res) => {
  const parsed = parseResearchInput(req.body ?? {})
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }
  if (!allowStart(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many start requests. Wait a minute and try once." })
    return
  }

  try {
    // TODO(workshop): replace the next two lines with:
    // const started = await startWorkflowRun(parsed)
    // res.status(202).json(started)
    const outcome = await handleRequestBound(parsed)
    res.json(outcome)
  } catch (err) {
    if (err instanceof ResearchStepFailed) {
      res.status(500).json({
        error: publicMessage(err),
        failedStep: err.failedStep,
        completedSteps: err.completedSteps,
        brief: null,
      })
      return
    }
    res.status(500).json({ error: publicMessage(err) })
  }
})

app.get("/api/research/:taskRunId", async (req, res) => {
  const taskRunId = String(req.params.taskRunId ?? "")
  if (!isTaskRunId(taskRunId)) {
    res.status(404).json({ error: "Run not found" })
    return
  }

  try {
    const details = await renderClient().workflows.getTaskRun(taskRunId)
    // SDK 1.0.0 TaskRunStatus.COMPLETED is deprecated. Terminal success is "succeeded".
    const body = {
      taskRunId: details.id,
      status: details.status,
      startedAt: details.startedAt ?? null,
      completedAt: details.completedAt ?? null,
      brief: details.status === "succeeded" ? (details.results?.[0] ?? null) : null,
      error: details.error ?? null,
      retries: details.retries,
      attempts: details.attempts ?? [],
    }
    res.status(200).json(body)
  } catch (err) {
    if (err instanceof ClientError && err.statusCode === 404) {
      res.status(404).json({ error: "Run not found" })
      return
    }
    const status = err instanceof ServerError ? 502 : 500
    res.status(status).json({ error: publicMessage(err) })
  }
})

const port = Number(process.env.PORT ?? "3000")
app.listen(port, "0.0.0.0", () => {
  console.log(`workshop app listening on ${port}`)
})
