"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

// Splits assistant/user text into prose and fenced code blocks and renders them.
export function MessageContent({ text }: { text: string }) {
  const parts = parseBlocks(text)
  return (
    <div className="space-y-3 leading-relaxed">
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock key={i} code={part.content} lang={part.lang} />
        ) : (
          <Prose key={i} text={part.content} />
        ),
      )}
    </div>
  )
}

function Prose({ text }: { text: string }) {
  // Render simple inline `code` spans and preserve line breaks.
  const lines = text.split("\n")
  return (
    <div className="whitespace-pre-wrap text-pretty text-sm md:text-[0.95rem]">
      {lines.map((line, i) => (
        <span key={i}>
          {renderInline(line)}
          {i < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </div>
  )
}

function renderInline(line: string) {
  const segs = line.split(/(`[^`]+`)/g)
  return segs.map((seg, i) => {
    if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 1) {
      return (
        <code
          key={i}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {seg.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{seg}</span>
  })
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-[oklch(0.13_0.006_285)]">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{lang || "code"}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3">
        <code className="font-mono text-[0.82rem] leading-relaxed text-foreground">{code}</code>
      </pre>
    </div>
  )
}

type Block = { type: "text" | "code"; content: string; lang?: string }

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const regex = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      const chunk = text.slice(last, m.index).trim()
      if (chunk) blocks.push({ type: "text", content: chunk })
    }
    blocks.push({ type: "code", content: m[2].replace(/\n$/, ""), lang: m[1] || undefined })
    last = regex.lastIndex
  }
  const tail = text.slice(last).trim()
  if (tail) blocks.push({ type: "text", content: tail })
  return blocks.length ? blocks : [{ type: "text", content: text }]
}

export { cn }
