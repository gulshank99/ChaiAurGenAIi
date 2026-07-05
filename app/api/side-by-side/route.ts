import { getPersona } from "@/lib/personas/store"
import { classifySkillLevel, critique, detectCode, generateDraft } from "@/lib/ai/pipeline"

export const maxDuration = 60

interface SideBySideRequest {
  personaIds: string[]
  message: string
  forceCodeReview?: boolean
}

// POST /api/side-by-side — generate parallel responses from multiple personas (BRD 11.5).
export async function POST(req: Request) {
  const body = (await req.json()) as SideBySideRequest
  const { personaIds, message, forceCodeReview } = body

  if (!message?.trim()) return Response.json({ error: "message is required" }, { status: 400 })
  if (!Array.isArray(personaIds) || personaIds.length === 0) {
    return Response.json({ error: "personaIds array is required" }, { status: 400 })
  }

  const codeReview = forceCodeReview || detectCode(message)
  const skillLevel = await classifySkillLevel(message)

  const results = await Promise.all(
    personaIds.map(async (personaId) => {
      const persona = getPersona(personaId)
      if (!persona) return { personaId, error: "not found" }
      try {
        const draft = await generateDraft(persona, {
          userMessage: message,
          recent: [],
          skillLevel,
          codeReview,
        })
        const c = await critique(persona, draft)
        return {
          personaId,
          answer: draft,
          skillLevel,
          codeReview,
          authenticityScore: c.score,
          revised: false,
        }
      } catch (err) {
        return { personaId, error: err instanceof Error ? err.message : "Generation failed" }
      }
    }),
  )

  return Response.json({ results })
}
