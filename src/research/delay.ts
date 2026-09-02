/** Sleep used so learners can watch each step. Set RESEARCH_DELAY_MS=0 in tests. */
export function stepDelayMs(): number {
  const raw = process.env.RESEARCH_DELAY_MS
  if (raw === undefined || raw === "") return 4000
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : 4000
}

export async function stepDelay(): Promise<void> {
  const ms = stepDelayMs()
  if (ms === 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}
