import { addProfileVersion, getPersona, getRawRecord, registerVideo } from "@/lib/personas/store"
import { mergeProfiles } from "@/lib/personas/merge"
import {
  cleanTranscript,
  extractAttributes,
  extractVideoId,
  fetchTranscript,
  toProfileInput,
  TranscriptError,
} from "@/lib/ai/transcript"

export const maxDuration = 120

interface TrainRequest {
  personaId: string
  url: string
}

// POST /api/train — extend a persona with a new YouTube video (BRD 5.3).
// Creates a NEW, unpublished profile version. Failures never corrupt the
// existing published profile (BRD NFR: reliability).
export async function POST(req: Request) {
  const body = (await req.json()) as TrainRequest
  const persona = getPersona(body.personaId)
  if (!persona) return Response.json({ error: "Persona not found" }, { status: 404 })

  const videoId = extractVideoId(body.url ?? "")
  if (!videoId) {
    return Response.json(
      { error: "Could not extract a valid YouTube video ID from that URL." },
      { status: 400 },
    )
  }

  const addedAt = new Date().toISOString()
  registerVideo(body.personaId, {
    videoId,
    url: body.url,
    title: `Video ${videoId}`,
    status: "processing",
    addedAt,
  })

  try {
    // 1. Fetch captions (reject uncaptioned videos gracefully)
    const raw = await fetchTranscript(videoId)
    // 2. Clean (preserve wording)
    const cleaned = await cleanTranscript(raw)
    // 3. Extract structured attributes
    const attrs = await extractAttributes(persona.config.displayName, cleaned)
    const extracted = toProfileInput(attrs, [videoId])

    // 4. Decide mode: initial build vs incremental merge (BRD 5.3)
    const active = persona.profile
    const hasContent = active.trademarkPhrases.length > 0 || active.sampleQA.length > 0
    const mode = hasContent ? "merge" : "initial"
    const merged = hasContent ? mergeProfiles(active, extracted) : extracted

    // 5. Create a new, UNPUBLISHED version (human review + publish required)
    const newVersion = addProfileVersion(body.personaId, merged)

    // 6. Record video as trained
    registerVideo(body.personaId, {
      videoId,
      url: body.url,
      title: `Video ${videoId}`,
      status: "trained",
      addedAt,
      mergedIntoVersion: newVersion.version,
    })

    const record = getRawRecord(body.personaId)!
    return Response.json({
      mode,
      version: newVersion,
      activeVersion: record.config.activeProfileVersion,
      videoId,
      message: `Draft profile v${newVersion.version} created (${mode}). Review and publish to make it live.`,
    })
  } catch (err) {
    const message =
      err instanceof TranscriptError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Training failed."
    // Mark video failed; existing published profile is untouched.
    registerVideo(body.personaId, {
      videoId,
      url: body.url,
      title: `Video ${videoId}`,
      status: "failed",
      addedAt,
      error: message,
    })
    return Response.json({ error: message }, { status: 422 })
  }
}
