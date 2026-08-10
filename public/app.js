const form = document.getElementById("research-form")
const tickerInput = document.getElementById("ticker")
const submit = document.getElementById("submit")
const statusEl = document.getElementById("status")
const memoEl = document.getElementById("memo")
const trackerEl = document.getElementById("tracker")
const trackerLabel = document.getElementById("tracker-label")
const trackerPercent = document.getElementById("tracker-percent")
const trackerFill = document.getElementById("tracker-fill")
const trackerSteps = [...document.querySelectorAll("#tracker-steps [data-step]")]

const STEPS = [
  "Load company facts",
  "Collect signals",
  "Identify catalysts",
  "Identify risks",
  "Write memo",
]

let trackerTimer = null

function setStatus(text) {
  statusEl.hidden = !text
  statusEl.textContent = text
}

function setTracker(stepIndex, { done = false } = {}) {
  const maxIndex = STEPS.length - 1
  const clamped = Math.max(0, Math.min(stepIndex, maxIndex))
  const percent = done ? 100 : Math.round((clamped / STEPS.length) * 100)

  trackerEl.hidden = false
  trackerLabel.textContent = done ? "Memo ready" : STEPS[clamped]
  trackerPercent.textContent = `${percent}%`
  trackerFill.style.width = `${percent}%`
  trackerFill.classList.toggle("is-active", !done)

  for (const el of trackerSteps) {
    const index = Number(el.dataset.step)
    el.classList.toggle("is-done", done || index < clamped)
    el.classList.toggle("is-active", !done && index === clamped)
  }
}

function startTracker() {
  stopTracker()
  let step = 0
  setTracker(step)
  // Visual only: request ownership is unchanged. Stages advance while POST is pending.
  trackerTimer = window.setInterval(() => {
    if (step >= STEPS.length - 1) return
    step += 1
    setTracker(step)
  }, 1400)
}

function stopTracker() {
  if (trackerTimer != null) {
    window.clearInterval(trackerTimer)
    trackerTimer = null
  }
  trackerFill.classList.remove("is-active")
}

function hideTracker() {
  stopTracker()
  trackerEl.hidden = true
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

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  memoEl.hidden = true
  submit.disabled = true
  setStatus("")
  startTracker()

  try {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticker: tickerInput.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Request failed")
    stopTracker()
    setTracker(STEPS.length - 1, { done: true })
    setStatus("Done. Still no run ID: refresh loses this result.")
    renderMemo(data)
  } catch (err) {
    hideTracker()
    setStatus(err instanceof Error ? err.message : "Request failed")
  } finally {
    submit.disabled = false
  }
})
