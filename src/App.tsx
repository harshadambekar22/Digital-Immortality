import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import './App.css'
import { ChatPanel } from './components/ChatPanel'
import { HeaderToolbar } from './components/HeaderToolbar'
import { InsightsPanel } from './components/InsightsPanel'
import { PersonaPanel } from './components/PersonaPanel'
import { completePersonaReply, isApiConfigured } from './lib/chat'
import { downloadBackup, parseBackupJson } from './lib/export'
import { buildInsights } from './lib/insights'
import { extractFromTranscript } from './lib/learn'
import {
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  subscribeSystemTheme,
  type ThemeChoice,
} from './lib/theme'
import { speakReply, stopVoiceOutput } from './lib/voice'
import { defaultState, loadState, saveState } from './lib/storage'
import type { ChatMessage, Memory, PersistedState } from './types'

function uid(): string {
  return crypto.randomUUID()
}

export default function App() {
  const [draft, setDraft] = useState('')
  const [state, setState] = useState<PersistedState>(() => loadState() ?? defaultState())
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [learnBusy, setLearnBusy] = useState(false)
  const [memoryDraft, setMemoryDraft] = useState('')
  const [newPrefKey, setNewPrefKey] = useState('')
  const [mobileTab, setMobileTab] = useState<'chat' | 'persona'>('chat')
  const [theme, setTheme] = useState<ThemeChoice>(() => getStoredTheme())
  const [sessionGoal, setSessionGoal] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem('di:session-goal') ?? 8)
      return Number.isFinite(raw) ? Math.min(Math.max(raw, 3), 20) : 8
    } catch {
      return 8
    }
  })
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('di:voice-replies') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    saveState(state)
  }, [state])

  useLayoutEffect(() => {
    applyTheme(theme)
    setStoredTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    return subscribeSystemTheme(() => applyTheme('system'))
  }, [theme])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(t)
  }, [notice])

  useEffect(() => {
    try {
      localStorage.setItem('di:voice-replies', voiceRepliesEnabled ? '1' : '0')
    } catch {
      // ignore storage errors
    }
  }, [voiceRepliesEnabled])

  useEffect(() => {
    try {
      localStorage.setItem('di:session-goal', String(sessionGoal))
    } catch {
      // ignore storage errors
    }
  }, [sessionGoal])

  const apiReady = isApiConfigured()
  const insights = useMemo(() => buildInsights(state), [state])
  const sessionProgress = Math.min((insights.userMessages / sessionGoal) * 100, 100)

  const suggestions = useMemo(() => {
    const topMemory = state.memories[0]?.text
    const tone = state.preferences.tone?.trim()
    const personaName = state.persona.name || 'My persona'
    const base = [
      'Tell me one thing you learned about me from our recent chats.',
      'Ask me three questions that would make my digital persona more accurate.',
      'Write a short diary reflection in my style for today.',
      'Summarize my current values and priorities from memory.',
    ]
    if (topMemory) {
      base.unshift(`Use this memory in context: ${topMemory.slice(0, 80)}`)
    }
    if (tone) {
      base.unshift(`Respond in a ${tone} tone while staying truthful.`)
    }
    base.push(`How can ${personaName} become more authentic over time?`)
    return base.slice(0, 6)
  }, [state.memories, state.preferences, state.persona.name])

  function addUserMessage(text: string): ChatMessage {
    return { id: uid(), role: 'user', content: text, createdAt: Date.now() }
  }

  function addAssistantMessage(text: string): ChatMessage {
    return { id: uid(), role: 'assistant', content: text, createdAt: Date.now() }
  }

  async function handleSend(text: string) {
    const userMsg = addUserMessage(text)
    const messagesForApi = [...state.messages, userMsg]

    setState((s) => ({ ...s, messages: messagesForApi }))
    setError(null)
    setSending(true)

    try {
      const reply = await completePersonaReply(
        state.persona,
        state.memories,
        state.preferences,
        messagesForApi,
      )
      if (voiceRepliesEnabled) speakReply(reply)
      setState((s) => ({
        ...s,
        messages: [...s.messages, addAssistantMessage(reply)],
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  function handleAddMemory(text: string, source: Memory['source'] = 'manual') {
    const trimmed = text.trim()
    if (!trimmed) return
    setState((s) => ({
      ...s,
      memories: [
        {
          id: uid(),
          text: trimmed,
          createdAt: Date.now(),
          source,
        },
        ...s.memories,
      ],
    }))
  }

  function handleTogglePin(id: string) {
    setState((s) => ({
      ...s,
      memories: s.memories.map((m) =>
        m.id === id ? { ...m, pinned: !(m.pinned ?? false) } : m,
      ),
    }))
  }

  function handleLearnFromChat() {
    const lines = state.messages.slice(-24).map((m) => {
      const who = m.role === 'user' ? 'User' : 'Persona'
      return `${who}: ${m.content}`
    })
    if (lines.length < 2) return

    const transcript = lines.join('\n')
    setLearnBusy(true)
    setError(null)
    extractFromTranscript(transcript, state.memories)
      .then(({ newMemories, preferences }) => {
        setState((s) => {
          const mergedPrefs = { ...s.preferences, ...preferences }
          const newItems: Memory[] = newMemories.map((t) => ({
            id: uid(),
            text: t,
            createdAt: Date.now(),
            source: 'learned' as const,
          }))
          return {
            ...s,
            memories: [...newItems, ...s.memories],
            preferences: mergedPrefs,
          }
        })
        setNotice('Added new items from chat to Memories / Preferences.')
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Learning failed.')
      })
      .finally(() => {
        setLearnBusy(false)
      })
  }

  function handlePersonaChange(persona: PersistedState['persona']) {
    setState((s) => ({ ...s, persona }))
  }

  function handlePreferenceChange(key: string, value: string) {
    setState((s) => ({
      ...s,
      preferences: { ...s.preferences, [key]: value },
    }))
  }

  function handleRemovePreference(key: string) {
    setState((s) => {
      const next = { ...s.preferences }
      delete next[key]
      return { ...s, preferences: next }
    })
  }

  function handleAddPreferenceKey() {
    const k = newPrefKey.trim()
    if (!k) return
    setState((s) => ({
      ...s,
      preferences: { ...s.preferences, [k]: '' },
    }))
    setNewPrefKey('')
  }

  function handleClearChat() {
    if (state.messages.length === 0) return
    if (!window.confirm('Clear all messages in this chat?')) return
    setState((s) => ({ ...s, messages: [] }))
    setDraft('')
    stopVoiceOutput()
    setError(null)
  }

  function handleExport() {
    downloadBackup(state)
    setNotice('Backup file downloaded.')
  }

  async function handleImportFile(file: File) {
    setError(null)
    try {
      const raw = await file.text()
      const parsed = parseBackupJson(raw)
      if (!parsed) {
        setError('That file is not a valid Digital Immortality backup.')
        return
      }
      if (
        !window.confirm(
          'Replace all current data (persona, memories, chat) with this backup?',
        )
      ) {
        return
      }
      setState(parsed)
      setNotice('Backup restored successfully.')
    } catch {
      setError('Could not read the backup file.')
    }
  }

  function handleReset() {
    if (
      !window.confirm(
        'Erase all memories, preferences, and chat from this browser? This cannot be undone.',
      )
    ) {
      return
    }
    setState(defaultState())
    setDraft('')
    stopVoiceOutput()
    setError(null)
    setNotice(null)
  }

  function handleToggleVoiceReplies() {
    setVoiceRepliesEnabled((prev) => {
      if (prev) stopVoiceOutput()
      return !prev
    })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <h1>Digital Immortality</h1>
          <p className="tagline">
            Preserve your voice with an AI persona that learns from what you share—
            conversations, memories, and preferences stay in this browser.
          </p>
        </div>

        <HeaderToolbar
          memoryCount={state.memories.length}
          messageCount={state.messages.length}
          theme={theme}
          onThemeChange={setTheme}
          onExport={handleExport}
          onImportFile={handleImportFile}
          onReset={handleReset}
        />

        {notice && (
          <div className="banner notice" role="status">
            {notice}
          </div>
        )}

        <nav className="mobile-tabs" aria-label="Section">
          <button
            type="button"
            className={mobileTab === 'chat' ? 'active' : ''}
            onClick={() => setMobileTab('chat')}
          >
            Chat
          </button>
          <button
            type="button"
            className={mobileTab === 'persona' ? 'active' : ''}
            onClick={() => setMobileTab('persona')}
          >
            Persona &amp; memory
          </button>
        </nav>
      </header>

      <main className="app-main">
        <div
          className={`panel-wrap persona-wrap ${mobileTab === 'persona' ? 'show' : ''}`}
        >
          <PersonaPanel
            persona={state.persona}
            onPersonaChange={handlePersonaChange}
            memories={state.memories}
            onAddMemory={(t) => handleAddMemory(t, 'manual')}
            onRemoveMemory={(id) =>
              setState((s) => ({
                ...s,
                memories: s.memories.filter((m) => m.id !== id),
              }))
            }
            onTogglePin={handleTogglePin}
            preferences={state.preferences}
            onPreferenceChange={handlePreferenceChange}
            onRemovePreference={handleRemovePreference}
            onAddPreference={handleAddPreferenceKey}
            newPrefKey={newPrefKey}
            onNewPrefKey={setNewPrefKey}
            memoryDraft={memoryDraft}
            onMemoryDraft={setMemoryDraft}
          />
        </div>

        <div className={`panel-wrap chat-wrap ${mobileTab === 'chat' ? 'show' : ''}`}>
          <InsightsPanel
            insights={insights}
            sessionGoal={sessionGoal}
            onSessionGoalChange={setSessionGoal}
            progress={sessionProgress}
            onUsePrompt={setDraft}
          />
          <ChatPanel
            messages={state.messages}
            sending={sending}
            error={error}
            apiReady={apiReady}
            draft={draft}
            onDraftChange={setDraft}
            onSend={handleSend}
            onAddMemory={(t) => handleAddMemory(t, 'chat')}
            onLearnFromChat={handleLearnFromChat}
            learning={learnBusy}
            onClearChat={handleClearChat}
            suggestions={suggestions}
            onUseSuggestion={setDraft}
            voiceRepliesEnabled={voiceRepliesEnabled}
            onToggleVoiceReplies={handleToggleVoiceReplies}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          This is a prototype: data is stored locally. For production, add a server and
          never ship API keys in the client bundle.
        </p>
      </footer>
    </div>
  )
}
