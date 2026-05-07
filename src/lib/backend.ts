import type { PersistedState } from '../types'

function backendUrl(): string | null {
  const raw = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim()
  if (!raw) return null
  return raw.replace(/\/$/, '')
}

export function getClientId(): string {
  const key = 'di:client-id'
  try {
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function isBackendConfigured(): boolean {
  return Boolean(backendUrl())
}

export async function ingestState(state: PersistedState): Promise<void> {
  const base = backendUrl()
  if (!base) throw new Error('Backend not configured (set VITE_BACKEND_URL).')
  const res = await fetch(`${base}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: getClientId(), state }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || 'Ingest failed')
  }
}

export async function backendChatUniversal(
  messages: { role: string; content: string }[],
  preferredLanguage: string,
): Promise<string> {
  const base = backendUrl()
  if (!base) throw new Error('Backend not configured (set VITE_BACKEND_URL).')
  const res = await fetch(`${base}/api/chat/universal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, preferredLanguage }),
  })
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; text?: string; error?: string }
    | null
  if (!res.ok) throw new Error(data?.error || 'Chat failed')
  if (!data?.text) throw new Error('Empty response')
  return data.text
}

export async function backendChatPersona(
  system: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const base = backendUrl()
  if (!base) throw new Error('Backend not configured (set VITE_BACKEND_URL).')
  const res = await fetch(`${base}/api/chat/persona`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages }),
  })
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; text?: string; error?: string }
    | null
  if (!res.ok) throw new Error(data?.error || 'Chat failed')
  if (!data?.text) throw new Error('Empty response')
  return data.text
}

export async function backendLearn(
  transcript: string,
  existingMemories: string[],
): Promise<string> {
  const base = backendUrl()
  if (!base) throw new Error('Backend not configured (set VITE_BACKEND_URL).')
  const res = await fetch(`${base}/api/learn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, existing: existingMemories.join('\n') }),
  })
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; text?: string; error?: string }
    | null
  if (!res.ok) throw new Error(data?.error || 'Learn failed')
  if (!data?.text) throw new Error('Empty response')
  return data.text
}

