import { analyzeFilings } from "./analyze-filings.js"
import { analyzeFinancials } from "./analyze-financials.js"
import { analyzeNews } from "./analyze-news.js"
import { comparePeers } from "./compare-peers.js"
import { ResearchStepFailed } from "./errors.js"
import { knownTickers, loadPacket, normalizeInput } from "./packets.js"
import { writeResearchBrief } from "./synthesize.js"
import type { ResearchBrief, ResearchInput } from "./types.js"

export { knownTickers, loadPacket, normalizeInput }
export type { ResearchBrief, ResearchInput }

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * Request-bound pipeline. Same leaf functions as the Workflow graph.
 * Architecture differs: this runs inside one HTTP request.
 */
export async function researchCompany(
  input: string | ResearchInput,
): Promise<ResearchBrief> {
  const research = normalizeInput(input)
  const packet = loadPacket(research.ticker)
  const completed: string[] = []

  const mark = (name: string) => {
    completed.push(name)
  }

  const financialsP = analyzeFinancials(research).then((value) => {
    mark("analyzeFinancials")
    return value
  })
  const filingsP = analyzeFilings(research).then((value) => {
    mark("analyzeFilings")
    return value
  })
  const peersP = comparePeers(research).then((value) => {
    mark("comparePeers")
    return value
  })
  const newsP = analyzeNews(research).then(
    (value) => {
      mark("analyzeNews")
      return { ok: true as const, value }
    },
    (error) => ({ ok: false as const, error }),
  )

  const [financials, filings, peers, newsResult] = await Promise.all([
    financialsP,
    filingsP,
    peersP,
    newsP,
  ])

  if (!newsResult.ok) {
    throw new ResearchStepFailed("analyzeNews", [...completed], asError(newsResult.error))
  }

  try {
    const brief = await writeResearchBrief({
      ticker: research.ticker,
      company: financials.company,
      asOf: packet.asOf,
      financials,
      filings,
      news: newsResult.value,
      peers,
    })
    mark("writeResearchBrief")
    return brief
  } catch (error) {
    throw new ResearchStepFailed("writeResearchBrief", [...completed], asError(error))
  }
}
