import { useMemo, useState } from 'react'
import type { Memory, PersonaProfile } from '../types'

const VOICE_PRESETS: { label: string; text: string }[] = [
  {
    label: 'Warm',
    text:
      'Warm, empathetic, and gently curious. Acknowledges limits of being an AI reflection.',
  },
  {
    label: 'Clear',
    text:
      'Direct and clear, avoids fluff. Still kind. Short paragraphs unless depth is needed.',
  },
  {
    label: 'Poetic',
    text:
      'Lyrical and reflective, uses metaphor sparingly. Stays grounded and truthful.',
  },
  {
    label: 'Mentor',
    text:
      'Supportive mentor tone: asks good questions, offers perspective without preaching.',
  },
]

type Props = {
  persona: PersonaProfile
  onPersonaChange: (p: PersonaProfile) => void
  memories: Memory[]
  onAddMemory: (text: string) => void
  onRemoveMemory: (id: string) => void
  onTogglePin: (id: string) => void
  preferences: Record<string, string>
  onPreferenceChange: (key: string, value: string) => void
  onRemovePreference: (key: string) => void
  onAddPreference: () => void
  newPrefKey: string
  onNewPrefKey: (k: string) => void
  memoryDraft: string
  onMemoryDraft: (v: string) => void
}

export function PersonaPanel({
  persona,
  onPersonaChange,
  memories,
  onAddMemory,
  onRemoveMemory,
  onTogglePin,
  preferences,
  onPreferenceChange,
  onRemovePreference,
  onAddPreference,
  newPrefKey,
  onNewPrefKey,
  memoryDraft,
  onMemoryDraft,
}: Props) {
  const [memoryFilter, setMemoryFilter] = useState('')
  const prefEntries = Object.entries(preferences)

  const visibleMemories = useMemo(() => {
    const q = memoryFilter.trim().toLowerCase()
    const sorted = [...memories].sort((a, b) => {
      const ap = a.pinned ? 1 : 0
      const bp = b.pinned ? 1 : 0
      if (ap !== bp) return bp - ap
      return b.createdAt - a.createdAt
    })
    if (!q) return sorted
    return sorted.filter((m) => m.text.toLowerCase().includes(q))
  }, [memories, memoryFilter])

  return (
    <aside className="persona-panel" aria-label="Persona and memory">
      <div className="field">
        <label htmlFor="persona-name">Persona name</label>
        <input
          id="persona-name"
          type="text"
          value={persona.name}
          onChange={(e) =>
            onPersonaChange({ ...persona, name: e.target.value })
          }
        />
      </div>

      <div className="field">
        <label htmlFor="persona-voice">Voice & stance</label>
        <div className="voice-presets" role="group" aria-label="Voice presets">
          {VOICE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="preset-chip"
              onClick={() =>
                onPersonaChange({ ...persona, voiceNotes: p.text })
              }
              title={p.text}
            >
              {p.label}
            </button>
          ))}
        </div>
        <textarea
          id="persona-voice"
          rows={4}
          value={persona.voiceNotes}
          onChange={(e) =>
            onPersonaChange({ ...persona, voiceNotes: e.target.value })
          }
          placeholder="How should your digital self sound and behave?"
        />
      </div>

      <section className="subsection">
        <h2>Memories</h2>
        <p className="help">
          Facts the persona should keep consistent—people, values, history. Pin
          important ones so they surface first in prompts.
        </p>
        <form
          className="inline-add"
          onSubmit={(e) => {
            e.preventDefault()
            if (!memoryDraft.trim()) return
            onAddMemory(memoryDraft.trim())
            onMemoryDraft('')
          }}
        >
          <input
            type="text"
            value={memoryDraft}
            onChange={(e) => onMemoryDraft(e.target.value)}
            placeholder="Add a memory…"
            aria-label="New memory"
          />
          <button type="submit" className="btn secondary sm">
            Add
          </button>
        </form>
        <input
          type="search"
          className="memory-search"
          value={memoryFilter}
          onChange={(e) => setMemoryFilter(e.target.value)}
          placeholder="Search memories…"
          aria-label="Filter memories"
        />
        <ul className="memory-list">
          {visibleMemories.length === 0 && (
            <li className="memory-empty">
              {memoryFilter.trim()
                ? 'No memories match your search.'
                : 'No memories yet.'}
            </li>
          )}
          {visibleMemories.map((m) => (
            <li key={m.id} data-pinned={m.pinned ? 'true' : undefined}>
              <button
                type="button"
                className={`pin-btn ${m.pinned ? 'active' : ''}`}
                aria-pressed={m.pinned ?? false}
                aria-label={m.pinned ? 'Unpin memory' : 'Pin memory'}
                title={m.pinned ? 'Unpin' : 'Pin to top of context'}
                onClick={() => onTogglePin(m.id)}
              >
                ★
              </button>
              <span className="mem-text">{m.text}</span>
              <span className="meta" title={m.source}>
                {m.source === 'learned' ? '✨' : ''}
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Remove memory"
                onClick={() => onRemoveMemory(m.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="subsection">
        <h2>Preferences</h2>
        <p className="help">
          Short labels the model should honor (tone, topics, boundaries).
        </p>
        <div className="pref-rows">
          {prefEntries.map(([k, v]) => (
            <div className="pref-row" key={k}>
              <span className="pref-key">{k}</span>
              <input
                type="text"
                value={v}
                onChange={(e) => onPreferenceChange(k, e.target.value)}
                aria-label={`Preference ${k}`}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${k}`}
                onClick={() => onRemovePreference(k)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="pref-add">
          <input
            type="text"
            value={newPrefKey}
            onChange={(e) => onNewPrefKey(e.target.value)}
            placeholder="New preference key"
            aria-label="New preference key"
          />
          <button type="button" className="btn secondary sm" onClick={onAddPreference}>
            Add key
          </button>
        </div>
      </section>
    </aside>
  )
}
