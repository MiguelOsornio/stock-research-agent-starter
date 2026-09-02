import assert from "node:assert/strict"
import { afterEach, before, test } from "node:test"
import { analyzeNews } from "./analyze-news.js"
import { ResearchStepFailed } from "./errors.js"
import { NewsSourceUnavailable, resetNewsProbes } from "./fail-news.js"
import { researchCompany } from "./research-company.js"

before(() => {
  process.env.RESEARCH_DELAY_MS = "0"
})

afterEach(() => {
  resetNewsProbes()
  delete process.env.MODEL_API_KEY
  delete process.env.NEWS_FAIL_ENDPOINT
  delete process.env.RENDER_WORKFLOW
  delete process.env.RENDER_SDK_SOCKET_PATH
})

test("researchCompany returns a cited brief from dated packets", async () => {
  const brief = await researchCompany({
    ticker: "NVDA",
    jobId: "job-happy",
    failNews: false,
    retryInRequest: false,
  })
  assert.equal(brief.ticker, "NVDA")
  assert.equal(brief.company, "NVIDIA Corporation")
  assert.equal(brief.asOf, "2026-08-15")
  assert.equal(brief.citations.length, 4)
  assert.match(brief.financials, /Gross margin/)
  assert.match(brief.filings, /Risk language/)
  assert.match(brief.news, /workshop.render.example\/news/)
  assert.match(brief.peers, /AVGO/)
})

test("researchCompany throws ResearchStepFailed with the three sibling steps", async () => {
  await assert.rejects(
    () =>
      researchCompany({
        ticker: "AAPL",
        jobId: "job-fail-news",
        failNews: true,
        retryInRequest: false,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ResearchStepFailed)
      assert.equal(error.failedStep, "analyzeNews")
      assert.deepEqual(
        [...error.completedSteps].sort(),
        ["analyzeFilings", "analyzeFinancials", "comparePeers"].sort(),
      )
      assert.ok(error.cause instanceof NewsSourceUnavailable)
      return true
    },
  )
})

test("the same jobId succeeds on the second news probe", async () => {
  const input = {
    ticker: "MSFT",
    jobId: "job-retry",
    failNews: true,
    retryInRequest: false,
  }
  await assert.rejects(() => analyzeNews(input), NewsSourceUnavailable)
  const news = await analyzeNews(input)
  assert.equal(news.ticker, "MSFT")
  assert.equal(news.headlineCount, 3)
})

test("a new jobId fails again instead of reusing the prior probe", async () => {
  await assert.rejects(
    () =>
      researchCompany({
        ticker: "NVDA",
        jobId: "job-one",
        failNews: true,
        retryInRequest: false,
      }),
    ResearchStepFailed,
  )
  await assert.rejects(
    () =>
      researchCompany({
        ticker: "NVDA",
        jobId: "job-two",
        failNews: true,
        retryInRequest: false,
      }),
    ResearchStepFailed,
  )
})
