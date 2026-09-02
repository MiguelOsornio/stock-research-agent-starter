import { stepDelay } from "./delay.js"
import { loadPacket, pct } from "./packets.js"
import type { FinancialAnalysis, ResearchInput } from "./types.js"

/** Turn the dated financial packet into margin findings with a source URL. */
export async function analyzeFinancials(
  input: ResearchInput,
): Promise<FinancialAnalysis> {
  await stepDelay()
  const packet = loadPacket(input.ticker)
  const { financials } = packet
  const grossMarginPct = pct(financials.grossProfitUsdB, financials.revenueUsdB)
  const operatingMarginPct = pct(
    financials.operatingIncomeUsdB,
    financials.revenueUsdB,
  )

  const findings = [
    `${packet.company} trailing revenue in this packet is $${financials.revenueUsdB.toFixed(1)}B.`,
    `Gross margin is ${grossMarginPct}% and operating margin is ${operatingMarginPct}%.`,
    ...financials.notes,
  ]

  console.log(
    JSON.stringify({
      event: "analysis.complete",
      task: "analyzeFinancials",
      ticker: packet.ticker,
      jobId: input.jobId,
    }),
  )

  return {
    ticker: packet.ticker,
    company: packet.company,
    source: financials.source,
    revenueUsdB: financials.revenueUsdB,
    grossMarginPct,
    operatingMarginPct,
    findings,
  }
}
