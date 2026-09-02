/**
 * Workflow task definitions (Render SDK 1.0.0).
 *
 * Leaf tasks wrap the same source-analysis functions as the request-bound path.
 * The root chains them with ctx.run so each step is its own child task run.
 *
 * Start command: npm run workflow:start
 */

import { task, type TaskContext } from "@renderinc/sdk/workflows"
import {
  analyzeFilings,
  analyzeFinancials,
  analyzeNews,
  comparePeers,
  loadPacket,
  normalizeInput,
  writeResearchBrief,
  type ResearchBrief,
  type ResearchInput,
} from "./research/index.js"

const taskOptions = {
  plan: "flex",
  timeoutSeconds: 300,
} as const

export const analyzeFinancialsTask = task(
  { name: "analyzeFinancials", ...taskOptions },
  async function analyzeFinancialsTask(_ctx: TaskContext, input: ResearchInput) {
    return analyzeFinancials(normalizeInput(input))
  },
)

export const analyzeFilingsTask = task(
  { name: "analyzeFilings", ...taskOptions },
  async function analyzeFilingsTask(_ctx: TaskContext, input: ResearchInput) {
    return analyzeFilings(normalizeInput(input))
  },
)

export const analyzeNewsTask = task(
  {
    name: "analyzeNews",
    ...taskOptions,
    retry: { maxRetries: 1, waitDurationMs: 3000, backoffScaling: 1 },
  },
  async function analyzeNewsTask(_ctx: TaskContext, input: ResearchInput) {
    return analyzeNews(normalizeInput(input))
  },
)

export const comparePeersTask = task(
  { name: "comparePeers", ...taskOptions },
  async function comparePeersTask(_ctx: TaskContext, input: ResearchInput) {
    return comparePeers(normalizeInput(input))
  },
)

export const writeResearchBriefTask = task(
  { name: "writeResearchBrief", ...taskOptions },
  async function writeResearchBriefTask(
    _ctx: TaskContext,
    input: Parameters<typeof writeResearchBrief>[0],
  ): Promise<ResearchBrief> {
    return writeResearchBrief(input)
  },
)

export const researchCompanyTask = task(
  { name: "researchCompany", ...taskOptions },
  async function researchCompanyTask(
    ctx: TaskContext,
    input: string | ResearchInput,
  ): Promise<ResearchBrief> {
    const research = normalizeInput(input)
    const packet = loadPacket(research.ticker)

    const [financials, filings, news, peers] = await Promise.all([
      ctx.run(analyzeFinancialsTask, research),
      ctx.run(analyzeFilingsTask, research),
      ctx.run(analyzeNewsTask, research),
      ctx.run(comparePeersTask, research),
    ])

    return ctx.run(writeResearchBriefTask, {
      ticker: packet.ticker,
      company: packet.company,
      asOf: packet.asOf,
      financials,
      filings,
      news,
      peers,
    })
  },
)

console.log(
  "Registered Workflow tasks: researchCompany, analyzeFinancials, analyzeFilings, analyzeNews, comparePeers, writeResearchBrief",
)
