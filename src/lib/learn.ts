import type { Memory } from '../types'
import { backendLearn, isBackendConfigured } from './backend'

type ExtractPayload = {
  newMemories: string[]
  preferences: Record<string, string>
}

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

export async function extractFromTranscript(
  transcript: string,
  existingMemories: Memory[],
): Promise<ExtractPayload> {
  const { key, base, model } = getConfig()
  if (isBackendConfigured()) {
    const raw = await backendLearn(
      transcript,
      existingMemories.map((m) => m.text),
    )
    return parseExtractPayload(raw)
  }
  if (!key?.trim()) {
    throw new Error('Add VITE_OPENAI_API_KEY to use “Learn from chat”.')
  }

  const existing = existingMemories.map((m) => m.text).join('\n') || '(none)'

  const system = `You help build a personal knowledge base for a "digital persona".
Given a chat transcript and existing memories, output ONLY compact JSON with this shape (no markdown):
{"newMemories":["short factual bullet about the user"],"preferences":{"key":"value"}}

Rules:
- newMemories: only NEW stable facts or preferences the user stated; no duplicates of existing memories.
- preferences: optional flat string map (e.g. tone, food, values). Empty object {} if nothing new.
- If nothing to learn, return {"newMemories":[],"preferences":{}}
- Keep memory bullets under 200 characters each; at most 8 items.`

  const userContent = `EXISTING MEMORIES:\n${existing}\n\nTRANSCRIPT:\n${transcript}`

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 800,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || 'Learning request failed')
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
  return parseExtractPayload(raw)
}

function parseExtractPayload(raw: string): ExtractPayload {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : raw
  try {
    const parsed = JSON.parse(jsonStr) as {
      newMemories?: unknown
      preferences?: unknown
    }
    const memories = Array.isArray(parsed.newMemories)
      ? parsed.newMemories.filter((m): m is string => typeof m === 'string').map((s) => s.trim()).filter(Boolean)
      : []
    const prefs =
      parsed.preferences && typeof parsed.preferences === 'object' && parsed.preferences !== null
        ? Object.fromEntries(
            Object.entries(parsed.preferences as Record<string, unknown>)
              .filter(([, v]) => typeof v === 'string')
              .map(([k, v]) => [k, (v as string).trim()])
              .filter(([, v]) => v.length > 0),
          )
        : {}
    return { newMemories: memories.slice(0, 12), preferences: prefs }
  } catch {
    throw new Error('Could not parse learning response. Try again.')
  }
}
