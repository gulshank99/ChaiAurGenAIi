import { YoutubeTranscript } from "youtube-transcript"
import { fetchWithBrowserHeaders } from "./fetchProxy"
import { generateText, generateObject } from "ai"
import { z } from "zod"
import { getChatModel } from "./provider"
import type { PersonaProfile } from "@/lib/personas/types"

// ---- YouTube URL / ID handling (BRD 5.3) ----
// Supports standard, short (youtu.be), and Shorts URL formats.
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim()
  // Already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m) return m[1]
  }
  return null
}

export class TranscriptError extends Error {}

// ---- Transcript fetch via captions (BRD 5.3 / 8.2) ----
// Videos without captions are rejected, not run through speech-to-text.
export async function fetchTranscript(videoId: string): Promise<string> {
  // The youtube-transcript library uses the global `fetch`. Vercel's default
  // Node fetch does not include a realistic User‑Agent, causing YouTube to
  // block the request. We temporarily replace `globalThis.fetch` with a
  // version that adds a common browser User‑Agent header.
  const originalFetch = (globalThis as any).fetch as typeof fetch
  ;(globalThis as any).fetch = fetchWithBrowserHeaders as any
  let items
  try {
    items = await YoutubeTranscript.fetchTranscript(videoId)
  } catch {
    throw new TranscriptError(
      "No captions available for this video. Only captioned videos can be used for training.",
    )
  } finally {
    // Restore the original fetch to avoid side‑effects for other code.
    ;(globalThis as any).fetch = originalFetch
  }
  if (!items || items.length === 0) {
    throw new TranscriptError("Transcript was empty. This video has no usable captions.")
  }
  const raw = items
    .map((i) => i.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  if (raw.length < 200) {
    throw new TranscriptError("Transcript too short to characterize a persona.")
  }
  return raw
}

// ---- Cleaning (BRD 8.3) ----
// Punctuation/formatting normalized; wording and stylistic filler are PRESERVED.
export async function cleanTranscript(raw: string): Promise<string> {
  const truncated = raw.slice(0, 12000)
  try {
    const { text } = await generateText({
      model: getChatModel(),
      system:
        "Clean up this raw auto-caption transcript: fix punctuation, capitalization, and sentence breaks ONLY. " +
        "Do NOT paraphrase, do NOT remove filler words, do NOT change wording or slang. Preserve the speaker's exact style. " +
        "Return only the cleaned transcript.",
      prompt: truncated,
    })
    return text
  } catch {
    return truncated
  }
}

// ---- Persona attribute extraction (BRD 8.4) ----
const extractionSchema = z.object({
  trademarkPhrases: z
    .array(z.string())
    .describe("Verbatim catchphrases and repeated expressions the speaker uses"),
  teachingStructure: z
    .array(z.string())
    .describe("How the speaker structures explanations, as short bullet descriptions"),
  vocabulary: z
    .array(z.string())
    .describe("Notes on vocabulary, speech rhythm, and language mix (e.g. Hinglish ratio)"),
  opinions: z
    .array(z.string())
    .describe("Recurring opinions and stances the speaker expresses"),
  personalityTraits: z.array(z.string()).describe("Humor and personality traits"),
  sampleQA: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("Representative Q&A pairs modeled on the speaker's actual style"),
  referenceQuotes: z
    .array(z.string())
    .describe("Verbatim authentic quotes usable as consistency-scoring references"),
})

export type ExtractedAttributes = z.infer<typeof extractionSchema>

export async function extractAttributes(
  personaName: string,
  cleanedTranscript: string,
): Promise<ExtractedAttributes> {
  const { object } = await generateObject({
    model: getChatModel(),
    schema: extractionSchema,
    system:
      `Extract a structured persona profile for "${personaName}" from this transcript. ` +
      `Capture their authentic style: verbatim trademark phrases, how they structure teaching, vocabulary/speech rhythm, ` +
      `recurring opinions, humor/personality, sample Q&A pairs in their voice, and verbatim reference quotes. ` +
      `Prefer quality over quantity. This is a starting draft for human review.`,
    prompt: cleanedTranscript.slice(0, 14000),
  })
  return object
}

// Convert extracted attributes into the profile shape (minus version/date).
export function toProfileInput(
  attrs: ExtractedAttributes,
  sourceVideoIds: string[],
): Omit<PersonaProfile, "version" | "createdAt"> {
  return {
    trademarkPhrases: attrs.trademarkPhrases,
    teachingStructure: attrs.teachingStructure,
    vocabulary: attrs.vocabulary,
    opinions: attrs.opinions,
    personalityTraits: attrs.personalityTraits,
    sampleQA: attrs.sampleQA,
    referenceQuotes: attrs.referenceQuotes,
    sourceVideoIds,
  }
}
