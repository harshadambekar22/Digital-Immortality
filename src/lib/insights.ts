import type { PersistedState } from '../types'

export type ConversationInsights = {
  userMessages: number
  assistantMessages: number
  totalWords: number
  memoryHealthScore: number
  gaps: string[]
}

export function buildInsights(state: PersistedState): ConversationInsights {
  const userMessages = state.messages.filter((m) => m.role === 'user').length
  const assistantMessages = state.messages.length - userMessages
  const totalWords = state.messages.reduce(
    (sum, m) => sum + m.content.trim().split(/\s+/).filter(Boolean).length,
    0,
  )

  const pinnedCount = state.memories.filter((m) => m.pinned).length
  const prefCount = Object.entries(state.preferences).filter(([, v]) => v.trim()).length
  const memoryCount = state.memories.length
  const msgScore = Math.min(userMessages, 20) * 2
  const memoryScore = Math.min(memoryCount, 20) * 2
  const pinnedScore = Math.min(pinnedCount, 5) * 5
  const prefScore = Math.min(prefCount, 8) * 4
  const memoryHealthScore = Math.min(msgScore + memoryScore + pinnedScore + prefScore, 100)

  const gaps: string[] = []
  if (memoryCount < 5) gaps.push('Add at least 5 core memories')
  if (pinnedCount < 2) gaps.push('Pin 2 high-priority memories')
  if (prefCount < 3) gaps.push('Define communication preferences')
  if (userMessages < 8) gaps.push('Have a deeper onboarding chat')

  return {
    userMessages,
    assistantMessages,
    totalWords,
    memoryHealthScore,
    gaps,
  }
}
