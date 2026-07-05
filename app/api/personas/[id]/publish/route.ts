import { publishVersion } from "@/lib/personas/store"

// POST /api/personas/[id]/publish — promote a draft profile version to live (BRD 5.3).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const version = Number(body.version)
  if (!version || isNaN(version)) {
    return Response.json({ error: "version (number) is required" }, { status: 400 })
  }
  try {
    publishVersion(id, version)
    return Response.json({ ok: true, personaId: id, activeVersion: version })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Publish failed" }, { status: 422 })
  }
}
