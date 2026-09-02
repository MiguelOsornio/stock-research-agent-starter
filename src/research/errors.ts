export class ResearchStepFailed extends Error {
  readonly failedStep: string
  readonly completedSteps: string[]
  readonly cause: Error

  constructor(failedStep: string, completedSteps: string[], cause: Error) {
    super(cause.message)
    this.name = "ResearchStepFailed"
    this.failedStep = failedStep
    this.completedSteps = completedSteps
    this.cause = cause
  }
}

export class WorkshopConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WorkshopConfigError"
  }
}

export const RESEARCH_STEPS = [
  "analyzeFinancials",
  "analyzeFilings",
  "comparePeers",
  "analyzeNews",
  "writeResearchBrief",
] as const

export type ResearchStep = (typeof RESEARCH_STEPS)[number]
