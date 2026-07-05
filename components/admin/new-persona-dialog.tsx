"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const ACCENT_OPTIONS = ["emerald", "sky", "amber", "rose"] as const

const dotClass: Record<(typeof ACCENT_OPTIONS)[number], string> = {
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
}

export function NewPersonaDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (personaId: string) => void
}) {
  const [displayName, setDisplayName] = useState("")
  const [personaId, setPersonaId] = useState("")
  const [tagline, setTagline] = useState("")
  const [accentName, setAccentName] = useState<(typeof ACCENT_OPTIONS)[number]>("emerald")
  const [codeReviewStyle, setCodeReviewStyle] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setDisplayName("")
    setPersonaId("")
    setTagline("")
    setAccentName("emerald")
    setCodeReviewStyle("")
  }

  const idPreview = (personaId || displayName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const create = async () => {
    if (!displayName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          personaId: idPreview,
          displayName: displayName.trim(),
          tagline: tagline.trim(),
          accent: accentName,
          codeReviewStyle: codeReviewStyle.trim(),
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error ?? "Creation failed.")
      } else {
        toast.success(`Persona "${displayName}" created. Train it with videos to publish.`)
        onCreated(body.persona.personaId)
        onOpenChange(false)
        reset()
      }
    } catch {
      toast.error("Request failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New persona</DialogTitle>
          <DialogDescription>
            Create a new persona by configuration. Train it with YouTube videos to populate its
            profile, then publish.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <Field label="Display name *">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Primeagen"
              className="field-input"
            />
          </Field>

          <Field label={`Persona ID · "${idPreview || "auto-generated"}"`}>
            <input
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
              placeholder="Leave blank to auto-generate"
              className="field-input"
            />
          </Field>

          <Field label="Tagline">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One-line description"
              className="field-input"
            />
          </Field>

          <Field label="Accent colour">
            <div className="flex gap-2">
              {ACCENT_OPTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAccentName(a)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                    dotClass[a],
                    accentName === a ? "ring-foreground/60" : "ring-transparent",
                  )}
                  title={a}
                  aria-pressed={accentName === a}
                />
              ))}
            </div>
          </Field>

          <Field label="Code-review style (optional)">
            <textarea
              value={codeReviewStyle}
              onChange={(e) => setCodeReviewStyle(e.target.value)}
              rows={3}
              placeholder="Describe how this persona gives code feedback…"
              className="field-input resize-none"
            />
          </Field>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={submitting || !displayName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Create persona
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
