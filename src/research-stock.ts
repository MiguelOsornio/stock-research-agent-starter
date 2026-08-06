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

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const mockPath = join(root, "data", "mock-stocks.json")
const mockStocks = JSON.parse(readFileSync(mockPath, "utf8")) as Record<
  string,
  MockStock
>

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Runs the mock stock-research pipeline for one ticker.
 */
export async function researchStock(tickerInput: string): Promise<ResearchMemo> {
  const ticker = tickerInput.trim().toUpperCase()
  const row = mockStocks[ticker]

  if (!row) {
    const known = Object.keys(mockStocks).join(", ")
    throw new Error(`Unknown ticker "${ticker}". Try one of: ${known}`)
  }

  // Artificial delay so learners can close the browser mid-run.
  const delayMs = Number(process.env.RESEARCH_DELAY_MS ?? "8000")
  await sleep(Number.isFinite(delayMs) ? delayMs : 8000)

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
