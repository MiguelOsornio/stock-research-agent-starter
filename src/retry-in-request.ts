import { ResearchStepFailed, RESEARCH_STEPS } from "./research/errors.js"
import { researchCompany } from "./research/research-company.js"
import type { ResearchBrief, ResearchInput } from "./research/types.js"

export type AttemptRecord = {
  attempt: number
  completedSteps: string[]
  failedStep: string | null
}

export type RetryResult = {
  brief: ResearchBrief
  attempts: AttemptRecord[]
}

/**
 * Request-bound retry only. Do not use this inside researchCompany or Workflow tasks.
 */
export async function runWithRequestRetries(
  input: ResearchInput,
  research: (input: ResearchInput) => Promise<ResearchBrief>,
  maxAttempts = 3,
): Promise<RetryResult> {
  const attempts: AttemptRecord[] = []
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const brief = await research(input)
      attempts.push({
        attempt,
        completedSteps: [...RESEARCH_STEPS],
        failedStep: null,
      })
      return { brief, attempts }
    } catch (error) {
      lastError = error
      if (error instanceof ResearchStepFailed) {
        attempts.push({
          attempt,
          completedSteps: error.completedSteps,
          failedStep: error.failedStep,
        })
        continue
      }
      throw error
    }
  }

  throw lastError
}

export async function handleRequestBound(input: ResearchInput) {
  if (input.retryInRequest) {
    const result = await runWithRequestRetries(input, researchCompany)
    return {
      brief: result.brief,
      completedSteps: result.attempts[result.attempts.length - 1]?.completedSteps ?? [],
      failedStep: null,
      attempts: result.attempts,
    }
  }
  const brief = await researchCompany(input)
  return {
    brief,
    completedSteps: [...RESEARCH_STEPS],
    failedStep: null,
  }
}
