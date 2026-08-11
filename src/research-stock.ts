/**
 * =============================================================================
 * research-stock.ts  — the mock research pipeline
 * =============================================================================
 * FOR BEGINNERS
 * -------------
 * This is the "brain" of the demo. It does NOT call a real stock API.
 * It reads sample data from data/mock-stocks.json and builds a short memo.
 *
 * The function deliberately waits a few seconds (RESEARCH_DELAY_MS) so you
 * have time to close the browser mid-run in the tutorial.
 *
 * Important: later tutorial steps keep THIS function the same. What changes
 * is WHO owns the run (the HTTP request vs a Render Workflow task).
 * =============================================================================
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
 * Order matters: the delay is split evenly across these stages.
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
 * Run mock research for one ticker (for example "NVDA").
 * Throws if the ticker is not in the sample dataset.
 */
export async function researchStock(tickerInput: string): Promise<ResearchMemo> {
  const ticker = tickerInput.trim().toUpperCase()
  const row = mockStocks[ticker]

  if (!row) {
    const known = Object.keys(mockStocks).join(", ")
    throw new Error(`Unknown ticker "${ticker}". Try one of: ${known}`)
  }

  // Wait in small slices so the live tracker can advance stage by stage.
  const sliceMs = Math.max(1, Math.floor(researchDelayMs() / RESEARCH_STEPS.length))
  for (let i = 0; i < RESEARCH_STEPS.length; i += 1) {
    await sleep(sliceMs)
  }

  const currentSignals = [...row.signals]
  const potentialCatalysts = [...row.catalysts]
  const keyRisks = [...row.risks]

  const researchSummary = [
    `${row.company} (${ticker}) shows mixed but actionable mock signals.`,
    `Watch catalysts around ${potentialCatalysts[0]?.toLowerCase() ?? "the next event"}.`,
    `Primary risks center on ${keyRisks[0]?.toLowerCase() ?? "execution"}.`,
  ].join(" ")

  return {
    ticker,
    company: row.company,
    currentSignals,
    potentialCatalysts,
    keyRisks,
    researchSummary,
  }
}
