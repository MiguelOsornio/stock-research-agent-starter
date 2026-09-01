/**
 * Workshop web service. Not a production job system.
 *
 * Starter: POST waits for the mock pipeline inside the HTTP request.
 * After the tutorial edit: POST starts researchStock and returns HTTP 202.
 */

import express from "express"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { ClientError, Render, ServerError } from "@renderinc/sdk"
import { researchStock } from "./research-stock.js"

const app = express()
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = join(root, "public")
const startTimes = new Map<string, number[]>()

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

function publicMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "Request failed"
  if (/api key|token|rnd_|authorization/i.test(message)) {
    return "The server could not complete that lookup."
  }
  return message
}

function allowStart(ip: string): boolean {
  const now = Date.now()
  const recent = (startTimes.get(ip) ?? []).filter((time) => now - time < 60_000)
  if (recent.length >= 10) {
    startTimes.set(ip, recent)
    return false
  }
  recent.push(now)
  startTimes.set(ip, recent)
  return true
}

function workflowSlug(): string {
  const slug = process.env.WORKFLOW_SERVICE_SLUG?.trim()
  if (!slug) throw new Error("WORKFLOW_SERVICE_SLUG is required")
  return slug
}

function renderClient(): Render {
  return new Render()
}

function isTaskRunId(value: string): boolean {
  return /^trn-[a-zA-Z0-9_-]+$/.test(value)
}

/** Used after the tutorial edit. Do not call this until POST is switched. */
export async function startWorkflowRun(ticker: string) {
  const started = await renderClient().workflows.startTask(
    `${workflowSlug()}/researchStock`,
    [ticker],
  )
  return {
    taskRunId: started.taskRunId,
    statusUrl: `/api/research/${started.taskRunId}`,
  }
}

app.post("/api/research", async (req, res) => {
  const ticker = String(req.body?.ticker ?? "").trim()
  if (!ticker) {
    res.status(400).json({ error: "ticker is required" })
    return
  }
  if (!allowStart(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many start requests. Wait a minute and try once." })
    return
  }

  try {
    // TODO(workshop): replace the next two lines with:
    // const started = await startWorkflowRun(ticker)
    // res.status(202).json(started)
    const memo = await researchStock(ticker)
    res.json(memo)
  } catch (err) {
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
    const body = {
      taskRunId: details.id,
      status: details.status,
      startedAt: details.startedAt ?? null,
      completedAt: details.completedAt ?? null,
      memo:
        details.status === "completed" || details.status === "succeeded"
          ? (details.results?.[0] ?? null)
          : null,
      error: details.error ?? null,
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
