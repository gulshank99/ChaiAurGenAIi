"use client"

import { useState } from "react"
import { toast } from "sonner"
import { MessageContent } from "@/components/message-content"
import { PersonaAvatar } from "@/components/persona-avatar"
import { SkillBadge } from "@/components/skill-badge"
import { Composer } from "@/components/chat/composer"
import type { PersonaMini } from "@/components/chat/chat-message"
import { accent } from "@/lib/client/accents"
import type { SkillLevel } from "@/lib/personas/types"
import { cn } from "@/lib/utils"

interface SideResult {
  personaId: string
  answer: string
  skillLevel: SkillLevel
  codeReview: boolean
  authenticityScore: number
  revised: boolean
}

export function SideBySide({ personas }: { personas: (PersonaMini & { tagline: string })[] }) {
  const [prompt, setPrompt] = useState<string>("")
  const [results, setResults] = useState<Record<string, SideResult>>({})
  const [loading, setLoading] = useState(false)
  const [codeReview, setCodeReview] = useState(false)

  const compare = async (text: string) => {
    setPrompt(text)
    setResults({})
    setLoading(true)
    try {
      const res = await fetch("/api/side-by-side", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          personaIds: personas.map((p) => p.personaId),
          forceCodeReview: codeReview,
        }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = (await res.json()) as { results: SideResult[] }
      const map: Record<string, SideResult> = {}
      for (const r of data.results) map[r.personaId] = r
      setResults(map)
    } catch {
      toast.error("Comparison failed. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-5xl">
          {prompt && (
            <div className="mb-5 flex justify-center">
              <div className="rounded-2xl border border-border bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
                {prompt}
              </div>
            </div>
          )}

          {!prompt ? (
            <div className="pt-10 text-center">
              <h2 className="text-balance text-2xl font-semibold">Ask both mentors at once</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Send one question and compare how each persona answers, side by side.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {personas.map((p) => {
                const a = accent(p.accent)
                const r = results[p.personaId]
                return (
                  <div key={p.personaId} className={cn("flex flex-col rounded-2xl border bg-card", a.border)}>
                    <div className="flex items-center gap-2.5 border-b border-border p-3">
                      <PersonaAvatar
                        src={p.avatar}
                        name={p.displayName}
                        accentName={p.accent}
                        size={34}
                      />
                      <div>
                        <div className={cn("text-sm font-semibold", a.text)}>{p.displayName}</div>
                        <div className="text-xs text-muted-foreground">{p.tagline}</div>
                      </div>
                    </div>
                    <div className="flex-1 p-4">
                      {loading && !r ? (
                        <div className="space-y-2">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-3 animate-pulse rounded bg-muted"
                              style={{ width: `${90 - i * 15}%` }}
                            />
                          ))}
                        </div>
                      ) : r ? (
                        <>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <SkillBadge level={r.skillLevel} />
                            <span className="text-[0.7rem] text-muted-foreground">
                              Authenticity {r.authenticityScore}/10
                            </span>
                          </div>
                          <MessageContent text={r.answer} />
                        </>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background/80 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto max-w-3xl">
          <Composer
            onSend={compare}
            onStop={() => {}}
            streaming={loading}
            codeReview={codeReview}
            onToggleCodeReview={() => setCodeReview((c) => !c)}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  )
}
