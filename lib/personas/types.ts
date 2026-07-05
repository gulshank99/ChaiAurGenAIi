export type SkillLevel = "beginner" | "intermediate" | "advanced"
export type TrainingStatus = "pending" | "processing" | "trained" | "failed"

export interface SampleQA {
  question: string
  answer: string
}

export interface PersonaProfile {
  version: number
  createdAt: string
  trademarkPhrases: string[]
  teachingStructure: string[]
  vocabulary: string[]
  opinions: string[]
  personalityTraits: string[]
  sampleQA: SampleQA[]
  referenceQuotes: string[]
  sourceVideoIds: string[]
}

export interface PersonaConfig {
  personaId: string
  displayName: string
  tagline: string
  avatar: string
  accent: string
  published: boolean
  activeProfileVersion: number
  codeReviewStyle: string
  createdAt: string
}

export interface TrainedVideo {
  videoId: string
  url: string
  title: string
  status: TrainingStatus
  addedAt: string
  mergedIntoVersion?: number
  error?: string
}

export interface Persona {
  config: PersonaConfig
  profile: PersonaProfile
  videos: TrainedVideo[]
  versions: PersonaProfile[]
}

export interface ChatTurn {
  role: "user" | "assistant"
  content: string
}
