import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { stepDelay, stepDelayMs } from "./delay.js"

afterEach(() => {
  process.env.RESEARCH_DELAY_MS = "0"
})

test("stepDelay respects RESEARCH_DELAY_MS=0", async () => {
  process.env.RESEARCH_DELAY_MS = "0"
  assert.equal(stepDelayMs(), 0)
  const started = Date.now()
  await stepDelay()
  assert.ok(Date.now() - started < 50)
})

test("stepDelay waits at least a small positive value", async () => {
  process.env.RESEARCH_DELAY_MS = "50"
  const started = Date.now()
  await stepDelay()
  assert.ok(Date.now() - started >= 50)
})
