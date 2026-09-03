/**
 * server.ts — Express entry point.
 *
 * Serves `public/` and handles POST /api/research.
 * Research runs inside the HTTP request (starter behavior): closing the
 * browser mid-run leaves nothing to recover. The tutorial later moves
 * ownership off the request onto Workflow tasks.
 */

import express from "express"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { researchStock } from "./research-stock.js"

const app = express()

// Absolute path to the repo root (one level above `src/`).
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = join(root, "public")

// Parse JSON bodies like: { "ticker": "NVDA" }
app.use(express.json())

// Status polling must not be cached (browsers otherwise get 304 + empty body).
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store")
  next()
})

/**
 * Health check for Render (and for you).
 * Registered early so platform probes never wait on static I/O.
 * Open /healthz — you should see { "ok": true }.
 */
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true })
})

/**
 * Build the homepage with CSS inlined.
 * One successful HTML response is enough for a styled UI even when a
 * separate /styles.css request would have failed at the edge.
 */
function sendIndex(res: express.Response): void {
  const css = readFileSync(join(publicDir, "styles.css"), "utf8")
  let html = readFileSync(join(publicDir, "index.html"), "utf8")
  html = html.replace(
    /<link\s+rel="stylesheet"\s+href="\/styles\.css[^"]*"\s*\/?>/,
    `<style>\n${css}\n</style>`,
  )
  // Single JS module: avoids a second flaky fetch for ./tracker.js
  html = html.replace(
    /<script\s+src="\/app\.js[^"]*"\s+type="module"><\/script>/,
    `<script src="/client.js" type="module"></script>`,
  )
  res.type("html").set("Cache-Control", "no-cache").send(html)
}

/**
 * Concatenate tracker + app into one module so the browser makes one JS request.
 * Source files in public/ stay separate for the tutorial.
 */
function sendClientBundle(res: express.Response): void {
  const tracker = readFileSync(join(publicDir, "tracker.js"), "utf8")
    .replace(/\bexport\s+const\b/g, "const")
    .replace(/\bexport\s+function\b/g, "function")
  const appJs = readFileSync(join(publicDir, "app.js"), "utf8").replace(
    /import\s*\{[^}]*\}\s*from\s*["']\.\/tracker\.js["']\s*;?\s*/,
    "",
  )
  res
    .type("js")
    .set("Cache-Control", "no-cache")
    .send(`${tracker}\n${appJs}`)
}

app.get("/", (_req, res) => sendIndex(res))
app.get("/index.html", (_req, res) => sendIndex(res))
app.get("/client.js", (_req, res) => sendClientBundle(res))

// Keep UI assets fresh after deploys. index: false so / uses sendIndex above.
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
