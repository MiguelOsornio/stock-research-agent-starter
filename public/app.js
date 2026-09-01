const STORAGE_KEY = "closeTheTabRun.v1"

const form = document.getElementById("research-form")
const tickerInput = document.getElementById("ticker")
const submit = document.getElementById("submit")
const statusEl = document.getElementById("status")
const memoEl = document.getElementById("memo")
const runPanel = document.getElementById("run-panel")
const runIdEl = document.getElementById("run-id")
const runStatusEl = document.getElementById("run-status")
const startOver = document.getElementById("start-over")
const forgetRun = document.getElementById("forget-run")

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

function loadRecord() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
    if (!parsed?.taskRunId) return null
    return parsed
  } catch {
    return null
  }
}

function saveRecord(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
}

function forgetRecord() {
  localStorage.removeItem(STORAGE_KEY)
}

function showRun(record, statusText) {
  runPanel.hidden = false
  runIdEl.textContent = record.taskRunId
  runStatusEl.textContent = statusText
  forgetRun.hidden = statusText !== "not found"
}

function hideRun() {
  runPanel.hidden = true
  runIdEl.textContent = ""
  runStatusEl.textContent = ""
  forgetRun.hidden = true
}

function isDone(status) {
  return status === "completed" || status === "succeeded"
}

async function readJson(res) {
  const text = await res.text()
  if (!text) throw new Error(`Empty response (${res.status})`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Unexpected response (${res.status})`)
  }
}

async function pollUntilDone(record) {
  showRun(record, "pending")
  setStatus(`Task-run ID ${record.taskRunId}`)

  while (true) {
    let res
    try {
      res = await fetch(record.statusUrl, { cache: "no-store" })
    } catch {
      setStatus("Status lookup failed. The task-run ID is still saved. Retrying…")
      await new Promise((r) => setTimeout(r, 1500))
      continue
    }

    const data = await readJson(res)

    if (res.status >= 500) {
      setStatus("Temporary status error. The task-run ID is still saved. Retrying…")
      await new Promise((r) => setTimeout(r, 1500))
      continue
    }

    if (res.status === 404) {
      showRun(record, "not found")
      setStatus("This run is not available. Use Forget this run if you want to clear it.")
      return
    }

    if (!res.ok) {
      setStatus(data.error || "Status check failed")
      return
    }

    showRun(record, data.status)

    if (isDone(data.status)) {
      setStatus(`Status: ${data.status}`)
      if (data.memo) renderMemo(data.memo)
      return
    }

    if (data.status === "failed" || data.status === "canceled") {
      setStatus(data.error || `Status: ${data.status}`)
      return
    }

    setStatus(`Status: ${data.status}`)
    await new Promise((r) => setTimeout(r, 1000))
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  memoEl.hidden = true
  submit.disabled = true
  setStatus("Request running…")

  const previous = loadRecord()
  const startedAt = Date.now()
  const tick = window.setInterval(() => {
    const seconds = Math.floor((Date.now() - startedAt) / 1000)
    if (!loadRecord()) setStatus(`Request running (${seconds}s)`)
  }, 250)

  try {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticker: tickerInput.value }),
      cache: "no-store",
    })
    const data = await readJson(res)
    if (!res.ok) throw new Error(data.error || "Request failed")

    if (data.taskRunId) {
      const record = {
        taskRunId: data.taskRunId,
        statusUrl: data.statusUrl || `/api/research/${data.taskRunId}`,
        ticker: tickerInput.value.trim().toUpperCase(),
        createdAt: new Date().toISOString(),
      }
      saveRecord(record)
      await pollUntilDone(record)
      return
    }

    setStatus("Done. This response had no task-run ID, so a reload cannot look it up.")
    renderMemo(data)
  } catch (err) {
    if (previous) saveRecord(previous)
    setStatus(err instanceof Error ? err.message : "Request failed")
  } finally {
    window.clearInterval(tick)
    submit.disabled = false
  }
})

startOver.addEventListener("click", () => {
  forgetRecord()
  hideRun()
  memoEl.hidden = true
  setStatus("")
})

forgetRun.addEventListener("click", () => {
  forgetRecord()
  hideRun()
  memoEl.hidden = true
  setStatus("")
})

async function maybeResume() {
  const existing = loadRecord()
  if (!existing) return
  submit.disabled = true
  try {
    await pollUntilDone(existing)
  } finally {
    submit.disabled = false
  }
}

maybeResume()
