import { getPersona } from "@/lib/personas/store"

// GET /api/personas/[id] — full persona detail (config + active profile + versions + videos).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const persona = getPersona(id)
  if (!persona) {
    return Response.json({ error: "Persona not found" }, { status: 404 })
  }
  return Response.json({ persona })
}
