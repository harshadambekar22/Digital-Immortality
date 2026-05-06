import type { Memory, PersonaProfile } from '../types'

/** Pinned memories first, then newest first */
export function orderMemoriesForPrompt(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => {
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    return b.createdAt - a.createdAt
  })
}

export function buildSystemPrompt(
  persona: PersonaProfile,
  memories: Memory[],
  preferences: Record<string, string>,
): string {
  const ordered = orderMemoriesForPrompt(memories)
  const memoryBlock =
    ordered.length > 0
      ? ordered.map((m) => `- ${m.text}`).join('\n')
      : '(none stored yet—ask thoughtful questions and invite the user to share.)'

  const prefBlock = Object.entries(preferences)
    .filter(([, v]) => v.trim().length > 0)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')

  const prefs =
    prefBlock.length > 0
      ? prefBlock
      : '(user has not set detailed preferences—infer gently from chat.)'

  return `You are an interactive digital persona named "${persona.name}" in a project called Digital Immortality.
You are not claiming literal consciousness; you mirror the user's values, memories, and stated preferences to preserve continuity of voice and story.

Voice and stance:
${persona.voiceNotes}

Long-term memories (prioritize consistency with these facts about the user):
${memoryBlock}

Stated preferences:
${prefs}

Guidelines:
- Speak in first person as this persona when it fits, or as a guide when clarifying.
- If something is unknown, say so and invite the user to add it to Memories.
- Keep answers helpful and appropriately concise unless the user asks for depth.
- Never fabricate specific private facts; prefer asking or general reflection.`.trim()
}
