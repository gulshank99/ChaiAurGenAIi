"use client"

import { ChevronDown, Sparkles, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { MessageContent } from "@/components/message-content"
import { PersonaAvatar } from "@/components/persona-avatar"
import { SkillBadge } from "@/components/skill-badge"
import { accent } from "@/lib/client/accents"
import type { SkillLevel } from "@/lib/personas/types"
import { cn } from "@/lib/utils"

export interface UIMessage {
  id: string
  role: "user" | "assistant"
  content: string
  pending?: boolean
  skillLevel?: SkillLevel
  codeReview?: boolean
  revised?: boolean
  authenticityScore?: number
  critiqueNotes?: string
  draft?: string
}

export interface PersonaMini {
  personaId: string
  displayName: string
  avatar: string
  accent: string
}

export function ChatMessage({ msg, persona }: { msg: UIMessage; persona: PersonaMini }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-border bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
          <MessageContent text={msg.content} />
        </div>
      </div>
    )
  }

  const a = accent(persona.accent)
  return (
    <div className="flex gap-3">
      <PersonaAvatar
        src={persona.avatar}
        name={persona.displayName}
        accentName={persona.accent}
        size={36}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className={cn("text-sm font-semibold", a.text)}>{persona.displayName}</span>
          {msg.codeReview && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">
              <ShieldCheck className="size-3" /> Code Review
            </span>
          )}
          {msg.skillLevel && <SkillBadge level={msg.skillLevel} />}
        </div>

        <div className={cn("rounded-2xl rounded-tl-sm border px-4 py-3", a.bubble)}>
          {msg.pending && !msg.content ? (
            <ThinkingDots />
          ) : (
            <MessageContent text={msg.content} />
          )}
        </div>

        {(msg.revised || typeof msg.authenticityScore === "number") && !msg.pending && (
          <QualityDetails msg={msg} accentText={a.text} />
        )}
      </div>
    </div>
  )
}

function QualityDetails({ msg, accentText }: { msg: UIMessage; accentText: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Sparkles className={cn("size-3", accentText)} />
        Authenticity {msg.authenticityScore ?? "—"}/10
        {msg.revised && <span className="text-muted-foreground">· self-revised</span>}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1.5 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {msg.critiqueNotes && (
            <p>
              <span className="font-medium text-foreground">Critic notes: </span>
              {msg.critiqueNotes}
            </p>
          )}
          {msg.revised && msg.draft && (
            <details>
              <summary className="cursor-pointer font-medium text-foreground">View original draft</summary>
              <p className="mt-1 whitespace-pre-wrap opacity-80">{msg.draft}</p>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}
