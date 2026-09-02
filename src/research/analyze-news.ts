import { probeNewsSource } from "./fail-news.js"
import { loadPacket } from "./packets.js"
import type { NewsAnalysis, ResearchInput } from "./types.js"

/** Score the dated news window. Optionally fail once for the retry exercise. */
export async function analyzeNews(input: ResearchInput): Promise<NewsAnalysis> {
  if (input.failNews) {
    await probeNewsSource(input.jobId)
  }

  const packet = loadPacket(input.ticker)
  const { news } = packet
  const findings = news.headlines.map((headline) => {
    const competitive = /competitor|competition|uneven|delay/i.test(headline.title)
    const tone = competitive ? "Watch item" : "Supporting item"
    return `${tone} (${headline.date}): ${headline.title} [${headline.url}]`
  })

  console.log(
    JSON.stringify({
      event: "analysis.complete",
      task: "analyzeNews",
      ticker: packet.ticker,
      jobId: input.jobId,
    }),
  )

  return {
    ticker: packet.ticker,
    source: news.source,
    headlineCount: news.headlines.length,
    findings,
  }
}
