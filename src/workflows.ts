/**
 * =============================================================================
 * workflows.ts  — placeholder for Render Workflows (filled in by the tutorial)
 * =============================================================================
 * FOR BEGINNERS
 * -------------
 * Right now this file does NOT register any Workflow tasks.
 * It only prints a reminder and stays running.
 *
 * Later in the tutorial you replace this whole file with something like:
 *
 *   import { task } from "@renderinc/sdk/workflows"
 *   import { researchStock } from "./research-stock.js"
 *
 *   export const researchStockTask = task(
 *     { name: "researchStock", timeoutSeconds: 120 },
 *     async function researchStockTask(ticker: string) {
 *       return researchStock(ticker)
 *     },
 *   )
 *
 * The Workflow service start command is: npm run workflow:start
 * (see package.json), which runs this file.
 * =============================================================================
 */

console.log(
  "No Workflow tasks registered yet. Follow the tutorial to add researchStock.",
)

/**
 * Keep the process alive.
 * If this file exited immediately, a mistaken Workflow deploy would look
 * "successful" with zero tasks. Staying up makes the missing task obvious
 * in logs / the Dashboard Tasks list.
 */
setInterval(() => {}, 1 << 30)
