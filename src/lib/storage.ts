import type { PersistedState } from '../types'

const KEY = 'digital-immortality:v1'

export function defaultState(): PersistedState {
  return {
    version: 1,
    persona: {
      name: 'My digital persona',
      voiceNotes:
        'Thoughtful, warm, and honest about being an AI reflection—not a substitute for a human.',
    },
    memories: [],
    preferences: {
      tone: 'conversational',
      'avoid topics': '',
    },
    messages: [],
  }
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (parsed?.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // quota exceeded or private mode
  }
}

export function clearState(): void {
  localStorage.removeItem(KEY)
}
