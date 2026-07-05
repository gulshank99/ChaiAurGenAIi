import type { SkillLevel, ChatTurn } from "@/lib/personas/types"

export interface StreamCallbacks {
  onMeta?: (meta: { skillLevel: SkillLevel; codeReview: boolean }) => void
  onDraft?: (draft: string) => void
  onCritique?: (c: { score: number; notes: string; needsRevision: boolean }) => void
  onDelta?: (text: string) => void
  onDone?: (d: { final: string; revised: boolean; authenticityScore: number }) => void
  onError?: (message: string) => void
}

// Streams the /api/chat ndjson protocol and dispatches typed callbacks.
export async function streamChat(
  body: { personaId: string; message: string; history: ChatTurn[]; forceCodeReview?: boolean },
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok || !res.body) {
    callbacks.onError?.(`Request failed (${res.status})`)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (!line.trim()) continue
      dispatch(line, callbacks)
    }
  }
  if (buffer.trim()) dispatch(buffer, callbacks)
}

function dispatch(line: string, cb: StreamCallbacks) {
  let evt: Record<string, unknown>
  try {
    evt = JSON.parse(line)
  } catch {
    return
  }
  switch (evt.type) {
    case "meta":
      cb.onMeta?.({ skillLevel: evt.skillLevel as SkillLevel, codeReview: Boolean(evt.codeReview) })
      break
    case "draft":
      cb.onDraft?.(evt.draft as string)
      break
    case "critique":
      cb.onCritique?.({
        score: evt.score as number,
        notes: evt.notes as string,
        needsRevision: Boolean(evt.needsRevision),
      })
      break
    case "delta":
      cb.onDelta?.(evt.text as string)
      break
    case "done":
      cb.onDone?.({
        final: evt.final as string,
        revised: Boolean(evt.revised),
        authenticityScore: evt.authenticityScore as number,
      })
      break
    case "error":
      cb.onError?.(evt.message as string)
      break
  }
}
