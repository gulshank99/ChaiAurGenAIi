import { getPersona } from "@/lib/personas/store"
import { scoreConsistency } from "@/lib/ai/consistency"

export const maxDuration = 30

// POST /api/consistency — embedding-similarity authenticity score (BRD 11.4).
export async function POST(req: Request) {
  const { personaId, response } = await req.json()
  const persona = getPersona(personaId)
  if (!persona) return Response.json({ error: "Persona not found" }, { status: 404 })
  if (!response?.trim()) return Response.json({ error: "response is required" }, { status: 400 })

  try {
    const result = await scoreConsistency(persona, response)
    return Response.json(result)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Scoring failed" },
      { status: 500 },
    )
  }
}
