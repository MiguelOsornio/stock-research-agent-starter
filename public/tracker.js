/** Shared live-tracker helpers. Tutorial pages never ask learners to edit this file. */

export const STEPS = [
  "Load company facts",
  "Collect signals",
  "Identify catalysts",
  "Identify risks",
  "Write memo",
]

/** Must stay aligned with server RESEARCH_DELAY_MS default. */
export const EXPECTED_MS = 8000

const trackerEl = document.getElementById("tracker")
const trackerLabel = document.getElementById("tracker-label")
const trackerPercent = document.getElementById("tracker-percent")
const trackerFill = document.getElementById("tracker-fill")
const trackerNote = document.getElementById("tracker-note")
const trackerSteps = [...document.querySelectorAll("#tracker-steps [data-step]")]

let tickTimer = null

/**
 * Renders tracker at a pipeline step index.
 */
export function setTracker(stepIndex, { done = false } = {}) {
  if (!trackerEl || !trackerLabel || !trackerPercent || !trackerFill) return

  const maxIndex = STEPS.length - 1
  const clamped = Math.max(0, Math.min(stepIndex, maxIndex))
  const percent = done ? 100 : Math.round(((clamped + (done ? 1 : 0.35)) / STEPS.length) * 100)
  const bounded = done ? 100 : Math.min(95, Math.max(5, percent))

  trackerEl.hidden = false
  trackerLabel.textContent = done ? "Memo ready" : STEPS[clamped]
  trackerPercent.textContent = `${bounded}%`
  trackerFill.style.width = `${bounded}%`
  trackerFill.classList.toggle("is-active", !done)

  for (const el of trackerSteps) {
    const index = Number(el.dataset.step)
    el.classList.toggle("is-done", done || index < clamped)
    el.classList.toggle("is-active", !done && index === clamped)
  }
}

/**
 * Sets the durable vs request-owned footer note under the tracker.
 */
export function setTrackerMode(mode) {
  if (!trackerNote) return
  if (mode === "durable") {
    trackerNote.textContent =
      "Backed by a Workflow task-run ID. Close the tab and reopen: the tracker resumes."
    return
  }
  trackerNote.textContent =
    "Bound to this open request. Close the tab and there is nothing to resume."
}

/**
 * Advances steps on a timer (request-owned / starter mode).
 */
export function startTimedTracker() {
  stopTrackerTicks()
  setTrackerMode("request")
  let step = 0
  setTracker(step)
  const slice = Math.max(200, Math.floor(EXPECTED_MS / STEPS.length))
  tickTimer = window.setInterval(() => {
    if (step >= STEPS.length - 1) return
    step += 1
    setTracker(step)
  }, slice)
}

/**
 * Drives tracker from elapsed time since a durable run started (Workflow mode).
 */
export function syncTrackerFromStartedAt(startedAtMs) {
  setTrackerMode("durable")
  if (!startedAtMs) {
    setTracker(0)
    return
  }
  const elapsed = Math.max(0, Date.now() - startedAtMs)
  const step = Math.min(
    STEPS.length - 1,
    Math.floor((elapsed / EXPECTED_MS) * STEPS.length),
  )
  setTracker(step)
}

export function markTrackerDone() {
  stopTrackerTicks()
  setTracker(STEPS.length - 1, { done: true })
}

export function stopTrackerTicks() {
  if (tickTimer != null) {
    window.clearInterval(tickTimer)
    tickTimer = null
  }
  trackerFill?.classList.remove("is-active")
}

export function hideTracker() {
  stopTrackerTicks()
  if (trackerEl) trackerEl.hidden = true
}
