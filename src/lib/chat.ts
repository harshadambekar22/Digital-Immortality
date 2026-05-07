import type { ChatMessage, Memory, PersonaProfile } from '../types'
import { buildSystemPrompt, orderMemoriesForPrompt } from './persona'
import { backendChatPersona, backendChatUniversal, isBackendConfigured } from './backend'

const MAX_TURNS = 40

function getConfig() {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  const base = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined)?.replace(
    /\/$/,
    '',
  ) ?? 'https://api.openai.com/v1'
  const model =
    (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ?? 'gpt-4o-mini'
  return { key, base, model }
}

export function isApiConfigured(): boolean {
  return Boolean(getConfig().key?.trim())
}

export async function completeUniversalReply(
  messages: ChatMessage[],
  preferredLanguage: string,
): Promise<string> {
  const payload = recentForApi(messages)
  const { key, base, model } = getConfig()
  if (isBackendConfigured()) {
    return await backendChatUniversal(payload, preferredLanguage)
  }

  const system = `You are a multilingual AI chatbot for a product called Digital Immortality.
Understand and respond in ANY language.
- If preferred language is "auto", detect the user's language from their latest message and reply in that same language.
- If preferred language is a specific language, reply in that language unless the user explicitly asks otherwise.
- Keep responses clear, friendly, and concise by default.
- Preserve technical terms and proper nouns when needed.
Preferred language: ${preferredLanguage}`.trim()

  if (!key?.trim()) {
    const latest = payload[payload.length - 1]?.content ?? ''
    return `Offline mode is active. I received: "${latest.slice(0, 220)}${latest.length > 220 ? '…' : ''}".

Add VITE_OPENAI_API_KEY to .env and restart the app for full multilingual AI responses.`
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...payload],
      temperature: 0.6,
      max_tokens: 900,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || `Chat request failed (${res.status})`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from model')
  return text
}

function recentForApi(messages: ChatMessage[]): { role: string; content: string }[] {
  const slice = messages.slice(-MAX_TURNS)
  return slice.map((m) => ({ role: m.role, content: m.content }))
}

export async function completePersonaReply(
  persona: PersonaProfile,
  memories: Memory[],
  preferences: Record<string, string>,
  messages: ChatMessage[],
): Promise<string> {
  const system = buildSystemPrompt(persona, memories, preferences)
  const payload = recentForApi(messages)
  const { key, base, model } = getConfig()
  if (isBackendConfigured()) {
    return await backendChatPersona(system, payload)
  }

  if (!key?.trim()) {
    return offlineReply(payload, memories, persona.name)
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...payload],
      temperature: 0.75,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || `Chat request failed (${res.status})`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from model')
  return text
}

function lastUserText(payload: { role: string; content: string }[]): string {
  for (let i = payload.length - 1; i >= 0; i--) {
    if (payload[i].role === 'user') return payload[i].content
  }
  return ''
}

function offlineReply(
  payload: { role: string; content: string }[],
  memories: Memory[],
  personaName: string,
): string {
  const last = lastUserText(payload)
  const refs = orderMemoriesForPrompt(memories)
    .slice(0, 5)
    .map((m) => `• ${m.text}`)
    .join('\n')
  const memoryHint =
    refs.length > 0
      ? `I’m drawing on what’s saved about you:\n${refs}\n\n`
      : `You haven’t stored memories yet—open **Persona & memory** and add a few facts so I can mirror you better.\n\n`

  return `${memoryHint}**${personaName} (offline demo):** I’d respond to: “${last.slice(0, 280)}${last.length > 280 ? '…' : ''}”

---

Add \`VITE_OPENAI_API_KEY\` to a \`.env\` file in this project and restart the dev server for full AI replies. Your data stays in this browser unless you configure a backend.`
}
