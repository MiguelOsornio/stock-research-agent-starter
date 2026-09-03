import {
  hideTracker,
  markTrackerDone,
  setTrackerMode,
  startTimedTracker,
  stopTrackerTicks,
  syncTrackerFromStartedAt,
} from "./tracker.js"

// Bump this key if stored runs become incompatible. Old keys are ignored
// automatically so attendees never need to clear site data by hand.
const KEY = "stockResearchTaskRunId.v2"
const KEY_STARTED = "stockResearchStartedAt.v2"

const form = document.getElementById("research-form")
const tickerInput = document.getElementById("ticker")
const submit = document.getElementById("submit")
const statusEl = document.getElementById("status")
const memoEl = document.getElementById("memo")

function setStatus(text) {
  statusEl.hidden = !text
  statusEl.textContent = text
}

function renderMemo(memo) {
  memoEl.hidden = false
  memoEl.textContent = [
    `Company: ${memo.company} (${memo.ticker})`,
    "",
    "Current signals:",
    ...memo.currentSignals.map((s) => `- ${s}`),
    "",
    "Potential catalysts:",
    ...memo.potentialCatalysts.map((s) => `- ${s}`),
    "",
    "Key risks:",
    ...memo.keyRisks.map((s) => `- ${s}`),
    "",
    "Research summary:",
    memo.researchSummary,
  ].join("\n")
}

function saveRun(taskRunId, startedAtMs) {
  localStorage.setItem(KEY, taskRunId)
  localStorage.setItem(KEY_STARTED, String(startedAtMs))
}

function clearRun() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(KEY_STARTED)
}

function startedAtFrom(data, fallbackMs) {
  if (data?.startedAt) {
    const parsed = Date.parse(data.startedAt)
    if (!Number.isNaN(parsed)) return parsed
  }
  return fallbackMs
}

/** Parse JSON from a fetch Response. Throws a short, human message on failure. */
async function readJson(res) {
  const text = await res.text()
  if (!text) {
    throw new Error(`Empty response (${res.status})`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Unexpected response (${res.status})`)
  }
}

/**
 * One status check. Returns parsed JSON on success, or null if this host
 * cannot resume (starter mode, stale id, non-JSON 404, etc.).
 */
async function peekStatus(taskRunId) {
  try {
    const res = await fetch(`/api/research/${taskRunId}`, { cache: "no-store" })
    const data = await readJson(res)
    if (!res.ok && data.status !== "failed" && data.status !== "canceled") {
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * Polls Workflow status and keeps the tracker aligned with elapsed research time.
 */
async function pollUntilDone(taskRunId) {
  setTrackerMode("durable")
  const storedStarted = Number(localStorage.getItem(KEY_STARTED) || "")
  let startedAtMs = Number.isFinite(storedStarted) ? storedStarted : Date.now()

  while (true) {
    const res = await fetch(`/api/research/${taskRunId}`, { cache: "no-store" })
    const data = await readJson(res)

    if (!res.ok && data.status !== "failed" && data.status !== "canceled") {
      throw new Error(data.error || "Status check failed")
    }

    startedAtMs = startedAtFrom(data, startedAtMs)
    localStorage.setItem(KEY_STARTED, String(startedAtMs))

    if (data.status === "succeeded" || data.status === "completed") {
      markTrackerDone()
      setStatus(`Completed (${taskRunId})`)
      renderMemo(data.memo)
      clearRun()
      return
    }

    if (data.status === "failed" || data.status === "canceled") {
      hideTracker()
      clearRun()
      throw new Error(data.error || `Research ${data.status}`)
    }

    syncTrackerFromStartedAt(startedAtMs)
    setStatus(`Status: ${data.status}`)
    await new Promise((r) => setTimeout(r, 1000))
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  memoEl.hidden = true
  submit.disabled = true
  setStatus("")
  clearRun()
  startTimedTracker()

  try {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticker: tickerInput.value }),
      cache: "no-store",
    })
    const data = await readJson(res)
    if (!res.ok) throw new Error(data.error || "Request failed")

    // Workflow mode: receipt + poll.
    if (data.taskRunId) {
      stopTrackerTicks()
      const startedAtMs = Date.now()
      saveRun(data.taskRunId, startedAtMs)
      syncTrackerFromStartedAt(startedAtMs)
      await pollUntilDone(data.taskRunId)
      return
    }

    // Starter mode: memo on the same request.
    stopTrackerTicks()
    markTrackerDone()
    setTrackerMode("request")
    setStatus("Done. Still no run ID: refresh loses this result.")
    renderMemo(data)
  } catch (err) {
    hideTracker()
    clearRun()
    setStatus(err instanceof Error ? err.message : "Request failed")
  } finally {
    submit.disabled = false
  }
})

/**
 * Resume a saved Workflow run if possible.
 * If the saved id is stale or this host has no status route, clear it quietly
 * and leave a blank form. Attendees should never need DevTools for this.
 */
async function maybeResume() {
  const existing = localStorage.getItem(KEY)
  if (!existing) return

  submit.disabled = true
  setStatus("Resuming previous run…")

  const first = await peekStatus(existing)
  if (!first) {
    clearRun()
    hideTracker()
    setStatus("")
    submit.disabled = false
    return
  }

  try {
    // Re-enter the poll loop with the already-fetched first payload path:
    // simplest is to call pollUntilDone, which hits the API again immediately.
    syncTrackerFromStartedAt(startedAtFrom(first, Date.now()))
    await pollUntilDone(existing)
  } catch {
    clearRun()
    hideTracker()
    setStatus("")
  } finally {
    submit.disabled = false
  }
}

maybeResume()
