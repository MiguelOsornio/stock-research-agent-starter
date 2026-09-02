import type { NextFunction, Request, Response } from "express"
import { randomUUID } from "node:crypto"
import { Render } from "@renderinc/sdk"
import { knownTickers, type ResearchInput } from "./research/index.js"

const startTimes = new Map<string, number[]>()

export function publicMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "Request failed"
  if (/api key|token|rnd_|authorization/i.test(message)) {
    return "The server could not complete that lookup."
  }
  return message
}

export function allowStart(ip: string): boolean {
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

export function requireWorkshopToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.WORKSHOP_TOKEN?.trim() ?? ""
  if (!expected) {
    next()
    return
  }
  const provided = String(req.get("x-workshop-token") ?? req.query.token ?? "")
  if (provided !== expected) {
    res.status(401).json({ error: "Workshop token required" })
    return
  }
  next()
}

export function workflowSlug(): string {
  const slug = process.env.WORKFLOW_SERVICE_SLUG?.trim()
  if (!slug) throw new Error("WORKFLOW_SERVICE_SLUG is required")
  return slug
}

export function renderClient(): Render {
  return new Render()
}

export function isTaskRunId(value: string): boolean {
  return /^trn-[a-zA-Z0-9_-]+$/.test(value)
}

export function parseResearchInput(body: {
  ticker?: unknown
  failNews?: unknown
}): ResearchInput | { error: string } {
  const ticker = String(body.ticker ?? "").trim().toUpperCase()
  if (!ticker) return { error: "ticker is required" }
  if (!knownTickers().includes(ticker)) {
    return { error: `Unknown ticker. Try one of: ${knownTickers().join(", ")}` }
  }
  return {
    ticker,
    jobId: `job-${randomUUID()}`,
    failNews: Boolean(body.failNews),
  }
}
