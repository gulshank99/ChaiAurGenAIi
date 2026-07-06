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
  // The youtube-transcript library accepts an optional `fetch` implementation
  // via its second argument. Supplying our `fetchWithBrowserHeaders` avoids the
  // need to globally monkey‑patch `fetch` and prevents recursion with Next.js'
  // internal `patchFetch` wrapper.
  let items;
  try {
    items = await YoutubeTranscript.fetchTranscript(videoId, { fetch: fetchWithBrowserHeaders });
  } catch (innerErr) {
    // If a YouTube API key is configured, attempt to fetch captions via the
    // official YouTube Data API as a fallback. This avoids IP‑based blocking
    // because the request is authenticated.
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const captionListResp = await fetchWithBrowserHeaders(
          `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`,
        );
        if (!captionListResp.ok) throw new Error('Caption list request failed');
        const listData = await captionListResp.json();
        const captionId = listData.items?.[0]?.id;
        if (!captionId) throw new Error('No caption tracks found via API');
        const captionResp = await fetchWithBrowserHeaders(
          `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt&key=${apiKey}`,
        );
        if (!captionResp.ok) throw new Error('Caption download failed');
        const srt = await captionResp.text();
        // Convert simple SRT to the same shape expected (array of {text}).
        const srtLines = srt.split(/\r?\n/);
        const srtItems = [];
        for (let i = 0; i < srtLines.length; i++) {
          const line = srtLines[i].trim();
          if (/^\d+$/.test(line)) {
            // index line, skip
            const text = srtLines[i + 2] ?? '';
            srtItems.push({ text });
            i += 3; // skip timestamp and blank line
          }
        }
        items = srtItems as any;
      } catch (apiErr) {
        // If the API fallback also fails, fall through to the generic error.
        console.error('YouTube API fallback failed:', apiErr);
        throw innerErr;
      }
    } else {
      // No API key – rethrow the original error to be handled below.
      throw innerErr;
    }
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
