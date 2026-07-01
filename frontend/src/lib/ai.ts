import type { AIProvider, AIPromptContext } from '@milkdown/crepe/feature/ai'
import { getAiConfig, isAiConfigured } from './storage'

/** Signaled by the provider when no AI provider is configured yet, so the app
 *  can open the config dialog instead of just showing an opaque error. */
export class AiNotConfiguredError extends Error {
  constructor() {
    super('Configure an AI provider first (top-left menu → Config AI Provider).')
    this.name = 'AiNotConfiguredError'
  }
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

const SYSTEM_PROMPT = [
  'You are a writing assistant embedded in a Markdown editor.',
  'The user selected a passage and gave an instruction to revise it.',
  'Rewrite the selected passage to satisfy the instruction, keeping the',
  "author's voice and language (reply in the same language as the passage).",
  'Return ONLY the revised Markdown for the passage — no explanations, no',
  'commentary, and do not wrap the whole thing in a code fence.',
].join(' ')

function buildUserPrompt({ document, selection, instruction }: AIPromptContext): string {
  const parts = [
    document.trim() &&
      `Full document (context only, do not rewrite):\n<document>\n${document}\n</document>`,
    `Selected passage to revise:\n<selection>\n${selection}\n</selection>`,
    `Instruction: ${instruction}`,
  ]
  return parts.filter(Boolean).join('\n\n')
}

/** Normalize a base URL and append the chat-completions path. Accepts either a
 *  root (…/v1) or a full endpoint (…/chat/completions). */
function completionsUrl(baseUrl: string): string {
  const base = (baseUrl.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`
}

/** Parse an OpenAI-style SSE stream, yielding the incremental content deltas. */
async function* parseSse(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncIterable<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // SSE events are separated by a blank line; process complete lines only.
      let nl: number
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const delta: string | undefined = json.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          // Ignore keep-alive / partial fragments.
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

/** An AIProvider (for Crepe's AI feature) backed by an OpenAI-compatible
 *  chat-completions endpoint. Reads config lazily on each call so it always
 *  reflects the latest saved provider. */
export const aiProvider: AIProvider = async function* (context, signal) {
  if (!isAiConfigured()) throw new AiNotConfiguredError()
  const { baseUrl, apiKey, model } = getAiConfig()

  const res = await fetch(completionsUrl(baseUrl), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: model.trim(),
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(context) },
      ],
    }),
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(`AI request failed (${res.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`)
  }

  yield* parseSse(res.body, signal)
}
