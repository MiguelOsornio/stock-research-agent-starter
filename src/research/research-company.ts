import { analyzeFilings } from "./analyze-filings.js"
import { analyzeFinancials } from "./analyze-financials.js"
import { analyzeNews } from "./analyze-news.js"
import { comparePeers } from "./compare-peers.js"
import { knownTickers, loadPacket, normalizeInput } from "./packets.js"
import { writeResearchBrief } from "./synthesize.js"
import type { ResearchBrief, ResearchInput } from "./types.js"

export { knownTickers, loadPacket, normalizeInput }
export type { ResearchBrief, ResearchInput }

/**
 * Request-bound pipeline. Same leaf functions as the Workflow graph.
 * Architecture differs: this runs inside one HTTP request.
 */
export async function researchCompany(
  input: string | ResearchInput,
): Promise<ResearchBrief> {
  const research = normalizeInput(input)
  loadPacket(research.ticker)

  const financialsP = analyzeFinancials(research)
  const filingsP = analyzeFilings(research)
  const peersP = comparePeers(research)
  const newsP = analyzeNews(research).then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error }),
  )
  const [financials, filings, peers, newsResult] = await Promise.all([
    financialsP,
    filingsP,
    peersP,
    newsP,
  ])
  if (!newsResult.ok) throw newsResult.error
  const news = newsResult.value

  return writeResearchBrief({
    ticker: research.ticker,
    company: financials.company,
    asOf: "",
    financials,
    filings,
    news,
    peers,
  })
}
