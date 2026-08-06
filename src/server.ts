import express from "express"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { researchStock } from "./research-stock.js"

const app = express()
const root = join(dirname(fileURLToPath(import.meta.url)), "..")

app.use(express.json())
app.use(express.static(join(root, "public")))

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true })
})

/**
 * Runs research inside the HTTP request (starter behavior).
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

const port = Number(process.env.PORT ?? "3000")
app.listen(port, "0.0.0.0", () => {
  console.log(`stock-research starter listening on ${port}`)
})
