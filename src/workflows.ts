/**
 * Workflow task definitions (Render SDK 1.0.0).
 *
 * Leaf tasks wrap the mock pipeline. The root chains them with ctx.run
 * so each step is its own child task run.
 *
 * Start command: npm run workflow:start
 */

import { task, type TaskContext } from "@renderinc/sdk/workflows"
import {
  collectSignals,
  identifyCatalysts,
  identifyRisks,
  loadCompanyFacts,
  writeMemo,
  type ResearchMemo,
} from "./research-stock.js"

const taskOptions = {
  plan: "flex",
  timeoutSeconds: 120,
} as const

export const loadCompanyFactsTask = task(
  { name: "loadCompanyFacts", ...taskOptions },
  async function loadCompanyFactsTask(_ctx: TaskContext, ticker: string) {
    return loadCompanyFacts(ticker)
  },
)

export const collectSignalsTask = task(
  { name: "collectSignals", ...taskOptions },
  async function collectSignalsTask(_ctx: TaskContext, ticker: string) {
    return collectSignals(ticker)
  },
)

export const identifyCatalystsTask = task(
  { name: "identifyCatalysts", ...taskOptions },
  async function identifyCatalystsTask(_ctx: TaskContext, ticker: string) {
    return identifyCatalysts(ticker)
  },
)

export const identifyRisksTask = task(
  { name: "identifyRisks", ...taskOptions },
  async function identifyRisksTask(_ctx: TaskContext, ticker: string) {
    return identifyRisks(ticker)
  },
)

export const writeMemoTask = task(
  { name: "writeMemo", ...taskOptions },
  async function writeMemoTask(
    _ctx: TaskContext,
    input: {
      ticker: string
      company: string
      currentSignals: string[]
      potentialCatalysts: string[]
      keyRisks: string[]
    },
  ): Promise<ResearchMemo> {
    return writeMemo(input)
  },
)

export const researchStockTask = task(
  { name: "researchStock", ...taskOptions },
  async function researchStockTask(
    ctx: TaskContext,
    ticker: string,
  ): Promise<ResearchMemo> {
    const facts = await ctx.run(loadCompanyFactsTask, ticker)

    const [currentSignals, potentialCatalysts, keyRisks] = await Promise.all([
      ctx.run(collectSignalsTask, facts.ticker),
      ctx.run(identifyCatalystsTask, facts.ticker),
      ctx.run(identifyRisksTask, facts.ticker),
    ])

    return ctx.run(writeMemoTask, {
      ticker: facts.ticker,
      company: facts.company,
      currentSignals,
      potentialCatalysts,
      keyRisks,
    })
  },
)

console.log(
  "Registered Workflow tasks: loadCompanyFacts, collectSignals, identifyCatalysts, identifyRisks, writeMemo, researchStock",
)
