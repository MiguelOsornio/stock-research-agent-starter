import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { analyzeNews } from "./analyze-news.js"
import { NewsSourceUnavailable, resetNewsProbes } from "./fail-news.js"
import { researchCompany } from "./research-company.js"

afterEach(() => {
  resetNewsProbes()
  delete process.env.MODEL_API_KEY
  delete process.env.NEWS_FAIL_ENDPOINT
})

test("researchCompany returns a cited brief from dated packets", async () => {
  const brief = await researchCompany({
    ticker: "NVDA",
    jobId: "job-happy",
    failNews: false,
  })
  assert.equal(brief.ticker, "NVDA")
  assert.equal(brief.company, "NVIDIA Corporation")
  assert.equal(brief.asOf, "2026-08-15")
  assert.equal(brief.citations.length, 4)
  assert.match(brief.financials, /Gross margin/)
  assert.match(brief.filings, /Risk language/)
  assert.match(brief.news, /workshop.render.example\/news/)
  assert.match(brief.peers, /AVGO/)
  assert.ok(brief.citations.every((citation) => citation.url.includes("NVDA")))
})

test("news failure throws after sibling analyses can complete", async () => {
  const completed: string[] = []
  const originalLog = console.log
  console.log = (message?: unknown) => {
    if (typeof message === "string") {
      try {
        const parsed = JSON.parse(message) as { task?: string }
        if (parsed.task) completed.push(parsed.task)
      } catch {
        // ignore non-JSON logs
      }
    }
  }

  try {
    await assert.rejects(
      () =>
        researchCompany({
          ticker: "AAPL",
          jobId: "job-fail-news",
          failNews: true,
        }),
      (error: unknown) => error instanceof NewsSourceUnavailable,
    )
  } finally {
    console.log = originalLog
  }

  assert.ok(completed.includes("analyzeFinancials"))
  assert.ok(completed.includes("analyzeFilings"))
  assert.ok(completed.includes("comparePeers"))
  assert.ok(!completed.includes("analyzeNews"))
  assert.ok(!completed.includes("writeResearchBrief"))
})

test("the same jobId succeeds on the second news probe", async () => {
  const input = { ticker: "MSFT", jobId: "job-retry", failNews: true }
  await assert.rejects(() => analyzeNews(input), NewsSourceUnavailable)
  const news = await analyzeNews(input)
  assert.equal(news.ticker, "MSFT")
  assert.equal(news.headlineCount, 3)
})

test("a new HTTP-style jobId fails again instead of reusing the prior probe", async () => {
  await assert.rejects(
    () =>
      researchCompany({
        ticker: "NVDA",
        jobId: "job-one",
        failNews: true,
      }),
    NewsSourceUnavailable,
  )
  await assert.rejects(
    () =>
      researchCompany({
        ticker: "NVDA",
        jobId: "job-two",
        failNews: true,
      }),
    NewsSourceUnavailable,
  )
})
