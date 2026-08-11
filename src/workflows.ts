/**
 * workflows.ts — Workflow entry placeholder (tutorial fills this in).
 *
 * No tasks are registered yet. The tutorial replaces this file with a
 * `task()` wrapper around `researchStock`.
 *
 * Start command for the Workflow service: `npm run workflow:start`
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
