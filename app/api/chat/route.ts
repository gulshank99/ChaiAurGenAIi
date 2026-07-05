import { getPersona } from "@/lib/personas/store"
import type { ChatTurn } from "@/lib/personas/types"
import {
  buildContext,
  classifySkillLevel,
  critique,
  detectCode,
  generateDraft,
  streamFinal,
} from "@/lib/ai/pipeline"

export const maxDuration = 60

interface ChatRequest {
  personaId: string
  message: string
  history?: ChatTurn[]
  forceCodeReview?: boolean
}

// Streams the full generate-then-critique pipeline as newline-delimited JSON events.
export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest
  const persona = getPersona(body.personaId)

  if (!persona) {
    return new Response(JSON.stringify({ error: "Persona not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    })
  }
  if (!body.message?.trim()) {
    return new Response(JSON.stringify({ error: "Empty message" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  const history = body.history ?? []
  const codeReview = body.forceCodeReview || detectCode(body.message)

  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController, obj: unknown) =>
    controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"))

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Skill-level classification (BRD 11.3)
        const skillLevel = await classifySkillLevel(body.message)
        send(controller, { type: "meta", skillLevel, codeReview })

        // 2. Context management (BRD 10)
        const { recent, summary } = await buildContext(history)

        // 3. Generate draft (BRD 9.2)
        const draft = await generateDraft(persona, {
          userMessage: body.message,
          recent,
          summary,
          skillLevel,
          codeReview,
        })
        send(controller, { type: "draft", draft })

        // 4. Critique (BRD 9.2)
        const c = await critique(persona, draft)
        send(controller, { type: "critique", score: c.score, notes: c.notes, needsRevision: c.needsRevision })

        // 5. Stream the final response.
        let final = ""
        if (c.needsRevision) {
          const result = streamFinal(persona, {
            draft,
            critiqueNotes: c.notes,
            needsRevision: true,
            skillLevel,
            codeReview,
            recent,
            userMessage: body.message,
            summary,
          })
          for await (const delta of result.textStream) {
            final += delta
            send(controller, { type: "delta", text: delta })
          }
        } else {
          // Draft already authentic — stream it back in small chunks for a live feel.
          final = draft
          const tokens = draft.match(/\S+\s*/g) ?? [draft]
          for (const t of tokens) {
            send(controller, { type: "delta", text: t })
            await new Promise((r) => setTimeout(r, 12))
          }
        }

        send(controller, { type: "done", final, revised: c.needsRevision, authenticityScore: c.score })
        controller.close()
      } catch (err) {
        send(controller, {
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  })
}
