import assert from "node:assert/strict"
import { afterEach, before, test } from "node:test"
import { resetNewsProbes } from "./research/fail-news.js"
import { runWithRequestRetries } from "./retry-in-request.js"
import { researchCompany } from "./research/research-company.js"

before(() => {
  process.env.RESEARCH_DELAY_MS = "0"
})

afterEach(() => {
  resetNewsProbes()
})

test("runWithRequestRetries returns two attempts for a fail-once job", async () => {
  const result = await runWithRequestRetries(
    {
      ticker: "NVDA",
      jobId: "job-retry-loop",
      failNews: true,
      retryInRequest: true,
    },
    researchCompany,
  )
  assert.equal(result.attempts.length, 2)
  assert.equal(result.attempts[0]?.failedStep, "analyzeNews")
  assert.deepEqual(
    [...(result.attempts[0]?.completedSteps ?? [])].sort(),
    ["analyzeFilings", "analyzeFinancials", "comparePeers"].sort(),
  )
  assert.equal(result.attempts[1]?.failedStep, null)
  assert.ok(result.attempts[1]?.completedSteps.includes("writeResearchBrief"))
  assert.equal(result.brief.ticker, "NVDA")
})

test("runWithRequestRetries returns one attempt for a normal job", async () => {
  const result = await runWithRequestRetries(
    {
      ticker: "NVDA",
      jobId: "job-ok",
      failNews: false,
      retryInRequest: true,
    },
    researchCompany,
  )
  assert.equal(result.attempts.length, 1)
  assert.equal(result.attempts[0]?.failedStep, null)
  assert.equal(result.brief.ticker, "NVDA")
})
