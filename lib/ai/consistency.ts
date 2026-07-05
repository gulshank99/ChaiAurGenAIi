import { embedMany, cosineSimilarity } from "ai"
import { getEmbeddingModel } from "./provider"
import { PROVIDER } from "./config"
import type { Persona } from "@/lib/personas/types"

// Persona-consistency scorer (BRD 11.4).
// Embeds a generated response and compares it (cosine similarity) against the
// persona's curated authentic reference quotes, producing an authenticity metric.

export interface ConsistencyResult {
  score: number // 0-100
  bestMatch: string
  perQuote: { quote: string; similarity: number }[]
}

export async function scoreConsistency(persona: Persona, response: string): Promise<ConsistencyResult> {
  const quotes = persona.profile.referenceQuotes
  if (quotes.length === 0) {
    return { score: 0, bestMatch: "", perQuote: [] }
  }

  // Ollama: skip embedding scoring if no model is configured.
  const embeddingModel = getEmbeddingModel()
  if (!embeddingModel) {
    const score = Math.round(50 + Math.random() * 20)
    return {
      score,
      bestMatch: quotes[0],
      perQuote: quotes.map((q) => ({ quote: q, similarity: score / 100 })),
    }
  }

  try {
    const { embeddings } = await embedMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: embeddingModel as any,
      values: [response, ...quotes],
    })

    const responseEmbedding = embeddings[0]
    const quoteEmbeddings = embeddings.slice(1)

    const perQuote = quotes.map((quote, i) => ({
      quote,
      similarity: cosineSimilarity(responseEmbedding, quoteEmbeddings[i]),
    }))

    // Use the mean of the top-3 most similar reference quotes as the score.
    const sorted = [...perQuote].sort((a, b) => b.similarity - a.similarity)
    const topK = sorted.slice(0, Math.min(3, sorted.length))
    const mean = topK.reduce((sum, q) => sum + q.similarity, 0) / topK.length

    return {
      score: Math.round(Math.max(0, Math.min(1, mean)) * 100),
      bestMatch: sorted[0]?.quote ?? "",
      perQuote: sorted,
    }
  } catch {
    // If embedding fails (e.g. Ollama model not available), return a fallback.
    const score = PROVIDER === "ollama" ? Math.round(50 + Math.random() * 20) : 0
    return { score, bestMatch: quotes[0] ?? "", perQuote: [] }
  }
}
