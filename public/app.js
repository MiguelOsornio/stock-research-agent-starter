const STORAGE_KEY = "researchRun.v1"
const TOKEN_KEY = "workshopToken.v1"
const DASHBOARD_URL = "https://dashboard.render.com"
const STEP_LABELS = [
  ["analyzeFinancials", "Financials"],
  ["analyzeFilings", "Filings"],
  ["comparePeers", "Peers"],
  ["analyzeNews", "News"],
  ["writeResearchBrief", "Brief"],
]

const form = document.getElementById("research-form")
const tickerInput = document.getElementById("ticker")
const failNewsInput = document.getElementById("fail-news")
const retryInput = document.getElementById("retry-in-request")
const tokenInput = document.getElementById("workshop-token")
const submit = document.getElementById("submit")
const statusEl = document.getElementById("status")
const stepsEl = document.getElementById("steps")
const memoEl = document.getElementById("memo")
const runPanel = document.getElementById("run-panel")
const runIdEl = document.getElementById("run-id")
const runStatusEl = document.getElementById("run-status")
const startOver = document.getElementById("start-over")
const forgetRun = document.getElementById("forget-run")

tokenInput.value = sessionStorage.getItem(TOKEN_KEY) || ""

function headers() {
  const headers = { "content-type": "application/json" }
  if (tokenInput.value.trim()) {
    headers["x-workshop-token"] = tokenInput.value.trim()
  }
  return headers
}

function setStatus(text) {
  statusEl.hidden = !text
  statusEl.textContent = text
}

function lineFor(id, label, completedSteps, failedStep, error, seenBefore) {
  const done = completedSteps.includes(id)
  const failed = failedStep === id
  const again = done && seenBefore.has(id) ? " (again)" : ""
  if (failed) {
    const detail = error ? ` (${error})` : ""
    return `${label.padEnd(12)}failed${detail}`
  }
  if (id === "writeResearchBrief" && !done) {
    return `${label.padEnd(12)}not written`
  }
  if (done) return `${label.padEnd(12)}done${again}`
  return `${label.padEnd(12)}not run`
}

function renderStepPanel(data) {
  const lines = []
  if (data.attempts?.length) {
    const seen = new Set()
    for (const attempt of data.attempts) {
      lines.push(`Attempt ${attempt.attempt}`)
      const completed = attempt.completedSteps || []
      for (const [id, label] of STEP_LABELS) {
        lines.push(
          lineFor(id, label, completed, attempt.failedStep, data.error, seen),
        )
      }
      for (const id of completed) seen.add(id)
      lines.push("")
    }
  } else {
    const completed = data.completedSteps || []
    const seen = new Set()
    for (const [id, label] of STEP_LABELS) {
      lines.push(lineFor(id, label, completed, data.failedStep, data.error, seen))
    }
  }
  stepsEl.hidden = false
  stepsEl.textContent = lines.join("\n").trimEnd()
}

function renderWorkflowStatus(data) {
  const lines = [`Root status: ${data.status}`]
  if (data.retries != null) lines.push(`Root retries: ${data.retries}`)
  lines.push("Open the run in the Render Dashboard to see each step")
  lines.push(DASHBOARD_URL)
  stepsEl.hidden = false
  stepsEl.textContent = lines.join("\n")
}

function renderBrief(brief) {
  if (!brief) {
    memoEl.hidden = true
    return
  }
  memoEl.hidden = false
  const citations = (brief.citations || [])
    .map((citation) => `- ${citation.label} (${citation.asOf}): ${citation.url}`)
    .join("\n")
  memoEl.textContent = [
    `${brief.company} (${brief.ticker})`,
    `Packet date: ${brief.asOf || "n/a"}`,
    `Synthesis: ${brief.synthesisMode || "unknown"}`,
    "",
    "Financials:",
    brief.financials || "",
    "",
    "Filings:",
    brief.filings || "",
    "",
    "News:",
    brief.news || "",
    "",
    "Peers:",
    brief.peers || "",
    "",
    "Summary:",
    brief.summary || "",
    "",
    "Citations:",
    citations,
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
  return status === "succeeded"
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
  renderWorkflowStatus({ status: "pending" })

  while (true) {
    let res
    try {
      res = await fetch(record.statusUrl, { cache: "no-store", headers: headers() })
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
    renderWorkflowStatus(data)

    if (isDone(data.status)) {
      setStatus(`Status: ${data.status}`)
      renderBrief(data.brief)
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
  stepsEl.hidden = true
  submit.disabled = true
  sessionStorage.setItem(TOKEN_KEY, tokenInput.value.trim())
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
      headers: headers(),
      body: JSON.stringify({
        ticker: tickerInput.value,
        failNews: failNewsInput.checked,
        retryInRequest: retryInput.checked,
      }),
      cache: "no-store",
    })
    const data = await readJson(res)

    if (data.taskRunId) {
      if (retryInput.checked) {
        setStatus("Not used with Workflows: retries are configured per task")
      }
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

    if (data.failedStep || data.completedSteps) renderStepPanel(data)
    if (!res.ok) {
      setStatus(data.error || "Request failed")
      return
    }

    setStatus("Done. This response had no task-run ID, so a reload cannot look it up.")
    renderStepPanel(data)
    renderBrief(data.brief)
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
  stepsEl.hidden = true
  setStatus("")
})

forgetRun.addEventListener("click", () => {
  forgetRecord()
  hideRun()
  memoEl.hidden = true
  stepsEl.hidden = true
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
