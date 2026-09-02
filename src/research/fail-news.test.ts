import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { probeNewsSource, resetNewsProbes } from "./fail-news.js"
import { WorkshopConfigError } from "./errors.js"

afterEach(() => {
  resetNewsProbes()
  delete process.env.NEWS_FAIL_ENDPOINT
  delete process.env.RENDER_WORKFLOW
  delete process.env.RENDER_SDK_SOCKET_PATH
})

test("probeNewsSource throws WorkshopConfigError in Workflow mode without NEWS_FAIL_ENDPOINT", async () => {
  process.env.RENDER_WORKFLOW = "1"
  delete process.env.NEWS_FAIL_ENDPOINT
  await assert.rejects(
    () => probeNewsSource("job-config"),
    (error: unknown) => {
      assert.ok(error instanceof WorkshopConfigError)
      assert.match(error.message, /NEWS_FAIL_ENDPOINT/)
      return true
    },
  )
})
