"use client"

import useSWR from "swr"
import Link from "next/link"
import { Columns2, MessageSquare, Settings2, Sparkles } from "lucide-react"
import { useState } from "react"
import { ChatPanel } from "@/components/chat/chat-panel"
import { SideBySide } from "@/components/chat/side-by-side"
import { PersonaSwitcher } from "@/components/chat/persona-switcher"
import type { PersonaMini } from "@/components/chat/chat-message"
import { cn } from "@/lib/utils"

type PersonaListItem = PersonaMini & { tagline: string }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Mode = "single" | "compare"

export function Workspace() {
  const { data, isLoading } = useSWR<{ personas: PersonaListItem[] }>("/api/personas", fetcher)
  const personas = data?.personas ?? []
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("single")

  const active = personas.find((p) => p.personaId === activeId) ?? personas[0] ?? null

  return (
    <div className="flex h-dvh bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight">PersonaChat AI</div>
            <div className="text-[0.7rem] text-muted-foreground">Dual-persona simulator</div>
          </div>
        </div>

        <div className="flex flex-col gap-1 px-3 py-3">
          <ModeButton
            icon={MessageSquare}
            label="Single chat"
            active={mode === "single"}
            onClick={() => setMode("single")}
          />
          <ModeButton
            icon={Columns2}
            label="Side-by-side"
            active={mode === "compare"}
            onClick={() => setMode("compare")}
          />
        </div>

        <div className="px-4 pb-2 pt-1 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          Personas
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            mode === "single" &&
            active && (
              <PersonaSwitcher
                personas={personas}
                activeId={active.personaId}
                onSelect={setActiveId}
              />
            )
          )}
          {mode === "compare" && (
            <p className="px-1 text-xs text-muted-foreground">
              All published personas will be compared.
            </p>
          )}
        </div>

        <div className="border-t border-border p-3">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Settings2 className="size-4" />
            Training panel
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold">PersonaChat AI</span>
          </div>
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">
            <Settings2 className="size-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : personas.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="size-10 text-muted-foreground" />
            <div>
              <p className="text-balance font-semibold">No personas yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Go to the{" "}
                <Link href="/admin" className="underline hover:text-foreground">
                  training panel
                </Link>{" "}
                to create one.
              </p>
            </div>
          </div>
        ) : mode === "compare" ? (
          <SideBySide personas={personas} />
        ) : active ? (
          <ChatPanel persona={active} />
        ) : null}
      </main>
    </div>
  )
}

function ModeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
      aria-pressed={active}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}
