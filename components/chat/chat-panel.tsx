"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ChatMessage, type PersonaMini, type UIMessage } from "@/components/chat/chat-message"
import { Composer } from "@/components/chat/composer"
import { streamChat } from "@/lib/client/chat-stream"
import type { ChatTurn } from "@/lib/personas/types"

const STARTERS = [
  "How do I start learning backend development?",
  "Explain closures in JavaScript",
  "Review this function for bugs",
  "Should I learn Next.js or plain React first?",
]

export function ChatPanel({ persona }: { persona: PersonaMini }) {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [codeReview, setCodeReview] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset conversation when persona changes (fresh context per persona).
  useEffect(() => {
    setMessages([])
    setStreaming(false)
    abortRef.current?.abort()
  }, [persona.personaId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const send = async (text: string) => {
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }))
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: "user", content: text }
    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", pending: true },
    ])
    setStreaming(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const patch = (u: Partial<UIMessage>) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, ...u } : m)))

    await streamChat(
      { personaId: persona.personaId, message: text, history, forceCodeReview: codeReview },
      {
        onMeta: (meta) => patch({ skillLevel: meta.skillLevel, codeReview: meta.codeReview }),
        onDraft: (draft) => patch({ draft }),
        onCritique: (c) => patch({ critiqueNotes: c.notes }),
        onDelta: (t) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + t, pending: false } : m,
            ),
          ),
        onDone: (d) =>
          patch({
            content: d.final,
            revised: d.revised,
            authenticityScore: d.authenticityScore,
            pending: false,
          }),
        onError: (message) => {
          patch({ content: `⚠️ ${message}`, pending: false })
          toast.error(message)
        },
      },
      ctrl.signal,
    ).catch((e) => {
      if (e?.name !== "AbortError") toast.error("Something went wrong")
    })

    setStreaming(false)
  }

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
    setMessages((prev) => prev.map((m) => (m.pending ? { ...m, pending: false } : m)))
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <EmptyState persona={persona} onPick={send} />
          ) : (
            messages.map((m) => <ChatMessage key={m.id} msg={m} persona={persona} />)
          )}
        </div>
      </div>
      <div className="border-t border-border bg-background/80 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto max-w-3xl">
          <Composer
            onSend={send}
            onStop={stop}
            streaming={streaming}
            codeReview={codeReview}
            onToggleCodeReview={() => setCodeReview((c) => !c)}
          />
          <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
            AI persona simulation for educational purposes. Not affiliated with the real educators.
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ persona, onPick }: { persona: PersonaMini; onPick: (t: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 pt-8 text-center">
      <div>
        <h2 className="text-balance text-2xl font-semibold">Chat with {persona.displayName}</h2>
        <p className="mt-2 text-pretty text-sm text-muted-foreground">
          Ask a question and the AI adapts its depth to your skill level. Toggle Code Review to get
          structured feedback.
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-card p-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
