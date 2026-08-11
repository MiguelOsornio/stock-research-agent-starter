/**
 * server.ts — Express entry point.
 *
 * Serves `public/` and handles POST /api/research.
 * Research runs inside the HTTP request (starter behavior): closing the
 * browser mid-run leaves nothing to recover. The tutorial later moves
 * that work to a Workflow task with a task-run ID.
 */

import express from "express"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { researchStock } from "./research-stock.js"

const app = express()

// Absolute path to the repo root (one level above `src/`).
const root = join(dirname(fileURLToPath(import.meta.url)), "..")

// Parse JSON bodies like: { "ticker": "NVDA" }
app.use(express.json())

// Serve index.html, app.js, CSS, etc. from /public
app.use(express.static(join(root, "public")))

/**
 * Health check for Render (and for you).
 * Open /healthz — you should see { "ok": true }.
 */
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true })
})

/**
 * Start research for one ticker.
 *
 * STARTER BEHAVIOR: we `await researchStock(...)` here.
 * The HTTP request stays open until the memo is ready.
 * Close the tab early → the browser loses the result (no task-run ID yet).
 */
app.post("/api/research", async (req, res) => {
  const ticker = String(req.body?.ticker ?? "").trim()
  if (!ticker) {
    res.status(400).json({ error: "ticker is required" })
    return
  }

  try {
    const memo = await researchStock(ticker)
    res.json(memo)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed"
    res.status(400).json({ error: message })
  }
})

// Render sets PORT for you. Locally we default to 3000.
// Bind to 0.0.0.0 so Render can reach the process.
const port = Number(process.env.PORT ?? "3000")
app.listen(port, "0.0.0.0", () => {
  console.log(`stock-research starter listening on ${port}`)
})
