const failedJobIds = new Set<string>()

export class NewsSourceUnavailable extends Error {
  constructor(jobId: string) {
    super(`News source returned HTTP 503 for job ${jobId}`)
    this.name = "NewsSourceUnavailable"
  }
}

function probeUrl(jobId: string): string | null {
  const base = process.env.NEWS_FAIL_ENDPOINT?.trim()
  if (!base) return null
  return `${base.replace(/\/$/, "")}/${encodeURIComponent(jobId)}`
}

/**
 * Fail the first probe for a job ID, then succeed.
 * Request-bound runs use in-process state. Workflow retries use the web endpoint.
 */
export async function probeNewsSource(jobId: string): Promise<void> {
  const url = probeUrl(jobId)
  if (url) {
    const token = process.env.WORKSHOP_TOKEN?.trim()
    const response = await fetch(url, {
      cache: "no-store",
      headers: token ? { "x-workshop-token": token } : undefined,
    })
    if (response.status === 503) throw new NewsSourceUnavailable(jobId)
    if (!response.ok) {
      throw new Error(`News source probe failed (${response.status})`)
    }
    return
  }

  if (!failedJobIds.has(jobId)) {
    failedJobIds.add(jobId)
    throw new NewsSourceUnavailable(jobId)
  }
}

/** Record one failed probe, then allow the next one. Used by the web service. */
export function recordNewsProbe(jobId: string): "unavailable" | "ok" {
  if (!failedJobIds.has(jobId)) {
    failedJobIds.add(jobId)
    return "unavailable"
  }
  return "ok"
}

export function resetNewsProbes(): void {
  failedJobIds.clear()
}
