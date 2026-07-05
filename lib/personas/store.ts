import { SEED_PERSONAS } from "./seed"
import type { Persona, PersonaConfig, PersonaProfile, TrainedVideo } from "./types"

// Config-driven persona store (BRD 7.2).
//
// The BRD specifies a "file-based (or lightweight DB)" store of per-persona config,
// profile versions, and trained-video registry. For the single-shared-session
// hackathon scope (BRD 3.2 / 16) we use an in-memory store that models exactly that
// shape: config.json + videos.json + profile_v{n}.json per persona. Swapping this
// for a real DB later requires no changes to the callers.
//
// We stash it on globalThis so it survives Next.js dev hot-reloads.

interface PersonaRecord {
  config: PersonaConfig
  versions: PersonaProfile[] // profile_v1..profile_vN, retained for rollback
  videos: TrainedVideo[]
}

interface StoreShape {
  personas: Map<string, PersonaRecord>
}

function seedStore(): StoreShape {
  const personas = new Map<string, PersonaRecord>()
  for (const seed of SEED_PERSONAS) {
    personas.set(seed.config.personaId, {
      config: structuredClone(seed.config),
      versions: [structuredClone(seed.profile)],
      videos: structuredClone(seed.videos),
    })
  }
  return { personas }
}

const globalForStore = globalThis as unknown as { __personaStore?: StoreShape }

function store(): StoreShape {
  if (!globalForStore.__personaStore) {
    globalForStore.__personaStore = seedStore()
  }
  return globalForStore.__personaStore
}

function activeProfile(record: PersonaRecord): PersonaProfile {
  const active = record.versions.find((v) => v.version === record.config.activeProfileVersion)
  // Fall back to the latest version if the active pointer is stale.
  return active ?? record.versions[record.versions.length - 1]
}

// ---- Public API ----

export function listPersonas(opts: { publishedOnly?: boolean } = {}): Persona[] {
  const all = Array.from(store().personas.values())
  const filtered = opts.publishedOnly ? all.filter((r) => r.config.published) : all
  return filtered.map(toPersona)
}

export function getPersona(personaId: string): Persona | null {
  const record = store().personas.get(personaId)
  return record ? toPersona(record) : null
}

function toPersona(record: PersonaRecord): Persona {
  return {
    config: record.config,
    profile: activeProfile(record),
    videos: record.videos,
    versions: [...record.versions].sort((a, b) => a.version - b.version),
  }
}

export function getRawRecord(personaId: string): PersonaRecord | null {
  return store().personas.get(personaId) ?? null
}

// Create a brand new persona via configuration only (BRD 5.4). Starts unpublished
// with an empty profile v1 until videos are trained and it is explicitly published.
export function createPersona(input: {
  personaId: string
  displayName: string
  tagline: string
  accent?: string
  codeReviewStyle?: string
}): Persona {
  const s = store()
  if (s.personas.has(input.personaId)) {
    throw new Error(`Persona "${input.personaId}" already exists`)
  }
  const createdAt = new Date().toISOString()
  const record: PersonaRecord = {
    config: {
      personaId: input.personaId,
      displayName: input.displayName,
      tagline: input.tagline,
      avatar: "",
      accent: input.accent ?? "emerald",
      published: false,
      activeProfileVersion: 1,
      codeReviewStyle:
        input.codeReviewStyle ??
        "Give balanced, constructive feedback. Acknowledge strengths, then suggest improvements clearly.",
      createdAt,
    },
    versions: [
      {
        version: 1,
        createdAt,
        trademarkPhrases: [],
        teachingStructure: [],
        vocabulary: [],
        opinions: [],
        personalityTraits: [],
        sampleQA: [],
        referenceQuotes: [],
        sourceVideoIds: [],
      },
    ],
    videos: [],
  }
  s.personas.set(input.personaId, record)
  return toPersona(record)
}

// Append a new profile version (result of training). Does NOT publish it —
// human review + explicit publish is required (BRD 5.3).
export function addProfileVersion(
  personaId: string,
  profile: Omit<PersonaProfile, "version" | "createdAt">,
): PersonaProfile {
  const record = store().personas.get(personaId)
  if (!record) throw new Error(`Persona "${personaId}" not found`)
  const nextVersion = Math.max(...record.versions.map((v) => v.version)) + 1
  const newProfile: PersonaProfile = {
    ...profile,
    version: nextVersion,
    createdAt: new Date().toISOString(),
  }
  record.versions.push(newProfile)
  return newProfile
}

// Publish a specific profile version (makes it the active one).
export function publishVersion(personaId: string, version: number): void {
  const record = store().personas.get(personaId)
  if (!record) throw new Error(`Persona "${personaId}" not found`)
  const target = record.versions.find((v) => v.version === version)
  if (!target) throw new Error(`Version ${version} not found for persona "${personaId}"`)
  record.config.activeProfileVersion = version
  record.config.published = true
}

// Register or update a video in the trained-video registry.
export function registerVideo(personaId: string, video: TrainedVideo): void {
  const record = store().personas.get(personaId)
  if (!record) return
  const existing = record.videos.findIndex((v) => v.videoId === video.videoId)
  if (existing >= 0) {
    record.videos[existing] = video
  } else {
    record.videos.push(video)
  }
}
