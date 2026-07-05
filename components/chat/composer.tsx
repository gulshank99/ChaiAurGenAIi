"use client"

import { ArrowUp, Code2, Square } from "lucide-react"
import { useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function Composer({
  onSend,
  onStop,
  streaming,
  codeReview,
  onToggleCodeReview,
  disabled,
}: {
  onSend: (text: string) => void
  onStop: () => void
  streaming: boolean
  codeReview: boolean
  onToggleCodeReview: () => void
  disabled?: boolean
}) {
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || streaming || disabled) return
    onSend(trimmed)
    setValue("")
    if (ref.current) ref.current.style.height = "auto"
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-lg shadow-black/20">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          e.target.style.height = "auto"
          e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`
        }}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={
          codeReview
            ? "Paste code for review, or ask a question..."
            : "Ask anything — chai aur code..."
        }
        className="min-h-0 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
        disabled={disabled}
      />
      <div className="flex items-center justify-between px-1 pt-1">
        <button
          onClick={onToggleCodeReview}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
            codeReview
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={codeReview}
          title="Force code-review mode"
        >
          <Code2 className="size-3.5" />
          Code Review
        </button>

        {streaming ? (
          <button
            onClick={onStop}
            className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-muted"
            aria-label="Stop"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim() || disabled}
            className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
