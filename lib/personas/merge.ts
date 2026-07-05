import type { PersonaProfile, SampleQA } from "./types"

// Caps to prevent persona dilution during incremental merge (BRD 5.3 / 8.5).
const CAPS = {
  trademarkPhrases: 20,
  teachingStructure: 10,
  vocabulary: 15,
  opinions: 15,
  personalityTraits: 12,
  sampleQA: 12,
  referenceQuotes: 16,
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

// De-duplicate strings case-insensitively, preserving original casing and order.
function dedupeStrings(existing: string[], incoming: string[], cap: number): string[] {
  const seen = new Set(existing.map(norm))
  const merged = [...existing]
  for (const item of incoming) {
    const key = norm(item)
    if (key && !seen.has(key)) {
      seen.add(key)
      merged.push(item.trim())
    }
  }
  return merged.slice(0, cap)
}

function dedupeQA(existing: SampleQA[], incoming: SampleQA[], cap: number): SampleQA[] {
  const seen = new Set(existing.map((q) => norm(q.question)))
  const merged = [...existing]
  for (const qa of incoming) {
    const key = norm(qa.question)
    if (key && !seen.has(key)) {
      seen.add(key)
      merged.push(qa)
    }
  }
  return merged.slice(0, cap)
}

// Merge extracted attributes into an existing profile without replacing it (BRD 8.5).
// New content is added only when genuinely novel; existing content is preserved;
// totals are capped to prevent dilution.
export function mergeProfiles(
  base: PersonaProfile,
  incoming: Omit<PersonaProfile, "version" | "createdAt">,
): Omit<PersonaProfile, "version" | "createdAt"> {
  return {
    trademarkPhrases: dedupeStrings(base.trademarkPhrases, incoming.trademarkPhrases, CAPS.trademarkPhrases),
    teachingStructure: dedupeStrings(base.teachingStructure, incoming.teachingStructure, CAPS.teachingStructure),
    vocabulary: dedupeStrings(base.vocabulary, incoming.vocabulary, CAPS.vocabulary),
    opinions: dedupeStrings(base.opinions, incoming.opinions, CAPS.opinions),
    personalityTraits: dedupeStrings(base.personalityTraits, incoming.personalityTraits, CAPS.personalityTraits),
    sampleQA: dedupeQA(base.sampleQA, incoming.sampleQA, CAPS.sampleQA),
    referenceQuotes: dedupeStrings(base.referenceQuotes, incoming.referenceQuotes, CAPS.referenceQuotes),
    sourceVideoIds: dedupeStrings(base.sourceVideoIds, incoming.sourceVideoIds, 1000),
  }
}
