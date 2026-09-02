export type SourceRef = {
  label: string
  url: string
  asOf: string
}

export type ResearchInput = {
  ticker: string
  jobId: string
  failNews: boolean
}

export type FinancialAnalysis = {
  ticker: string
  company: string
  source: SourceRef
  revenueUsdB: number
  grossMarginPct: number
  operatingMarginPct: number
  findings: string[]
}

export type FilingAnalysis = {
  ticker: string
  source: SourceRef
  filingType: string
  riskFactors: string[]
  findings: string[]
}

export type NewsAnalysis = {
  ticker: string
  source: SourceRef
  headlineCount: number
  findings: string[]
}

export type PeerAnalysis = {
  ticker: string
  source: SourceRef
  peers: string[]
  findings: string[]
}

export type ResearchBrief = {
  ticker: string
  company: string
  asOf: string
  synthesisMode: "model" | "extractive"
  financials: string
  filings: string
  news: string
  peers: string
  summary: string
  citations: SourceRef[]
}

export type SourcePacket = {
  ticker: string
  company: string
  asOf: string
  financials: {
    source: SourceRef
    revenueUsdB: number
    grossProfitUsdB: number
    operatingIncomeUsdB: number
    notes: string[]
  }
  filings: {
    source: SourceRef
    filingType: string
    excerpts: string[]
  }
  news: {
    source: SourceRef
    headlines: Array<{ title: string; url: string; date: string }>
  }
  peers: {
    source: SourceRef
    comparables: Array<{
      ticker: string
      company: string
      revenueUsdB: number
      grossMarginPct: number
    }>
  }
}
