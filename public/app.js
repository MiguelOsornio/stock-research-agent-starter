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

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  memoEl.hidden = true
  submit.disabled = true
  setStatus("Research running inside this request. Keep this tab open…")

  try {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticker: tickerInput.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Request failed")
    setStatus("Done.")
    renderMemo(data)
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Request failed")
  } finally {
    submit.disabled = false
  }
})
