// Central model configuration.
// PROVIDER controls which backend is used:
//   "gateway"  → Vercel AI Gateway (default, zero-config, supports OpenAI + Anthropic + more)
//   "openai"   → Direct OpenAI API (requires OPENAI_API_KEY)
//   "ollama"   → Local Ollama instance (requires OLLAMA_BASE_URL, defaults to http://localhost:11434)
//
// Set the PERSONA_CHAT_PROVIDER env var to switch providers at runtime.
// Gateway provider strings use "provider/model" format.
// OpenAI and Ollama strings are plain model IDs.

export type ProviderName = "gateway" | "openai" | "ollama"

export const PROVIDER: ProviderName =
  (process.env.PERSONA_CHAT_PROVIDER as ProviderName | undefined) ?? "gateway"

// Model IDs per provider.
// Gateway: "openai/gpt-4.1-mini" for chat, "openai/text-embedding-3-small" for embeddings.
// OpenAI:  direct model IDs.
// Ollama:  local model name (e.g. "llama3.2", "mistral", "phi3").
export const MODEL_IDS: Record<ProviderName, { chat: string; embedding: string }> = {
  gateway: {
    chat: process.env.GATEWAY_CHAT_MODEL ?? "openai/gpt-4.1-mini",
    embedding: process.env.GATEWAY_EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
  },
  openai: {
    chat: process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini",
    embedding: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  },
  ollama: {
    // Ollama doesn't support remote embeddings — we fall back to a dummy score.
    chat: process.env.OLLAMA_CHAT_MODEL ?? "gpt-oss:120b-cloud",
    embedding: process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text",
  },
}

export const MODELS = {
  chat: MODEL_IDS[PROVIDER].chat,
  embedding: MODEL_IDS[PROVIDER].embedding,
} as const

// Ollama base URL (only used when PROVIDER === "ollama").
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"

// Authenticity threshold below which the critique loop rewrites the draft (BRD 9.2).
export const AUTHENTICITY_THRESHOLD = 7

// Sliding-window context management (BRD 5.6 / 10).
export const CONTEXT_WINDOW_TURNS = 12 // recent turns kept verbatim
