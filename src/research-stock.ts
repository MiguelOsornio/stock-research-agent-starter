import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export type ResearchMemo = {
  ticker: string
  company: string
  currentSignals: string[]
  potentialCatalysts: string[]
  keyRisks: string[]
  researchSummary: string
}

type MockStock = {
  company: string
  signals: string[]
  catalysts: string[]
  risks: string[]
}

/** Pipeline stages shown by the live tracker (order matters). */
export const RESEARCH_STEPS = [
  "Load company facts",
  "Collect signals",
  "Identify catalysts",
  "Identify risks",
  "Write memo",
] as const

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const mockPath = join(root, "data", "mock-stocks.json")
const mockStocks = JSON.parse(readFileSync(mockPath, "utf8")) as Record<
  string,
  MockStock
>

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function researchDelayMs(): number {
  const delayMs = Number(process.env.RESEARCH_DELAY_MS ?? "8000")
  return Number.isFinite(delayMs) ? delayMs : 8000
}

/**
 * Runs the mock stock-research pipeline for one ticker.
 * Work is staged so wall-clock progress matches the live tracker steps.
 */
export async function researchStock(tickerInput: string): Promise<ResearchMemo> {
  const ticker = tickerInput.trim().toUpperCase()
  const row = mockStocks[ticker]

  if (!row) {
    const known = Object.keys(mockStocks).join(", ")
    throw new Error(`Unknown ticker "${ticker}". Try one of: ${known}`)
  }

  // Artificial per-stage delay so learners can close the browser mid-run.
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
