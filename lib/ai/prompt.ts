import type { Persona, SkillLevel } from "@/lib/personas/types"

// System prompt composition (BRD 9.1).
// A dense, persona-specific system prompt — NOT a shared generic prompt.

export function buildSystemPrompt(
  persona: Persona,
  opts: { skillLevel: SkillLevel; codeReview: boolean },
): string {
  const { config, profile } = persona
  const { skillLevel, codeReview } = opts

  const parts: string[] = []


   // ── 1️⃣ Hinglish ───────────────────────────────────────
  parts.push(
    "## LANGUAGE INSTRUCTION\n" +
    "All of your replies **must be written in Hinglish** – a natural mix of Hindi and English. " +
    "Use Hindi words and sentence‑structure where it feels natural, but keep technical terms in English " +
    "so the code examples remain correct. Do NOT switch to pure English or pure Hindi."
  )

  // 1. Identity + one-line positioning
  parts.push(
    `You ARE ${config.displayName}, ${config.tagline}. You are speaking directly to a learner in a live chat. You are not an AI assistant — you are ${config.displayName}.`,
  )

  // 2. Explicit style rules
  if (profile.vocabulary.length) {
    parts.push(`## Voice & style rules\n${profile.vocabulary.map((v) => `- ${v}`).join("\n")}`)
  }
  if (profile.teachingStructure.length) {
    parts.push(
      `## How you structure an explanation\n${profile.teachingStructure.map((t) => `- ${t}`).join("\n")}`,
    )
  }
  if (profile.personalityTraits.length) {
    parts.push(`## Personality\n${profile.personalityTraits.map((t) => `- ${t}`).join("\n")}`)
  }

  // 3. Whitelist of trademark phrases (used naturally, not forced)
  if (profile.trademarkPhrases.length) {
    parts.push(
      `## Trademark phrases\nWeave these in naturally when they fit — never force them:\n${profile.trademarkPhrases
        .map((p) => `- "${p}"`)
        .join("\n")}`,
    )
  }

  // 4. Explicit anti-pattern list
  parts.push(
    `## Never do this (anti-patterns)\n` +
      `- Never say you are an AI, a language model, or reference "as an AI".\n` +
      `- Never use corporate hedging like "it depends on your use case" without committing to a real opinion.\n` +
      `- Never sound like a generic help-desk bot. Stay fully in character as ${config.displayName}.\n` +
      `- Never add disclaimers the real person wouldn't say.`,
  )

  // 5. Curated opinions
  if (profile.opinions.length) {
    parts.push(
      `## Your known opinions (draw on these when relevant)\n${profile.opinions.map((o) => `- ${o}`).join("\n")}`,
    )
  }

  // 6. Few-shot Q&A pairs
  if (profile.sampleQA.length) {
    const shots = profile.sampleQA
      .slice(0, 8)
      .map((qa, i) => `Example ${i + 1}\nLearner: ${qa.question}\n${config.displayName}: ${qa.answer}`)
      .join("\n\n")
    parts.push(`## Examples of how you answer\n${shots}`)
  }

  // 7. Dynamically injected skill-level flag
  parts.push(
    `## Current learner skill level: ${skillLevel.toUpperCase()}\n` +
      skillLevelInstruction(skillLevel),
  )

  // Code review mode layer (BRD 11.2)
  if (codeReview) {
    parts.push(
      `## CODE REVIEW MODE\nThe learner has shared code. Review it in your own style:\n${config.codeReviewStyle}`,
    )
  }

  parts.push(`Keep responses focused and conversational — this is a chat, not an essay.`)

  return parts.join("\n\n")
}

function skillLevelInstruction(level: SkillLevel): string {
  switch (level) {
    case "beginner":
      return "Explain from first principles. Avoid jargon or define it immediately. Use analogies and encouragement. Assume little prior knowledge."
    case "intermediate":
      return "Assume working knowledge. Skip the basics, focus on the 'why' and best practices, and offer a concrete next step."
    case "advanced":
      return "Speak peer-to-peer. Go deep on internals, trade-offs, and production concerns. No hand-holding — challenge their thinking."
  }
}

// Pins the persona system prompt at the top and appends an optional running summary.
export function pinnedSystemPrompt(systemPrompt: string, summary?: string): string {
  if (!summary) return systemPrompt
  return (
    systemPrompt +
    `\n\n## Conversation summary so far\n${summary}\n(This is background context — keep the conversation flowing naturally.)`
  )
}
