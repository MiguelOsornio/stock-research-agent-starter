/**
 * research-stock.ts — mock research pipeline (several small steps).
 *
 * Reads sample data from data/mock-stocks.json (no live market API).
 * Steps sleep so a browser can be closed mid-run (~RESEARCH_DELAY_MS total).
 *
 * Starter: researchStock() is awaited inside the HTTP request.
 * Tutorial later: wrap these steps as Workflow tasks; ownership moves off the request.
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/** Shape of the JSON memo returned to the UI / API. */
export type ResearchMemo = {
  ticker: string
  company: string
  currentSignals: string[]
  potentialCatalysts: string[]
  keyRisks: string[]
  researchSummary: string
}

/** One row in data/mock-stocks.json. */
type MockStock = {
  company: string
  signals: string[]
  catalysts: string[]
  risks: string[]
}

/**
 * Steps shown by the live tracker in the UI.
 * Labels stay aligned with public/tracker.js STEPS.
 */
export const RESEARCH_STEPS = [
  "Load company facts",
  "Collect signals",
  "Identify catalysts",
  "Identify risks",
  "Write memo",
] as const

// Load mock data once when this module is imported.
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const mockPath = join(root, "data", "mock-stocks.json")
const mockStocks = JSON.parse(readFileSync(mockPath, "utf8")) as Record<
  string,
  MockStock
>

/** Pause for `ms` milliseconds (used to fake slow research). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * How long the whole pipeline should take.
 * Set RESEARCH_DELAY_MS in the environment (default 8000 = 8 seconds).
 */
function researchDelayMs(): number {
  const delayMs = Number(process.env.RESEARCH_DELAY_MS ?? "8000")
  return Number.isFinite(delayMs) ? delayMs : 8000
}

/**
 * How long each step sleeps.
 * Total time stays about RESEARCH_DELAY_MS so the close-tab demo still works.
 */
function stepDelayMs(): number {
  // 1 sequential load + 1 parallel wave + 1 write = 3 waves of waiting
  return Math.max(1, Math.floor(researchDelayMs() / 3))
}

/** Find a mock row or throw a friendly error listing valid tickers. */
function getMockRow(tickerInput: string): { ticker: string; row: MockStock } {
  const ticker = tickerInput.trim().toUpperCase()
  const row = mockStocks[ticker]

  if (!row) {
    const known = Object.keys(mockStocks).join(", ")
    throw new Error(`Unknown ticker "${ticker}". Try one of: ${known}`)
  }

  return { ticker, row }
}

/** Company name from the mock dataset (fake “facts” lookup). */
export async function loadCompanyFacts(
  ticker: string,
): Promise<{ ticker: string; company: string }> {
  const { ticker: normalized, row } = getMockRow(ticker)
  await sleep(stepDelayMs())
  return { ticker: normalized, company: row.company }
}

/** Mock bullish / mixed signals for the ticker. */
export async function collectSignals(ticker: string): Promise<string[]> {
  const { row } = getMockRow(ticker)
  await sleep(stepDelayMs())
  return [...row.signals]
}

/** Mock upcoming catalysts. */
export async function identifyCatalysts(ticker: string): Promise<string[]> {
  const { row } = getMockRow(ticker)
  await sleep(stepDelayMs())
  return [...row.catalysts]
}

/** Mock key risks. */
export async function identifyRisks(ticker: string): Promise<string[]> {
  const { row } = getMockRow(ticker)
  await sleep(stepDelayMs())
  return [...row.risks]
}

/**
 * Combine step outputs into the memo the UI prints.
 */
export async function writeMemo(input: {
  ticker: string
  company: string
  currentSignals: string[]
  potentialCatalysts: string[]
  keyRisks: string[]
}): Promise<ResearchMemo> {
  await sleep(stepDelayMs())

  const researchSummary = [
    `${input.company} (${input.ticker}) shows mixed but actionable mock signals.`,
    `Watch catalysts around ${input.potentialCatalysts[0]?.toLowerCase() ?? "the next event"}.`,
    `Primary risks center on ${input.keyRisks[0]?.toLowerCase() ?? "execution"}.`,
  ].join(" ")

  return {
    ticker: input.ticker,
    company: input.company,
    currentSignals: [...input.currentSignals],
    potentialCatalysts: [...input.potentialCatalysts],
    keyRisks: [...input.keyRisks],
    researchSummary,
  }
}

/**
 * Run the full mock pipeline for one ticker.
 *
 * STARTER: still called with `await` inside POST /api/research.
 * Later tutorial: same function body, but each step becomes a Workflow task.
 */
export async function researchStock(tickerInput: string): Promise<ResearchMemo> {
  const facts = await loadCompanyFacts(tickerInput)

  // Independent steps run together.
  const [currentSignals, potentialCatalysts, keyRisks] = await Promise.all([
    collectSignals(facts.ticker),
    identifyCatalysts(facts.ticker),
    identifyRisks(facts.ticker),
  ])

  return writeMemo({
    ticker: facts.ticker,
    company: facts.company,
    currentSignals,
    potentialCatalysts,
    keyRisks,
  })
}
