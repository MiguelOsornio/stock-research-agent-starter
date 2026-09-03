import { loadPacket } from "./packets.js"
import type { PeerAnalysis, ResearchInput } from "./types.js"

/** Compare packet peers on revenue and gross margin. */
export async function comparePeers(input: ResearchInput): Promise<PeerAnalysis> {
  const packet = loadPacket(input.ticker)
  const { peers } = packet
  const names = peers.comparables.map((peer) => peer.ticker)
  const richest = [...peers.comparables].sort(
    (a, b) => b.revenueUsdB - a.revenueUsdB,
  )[0]
  const findings = [
    `Peer set: ${peers.comparables.map((peer) => `${peer.company} (${peer.ticker})`).join("; ")}.`,
    richest
      ? `Largest peer by packet revenue is ${richest.company} at $${richest.revenueUsdB.toFixed(1)}B.`
      : "Peer set is empty.",
    ...peers.comparables.map(
      (peer) =>
        `${peer.ticker} packet gross margin is ${peer.grossMarginPct.toFixed(1)}%.`,
    ),
  ]

  console.log(
    JSON.stringify({
      event: "analysis.complete",
      task: "comparePeers",
      ticker: packet.ticker,
      jobId: input.jobId,
    }),
  )

  return {
    ticker: packet.ticker,
    source: peers.source,
    peers: names,
    findings,
  }
}
