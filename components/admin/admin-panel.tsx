"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { ArrowLeft, Plus, Sparkles } from "lucide-react"
import { PersonaTrainer } from "@/components/admin/persona-trainer"
import { NewPersonaDialog } from "@/components/admin/new-persona-dialog"
import { PersonaAvatar } from "@/components/persona-avatar"
import { accent } from "@/lib/client/accents"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Flat shape returned by GET /api/personas
interface PersonaListItem {
  personaId: string
  displayName: string
  tagline: string
  avatar: string
  accent: string
  published: boolean
  activeProfileVersion: number
  versionCount: number
  videoCount: number
}

export function AdminPanel() {
  const { data, mutate, isLoading } = useSWR<{ personas: PersonaListItem[] }>(
    "/api/personas?all=1",
    fetcher,
  )
  const personas = data?.personas ?? []
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const active = activeId ? personas.find((p) => p.personaId === activeId) ?? null : null

  const handleCreated = (personaId: string) => {
    mutate()
    setActiveId(personaId)
  }

  return (
    <div className="flex h-dvh bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight">Training Panel</div>
            <div className="text-[0.7rem] text-muted-foreground">Manage personas</div>
          </div>
        </div>

        {/* Back to chat */}
        <div className="border-b border-border px-3 py-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to chat
          </Link>
        </div>

        {/* AI Model info */}
        <div className="border-b border-border px-4 py-3">
          <ModelBadge />
        </div>

        {/* Persona list */}
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
            Personas
          </span>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="New persona"
          >
            <Plus className="size-3.5" />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : personas.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              No personas yet. Create one to get started.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {personas.map((p) => (
                <SidebarItem
                  key={p.personaId}
                  persona={p}
                  isActive={p.personaId === activeId}
                  onSelect={() => setActiveId(p.personaId)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Main training area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {active ? (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-2xl">
              <PersonaTrainer personaId={active.personaId} onChange={() => mutate()} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="size-10 text-muted-foreground" />
            <div>
              <p className="text-balance font-semibold">Select a persona to train</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Or create a new one using the button in the sidebar.
              </p>
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" />
              Create persona
            </button>
          </div>
        )}
      </main>

      <NewPersonaDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={handleCreated} />
    </div>
  )
}

function SidebarItem({
  persona,
  isActive,
  onSelect,
}: {
  persona: PersonaListItem
  isActive: boolean
  onSelect: () => void
}) {
  const a = accent(persona.accent)
  return (
    <li>
      <button
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
          isActive ? "bg-accent" : "hover:bg-accent/50",
        )}
      >
        <PersonaAvatar
          src={persona.avatar}
          name={persona.displayName}
          accentName={persona.accent}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn("truncate text-sm font-medium", isActive && a.text)}>
              {persona.displayName}
            </span>
            {persona.published && (
              <span className={cn("shrink-0 text-[0.6rem] font-medium", a.text)}>LIVE</span>
            )}
          </div>
          <div className="truncate text-[0.7rem] text-muted-foreground">
            v{persona.activeProfileVersion} · {persona.videoCount} videos
          </div>
        </div>
      </button>
    </li>
  )
}

// ModelBadge is a server value exposed via env — shown client-side but the
// env var is read at build/render time. Use the NEXT_PUBLIC_ convention if
// needed; for now we just show the configured values that are available.
function ModelBadge() {
  const label = "Vercel AI Gateway"
  const model = "openai/gpt-4.1-mini"

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
        AI Provider
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="truncate text-[0.7rem] text-muted-foreground">{model}</span>
      <p className="mt-1 text-[0.65rem] text-muted-foreground">
        Set{" "}
        <code className="rounded bg-muted px-1 font-mono">PERSONA_CHAT_PROVIDER=ollama</code> or{" "}
        <code className="rounded bg-muted px-1 font-mono">openai</code> in env to switch.
      </p>
    </div>
  )
}
