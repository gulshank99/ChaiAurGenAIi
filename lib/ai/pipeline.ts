import { generateText, generateObject, streamText } from "ai"
import { z } from "zod"
import type { Persona, ChatTurn, SkillLevel } from "@/lib/personas/types"
import { AUTHENTICITY_THRESHOLD, CONTEXT_WINDOW_TURNS } from "./config"
import { getChatModel } from "./provider"
import { buildSystemPrompt, pinnedSystemPrompt } from "./prompt"

// ---- Skill-level classification (BRD 11.3) ----

export async function classifySkillLevel(question: string): Promise<SkillLevel> {
  try {
    const { object } = await generateObject({
      model: getChatModel(),
      schema: z.object({
        level: z.enum(["beginner", "intermediate", "advanced"]),
      }),
      system:
        "Classify the apparent programming skill level of the person asking, based only on their message. " +
        "beginner = basic/introductory questions, unsure phrasing. intermediate = working knowledge, specific how-to. " +
        "advanced = deep architecture, performance, trade-off, or systems questions.",
      prompt: question,
    })
    return object.level
  } catch {
    return "intermediate"
  }
}

// ---- Code-review detection (BRD 11.2) ----

export function detectCode(message: string): boolean {
  if (/```/.test(message)) return true
  // Heuristic: several lines that look like code.
  const codeSignals = [
    /function\s+\w+\s*\(/,
    /=>/,
    /;\s*$/m,
    /\bconst\b|\blet\b|\bvar\b/,
    /\bimport\b.+\bfrom\b/,
    /<\/?[a-z][\s\S]*>/,
  ]
  const hits = codeSignals.filter((r) => r.test(message)).length
  return hits >= 2 && message.split("\n").length >= 3
}

// ---- Context management: sliding window + running summary (BRD 5.6 / 10) ----

export async function buildContext(history: ChatTurn[]): Promise<{
  recent: ChatTurn[]
  summary?: string
}> {
  if (history.length <= CONTEXT_WINDOW_TURNS) {
    return { recent: history }
  }
  const older = history.slice(0, history.length - CONTEXT_WINDOW_TURNS)
  const recent = history.slice(history.length - CONTEXT_WINDOW_TURNS)
  const summary = await summarize(older)
  return { recent, summary }
}

async function summarize(turns: ChatTurn[]): Promise<string> {
  try {
    const transcript = turns
      .map((t) => `${t.role === "user" ? "Learner" : "Mentor"}: ${t.content}`)
      .join("\n")
    const { text } = await generateText({
      model: getChatModel(),
      system:
        "Summarize this conversation so far in 3-5 concise bullet points, preserving what the learner is working on, " +
        "decisions made, and open questions. Do not add commentary.",
      prompt: transcript,
    })
    return text
  } catch {
    return ""
  }
}

// ---- Generate-then-critique loop (BRD 9.2) ----

const messagesFor = (recent: ChatTurn[], userMessage: string) => [
  ...recent.map((t) => ({ role: t.role, content: t.content })),
  { role: "user" as const, content: userMessage },
]

export async function generateDraft(
  persona: Persona,
  opts: {
    userMessage: string
    recent: ChatTurn[]
    summary?: string
    skillLevel: SkillLevel
    codeReview: boolean
  },
): Promise<string> {
  const system = pinnedSystemPrompt(
    buildSystemPrompt(persona, { skillLevel: opts.skillLevel, codeReview: opts.codeReview }),
    opts.summary,
  )
  const { text } = await generateText({
    model: getChatModel(),
    system,
    messages: messagesFor(opts.recent, opts.userMessage),
  })
  return text
}

export interface CritiqueResult {
  score: number
  notes: string
  needsRevision: boolean
}

// Critique the draft against an authenticity checklist (BRD 9.2).
export async function critique(persona: Persona, draft: string): Promise<CritiqueResult> {
  try {
    const { object } = await generateObject({
      model: getChatModel(),
      schema: z.object({
        score: z.number().min(0).max(10),
        notes: z.string(),
      }),
      system:
        `You are an authenticity auditor for a persona chatbot imitating ${persona.config.displayName}.\n` +
        `Score the draft response from 0-10 on how authentically it matches this persona, checking:\n` +
        `- Tone match (${persona.profile.vocabulary.join("; ")})\n` +
        `- Natural presence of expected phrasing (${persona.profile.trademarkPhrases.slice(0, 6).join("; ")})\n` +
        `- Absence of generic AI-assistant voice or corporate hedging\n` +
        `Give a short note on what to fix. Be strict: generic-sounding output scores below ${AUTHENTICITY_THRESHOLD}.`,
      prompt: draft,
    })
    return {
      score: object.score,
      notes: object.notes,
      needsRevision: object.score < AUTHENTICITY_THRESHOLD,
    }
  } catch {
    return { score: AUTHENTICITY_THRESHOLD, notes: "Critique skipped (error).", needsRevision: false }
  }
}

// Stream the final response. If the draft needs revision, stream a corrected
// version; otherwise stream the (already-authentic) draft back token-by-token.
export function streamFinal(
  persona: Persona,
  opts: {
    draft: string
    critiqueNotes: string
    needsRevision: boolean
    skillLevel: SkillLevel
    codeReview: boolean
    recent: ChatTurn[]
    userMessage: string
    summary?: string
  },
) {
  const system = pinnedSystemPrompt(
    buildSystemPrompt(persona, { skillLevel: opts.skillLevel, codeReview: opts.codeReview }),
    opts.summary,
  )
  return streamText({
    model: getChatModel(),
    system:
      system +
      `\n\n## Revision task\nHere is your draft reply. An authenticity check flagged: "${opts.critiqueNotes}". ` +
      `Rewrite it so it sounds unmistakably like ${persona.config.displayName} — fix the flagged issues, keep it in character, ` +
      `keep the useful content. Reply with ONLY the improved message, nothing else.`,
    prompt: `Draft:\n${opts.draft}`,
  })
}
