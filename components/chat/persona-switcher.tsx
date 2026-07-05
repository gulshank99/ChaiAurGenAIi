"use client"

import { PersonaAvatar } from "@/components/persona-avatar"
import { accent } from "@/lib/client/accents"
import type { PersonaMini } from "@/components/chat/chat-message"
import { cn } from "@/lib/utils"

export function PersonaSwitcher({
  personas,
  activeId,
  onSelect,
}: {
  personas: (PersonaMini & { tagline: string })[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {personas.map((p) => {
        const a = accent(p.accent)
        const active = p.personaId === activeId
        return (
          <button
            key={p.personaId}
            onClick={() => onSelect(p.personaId)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
              active ? cn(a.border, a.bgSoft) : "border-border bg-card hover:bg-accent",
            )}
            aria-pressed={active}
          >
            <PersonaAvatar
              src={p.avatar}
              name={p.displayName}
              accentName={p.accent}
              size={40}
            />
            <div className="min-w-0">
              <div className={cn("truncate text-sm font-semibold", active ? a.text : "text-foreground")}>
                {p.displayName}
              </div>
              <div className="truncate text-xs text-muted-foreground">{p.tagline}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
