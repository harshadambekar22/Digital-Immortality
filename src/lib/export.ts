import type { PersistedState } from '../types'

export function downloadBackup(state: PersistedState): void {
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `digital-immortality-backup-${date}.json`
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(url)
}

export function parseBackupJson(raw: string): PersistedState | null {
  try {
    const p = JSON.parse(raw) as PersistedState
    if (p?.version !== 1) return null
    if (
      !p.persona ||
      typeof p.persona.name !== 'string' ||
      typeof p.persona.voiceNotes !== 'string'
    ) {
      return null
    }
    if (!Array.isArray(p.memories) || !Array.isArray(p.messages)) return null
    if (!p.preferences || typeof p.preferences !== 'object') return null
    return p
  } catch {
    return null
  }
}
