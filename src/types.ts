export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export type Memory = {
  id: string
  text: string
  createdAt: number
  source: 'manual' | 'chat' | 'learned'
  /** Shown first in prompts when true */
  pinned?: boolean
}

export type PersonaProfile = {
  name: string
  voiceNotes: string
}

export type PersistedState = {
  version: 1
  persona: PersonaProfile
  memories: Memory[]
  preferences: Record<string, string>
  messages: ChatMessage[]
}
