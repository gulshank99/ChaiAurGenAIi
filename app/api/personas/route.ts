import { createPersona, listPersonas } from "@/lib/personas/store"

// GET /api/personas — list personas. Add ?all=1 to include unpublished (admin).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get("all") === "1"
  const personas = listPersonas({ publishedOnly: !all })
  return Response.json({
    personas: personas.map((p) => ({
      personaId: p.config.personaId,
      displayName: p.config.displayName,
      tagline: p.config.tagline,
      avatar: p.config.avatar,
      accent: p.config.accent,
      published: p.config.published,
      activeProfileVersion: p.config.activeProfileVersion,
      versionCount: p.versions.length,
      videoCount: p.videos.length,
    })),
  })
}

// POST /api/personas — create a new persona (BRD 5.4).
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.displayName?.trim()) {
    return Response.json({ error: "displayName is required" }, { status: 400 })
  }
  const personaId =
    body.personaId?.trim() ||
    body.displayName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

  try {
    const persona = createPersona({
      personaId,
      displayName: body.displayName.trim(),
      tagline: body.tagline?.trim() ?? "",
      accent: body.accent ?? "emerald",
      codeReviewStyle: body.codeReviewStyle?.trim() ?? "",
    })
    return Response.json({ persona: { personaId: persona.config.personaId, displayName: persona.config.displayName } })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Creation failed" }, { status: 409 })
  }
}
