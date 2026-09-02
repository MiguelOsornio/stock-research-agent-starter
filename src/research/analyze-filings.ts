import { stepDelay } from "./delay.js"
import { loadPacket } from "./packets.js"
import type { FilingAnalysis, ResearchInput } from "./types.js"

/** Extract filing-type risk language and keep the packet source label. */
export async function analyzeFilings(
  input: ResearchInput,
): Promise<FilingAnalysis> {
  await stepDelay()
  const packet = loadPacket(input.ticker)
  const { filings } = packet
  const riskFactors = filings.excerpts.map((excerpt) => excerpt.trim())
  const findings = [
    `Filing cache type: ${filings.filingType}.`,
    ...riskFactors.map((factor) => `Risk language: ${factor}`),
  ]

  console.log(
    JSON.stringify({
      event: "analysis.complete",
      task: "analyzeFilings",
      ticker: packet.ticker,
      jobId: input.jobId,
    }),
  )

  return {
    ticker: packet.ticker,
    source: filings.source,
    filingType: filings.filingType,
    riskFactors,
    findings,
  }
}
