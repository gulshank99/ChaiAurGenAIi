// Provider factory — returns a LanguageModel for the configured provider.
//
// AI SDK v7: gateway strings are the default LanguageModel type (GatewayModelId).
// For OpenAI direct: @ai-sdk/openai must be installed separately.
// For Ollama: ollama-ai-provider must be installed separately.
//
// We lazy-require the optional provider packages so the gateway path has zero
// extra dependencies.

import type { LanguageModel } from "ai"
import { PROVIDER, MODELS, OLLAMA_BASE_URL } from "./config"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = any

// Return a LanguageModel for the chat model.
// In AI SDK v7 the gateway is the default provider — pass the model string
// directly. For direct OpenAI or Ollama providers, return the provider object.
export function getChatModel(): LanguageModel {
  if (PROVIDER === "gateway") {
    // The Vercel AI Gateway is the default provider in AI SDK v7.
    // Gateway model strings are valid LanguageModel values.
    return MODELS.chat as AnyModel
  }

  if (PROVIDER === "openai") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createOpenAI } = require("@ai-sdk/openai")
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
      return openai(MODELS.chat)
    } catch {
      // @ai-sdk/openai not installed — warn and fall back to gateway
      console.warn("[PersonaChat] @ai-sdk/openai not installed. Falling back to gateway.")
      return MODELS.chat as AnyModel
    }
  }

  if (PROVIDER === "ollama") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createOllama } = require("ollama-ai-provider")
      const ollama = createOllama({ baseURL: `${OLLAMA_BASE_URL}/api` })
      return ollama(MODELS.chat)
    } catch {
      console.warn("[PersonaChat] ollama-ai-provider not installed. Falling back to gateway.")
      return MODELS.chat as AnyModel
    }
  }

  return MODELS.chat as AnyModel
}

// Return an embedding model reference.
// Gateway strings work directly; openai/ollama need the provider object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEmbeddingModel(): any {
  if (PROVIDER === "gateway") {
    return MODELS.embedding
  }

  if (PROVIDER === "openai") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createOpenAI } = require("@ai-sdk/openai")
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
      return openai.embedding(MODELS.embedding)
    } catch {
      return MODELS.embedding
    }
  }

  if (PROVIDER === "ollama") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createOllama } = require("ollama-ai-provider")
      const ollama = createOllama({ baseURL: `${OLLAMA_BASE_URL}/api` })
      return ollama.embedding(MODELS.embedding)
    } catch {
      return null
    }
  }

  return MODELS.embedding
}
