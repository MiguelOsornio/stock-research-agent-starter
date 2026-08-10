import {
  hideTracker,
  markTrackerDone,
  setTrackerMode,
  startTimedTracker,
  stopTrackerTicks,
  syncTrackerFromStartedAt,
} from "./tracker.js"

const KEY = "stockResearchTaskRunId"
const KEY_STARTED = "stockResearchStartedAt"
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

/**
 * Polls Workflow status and keeps the tracker aligned with elapsed research time.
 */
async function pollUntilDone(taskRunId) {
  setTrackerMode("durable")
  const storedStarted = Number(localStorage.getItem(KEY_STARTED) || "")
  let startedAtMs = Number.isFinite(storedStarted) ? storedStarted : Date.now()

  while (true) {
    const res = await fetch(`/api/research/${taskRunId}`)
    const data = await res.json()

    if (!res.ok && data.status !== "failed" && data.status !== "canceled") {
      throw new Error(data.error || "Status check failed")
    }

    startedAtMs = startedAtFrom(data, startedAtMs)
    localStorage.setItem(KEY_STARTED, String(startedAtMs))

    if (data.status === "completed") {
      markTrackerDone()
      setStatus(`Completed (${taskRunId})`)
      renderMemo(data.memo)
      return
    }

    if (data.status === "failed" || data.status === "canceled") {
      hideTracker()
      clearRun()
      throw new Error(data.error || `Research ${data.status}`)
    }

    syncTrackerFromStartedAt(startedAtMs)
    setStatus(`Status: ${data.status} (${taskRunId})`)
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
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Request failed")

    // Workflow mode (tutorial after server change): receipt + poll.
    if (data.taskRunId) {
      stopTrackerTicks()
      const startedAtMs = Date.now()
      saveRun(data.taskRunId, startedAtMs)
      syncTrackerFromStartedAt(startedAtMs)
      await pollUntilDone(data.taskRunId)
      return
    }

    // Starter mode: memo arrived on the same request.
    stopTrackerTicks()
    markTrackerDone()
    setTrackerMode("request")
    setStatus("Done. Still no run ID: refresh loses this result.")
    renderMemo(data)
  } catch (err) {
    hideTracker()
    setStatus(err instanceof Error ? err.message : "Request failed")
  } finally {
    submit.disabled = false
  }
})

const existing = localStorage.getItem(KEY)
if (existing) {
  submit.disabled = true
  setStatus(`Resuming ${existing}…`)
  pollUntilDone(existing)
    .catch((err) => {
      setStatus(err instanceof Error ? err.message : "Resume failed")
    })
    .finally(() => {
      submit.disabled = false
    })
}
