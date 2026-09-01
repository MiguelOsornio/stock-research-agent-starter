/**
 * Mock multi-step job used as the sample workload.
 * No model API. Data comes from data/mock-stocks.json.
 *
 * RESEARCH_DELAY_MS (default 20000) is split across three wait waves
 * so the close-tab exercise has time to land.
 */

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
const mockStocks = JSON.parse(
  readFileSync(join(root, "data", "mock-stocks.json"), "utf8"),
) as Record<string, MockStock>

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function researchDelayMs(): number {
  const delayMs = Number(process.env.RESEARCH_DELAY_MS ?? "20000")
  return Number.isFinite(delayMs) ? delayMs : 20000
}

function stepDelayMs(): number {
  return Math.max(1, Math.floor(researchDelayMs() / 3))
}

function getMockRow(tickerInput: string): { ticker: string; row: MockStock } {
  const ticker = tickerInput.trim().toUpperCase()
  const row = mockStocks[ticker]
  if (!row) {
    const known = Object.keys(mockStocks).join(", ")
    throw new Error(`Unknown ticker "${ticker}". Try one of: ${known}`)
  }
  return { ticker, row }
}

export async function loadCompanyFacts(
  ticker: string,
): Promise<{ ticker: string; company: string }> {
  const { ticker: normalized, row } = getMockRow(ticker)
  await sleep(stepDelayMs())
  return { ticker: normalized, company: row.company }
}

export async function collectSignals(ticker: string): Promise<string[]> {
  const { row } = getMockRow(ticker)
  await sleep(stepDelayMs())
  return [...row.signals]
}

export async function identifyCatalysts(ticker: string): Promise<string[]> {
  const { row } = getMockRow(ticker)
  await sleep(stepDelayMs())
  return [...row.catalysts]
}

export async function identifyRisks(ticker: string): Promise<string[]> {
  const { row } = getMockRow(ticker)
  await sleep(stepDelayMs())
  return [...row.risks]
}

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

/** In-process pipeline used by the request-bound starter. */
export async function researchStock(tickerInput: string): Promise<ResearchMemo> {
  const facts = await loadCompanyFacts(tickerInput)
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
