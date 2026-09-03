import { loadPacket } from "./packets.js"
import type {
  FilingAnalysis,
  FinancialAnalysis,
  NewsAnalysis,
  PeerAnalysis,
  ResearchBrief,
  SourceRef,
} from "./types.js"

export type BriefInput = {
  ticker: string
  company: string
  asOf: string
  financials: FinancialAnalysis
  filings: FilingAnalysis
  news: NewsAnalysis
  peers: PeerAnalysis
}

function citationsFrom(input: BriefInput): SourceRef[] {
  return [
    input.financials.source,
    input.filings.source,
    input.news.source,
    input.peers.source,
  ]
}

function extractiveBrief(input: BriefInput): ResearchBrief {
  return {
    ticker: input.ticker,
    company: input.company,
    asOf: input.asOf,
    synthesisMode: "extractive",
    financials: input.financials.findings.join(" "),
    filings: input.filings.findings.join(" "),
    news: input.news.findings.join(" "),
    peers: input.peers.findings.join(" "),
    summary: [
      `${input.company} (${input.ticker}) brief from workshop packets dated ${input.asOf}.`,
      `Financials cite ${input.financials.source.label}.`,
      `Filings cite ${input.filings.source.label}.`,
      `News cites ${input.news.source.label}.`,
      `Peers cite ${input.peers.source.label}.`,
    ].join(" "),
    citations: citationsFrom(input),
  }
}

function briefFromModelText(input: BriefInput, text: string): ResearchBrief {
  let parsed: Partial<ResearchBrief> = {}
  try {
    parsed = JSON.parse(text) as Partial<ResearchBrief>
  } catch {
    parsed = { summary: text }
  }
  return {
    ticker: input.ticker,
    company: input.company,
    asOf: input.asOf,
    synthesisMode: "model",
    financials: parsed.financials || extractiveBrief(input).financials,
    filings: parsed.filings || extractiveBrief(input).filings,
    news: parsed.news || extractiveBrief(input).news,
    peers: parsed.peers || extractiveBrief(input).peers,
    summary: parsed.summary || extractiveBrief(input).summary,
    citations: citationsFrom(input),
  }
}

async function writeWithModel(input: BriefInput): Promise<ResearchBrief> {
  const apiKey = process.env.MODEL_API_KEY?.trim()
  if (!apiKey) return extractiveBrief(input)

  const base = (process.env.MODEL_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  )
  const model = process.env.MODEL_NAME?.trim() || "gpt-4o-mini"
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)

  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write a cited stock research brief from supplied analyses only. Return JSON with keys financials, filings, news, peers, summary. Each section must mention its source label. Do not invent numbers.",
          },
          {
            role: "user",
            content: JSON.stringify({
              company: input.company,
              ticker: input.ticker,
              asOf: input.asOf,
              financials: input.financials,
              filings: input.filings,
              news: input.news,
              peers: input.peers,
            }),
          },
        ],
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      console.error(
        JSON.stringify({
          event: "synthesis.model_failed",
          status: response.status,
        }),
      )
      return extractiveBrief(input)
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = body.choices?.[0]?.message?.content ?? ""
    return briefFromModelText(input, text)
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "synthesis.model_failed",
        error: error instanceof Error ? error.message : "model error",
      }),
    )
    return extractiveBrief(input)
  } finally {
    clearTimeout(timer)
  }
}

/** Synthesize one cited brief. Uses a model when MODEL_API_KEY is set. */
export async function writeResearchBrief(input: BriefInput): Promise<ResearchBrief> {
  const packet = loadPacket(input.ticker)
  const withMeta: BriefInput = {
    ...input,
    company: packet.company,
    asOf: packet.asOf,
  }
  const brief = await writeWithModel(withMeta)
  console.log(
    JSON.stringify({
      event: "analysis.complete",
      task: "writeResearchBrief",
      ticker: brief.ticker,
      synthesisMode: brief.synthesisMode,
    }),
  )
  return brief
}
