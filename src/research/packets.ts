import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { ResearchInput, SourcePacket } from "./types.js"

const packetsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "data",
  "packets",
)

const packets = new Map<string, SourcePacket>()

for (const fileName of readdirSync(packetsDir)) {
  if (!fileName.endsWith(".json")) continue
  const packet = JSON.parse(
    readFileSync(join(packetsDir, fileName), "utf8"),
  ) as SourcePacket
  packets.set(packet.ticker.toUpperCase(), packet)
}

export function knownTickers(): string[] {
  return [...packets.keys()].sort()
}

export function normalizeInput(
  input: string | ResearchInput,
): ResearchInput {
  if (typeof input === "string") {
    return {
      ticker: input.trim().toUpperCase(),
      jobId: `manual-${input.trim().toUpperCase()}`,
      failNews: false,
    }
  }
  return {
    ticker: String(input.ticker ?? "").trim().toUpperCase(),
    jobId: String(input.jobId ?? "").trim() || `job-${Date.now()}`,
    failNews: Boolean(input.failNews),
  }
}

export function loadPacket(tickerInput: string): SourcePacket {
  const ticker = tickerInput.trim().toUpperCase()
  const packet = packets.get(ticker)
  if (!packet) {
    throw new Error(`Unknown ticker "${ticker}". Try one of: ${knownTickers().join(", ")}`)
  }
  return packet
}

export function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}
