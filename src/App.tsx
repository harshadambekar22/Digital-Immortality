import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import './App.css'
import { ChatPanel } from './components/ChatPanel'
import { HeaderToolbar } from './components/HeaderToolbar'
import { InsightsPanel } from './components/InsightsPanel'
import { PersonaPanel } from './components/PersonaPanel'
import { completePersonaReply, completeUniversalReply, isApiConfigured } from './lib/chat'
import { downloadBackup, parseBackupJson } from './lib/export'
import { buildInsights } from './lib/insights'
import { extractFromTranscript } from './lib/learn'
import { defaultState, loadState, saveState } from './lib/storage'
import {
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  subscribeSystemTheme,
  type ThemeChoice,
} from './lib/theme'
import { speakReply, stopVoiceOutput } from './lib/voice'
import { ingestState, isBackendConfigured } from './lib/backend'
import type { ChatMessage, Memory, PersistedState } from './types'

const LANG_OPTIONS = [
  'auto',
  'English',
  'Hindi',
  'Marathi',
  'Spanish',
  'French',
  'German',
  'Arabic',
  'Chinese',
  'Japanese',
  'Korean',
] as const

function uid(): string {
  return crypto.randomUUID()
}

type StarPoint = {
  id: number
  left: string
  top: string
  duration: string
  delay: string
  opacity: string
  size: string
}

function createStars(count: number): StarPoint[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: `${3 + Math.random() * 5}s`,
    delay: `${Math.random() * 6}s`,
    opacity: `${0.3 + Math.random() * 0.6}`,
    size: Math.random() < 0.85 ? '1px' : '2px',
  }))
}

const STAR_POINTS = createStars(120)

export default function App() {
  const [studioState, setStudioState] = useState<PersistedState>(
    () => loadState() ?? defaultState(),
  )
  const [studioDraft, setStudioDraft] = useState('')
  const [studioSending, setStudioSending] = useState(false)
  const [studioError, setStudioError] = useState<string | null>(null)
  const [studioNotice, setStudioNotice] = useState<string | null>(null)
  const [learnBusy, setLearnBusy] = useState(false)
  const [memoryDraft, setMemoryDraft] = useState('')
  const [newPrefKey, setNewPrefKey] = useState('')
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

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<(typeof LANG_OPTIONS)[number]>('auto')

  useEffect(() => {
    saveState(studioState)
  }, [studioState])

  useLayoutEffect(() => {
    applyTheme(theme)
    setStoredTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    return subscribeSystemTheme(() => applyTheme('system'))
  }, [theme])

  useEffect(() => {
    if (!studioNotice) return
    const t = window.setTimeout(() => setStudioNotice(null), 4500)
    return () => window.clearTimeout(t)
  }, [studioNotice])

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
  const backendReady = isBackendConfigured()
  const [sendingData, setSendingData] = useState(false)
  const insights = useMemo(() => buildInsights(studioState), [studioState])
  const sessionProgress = Math.min((insights.userMessages / sessionGoal) * 100, 100)
  const suggestions = useMemo(() => {
    const topMemory = studioState.memories[0]?.text
    const tone = studioState.preferences.tone?.trim()
    const personaName = studioState.persona.name || 'My persona'
    const base = [
      'Tell me one thing you learned about me from our recent chats.',
      'Ask me three questions that would make my digital persona more accurate.',
      'Write a short diary reflection in my style for today.',
      'Summarize my current values and priorities from memory.',
    ]
    if (topMemory) base.unshift(`Use this memory in context: ${topMemory.slice(0, 80)}`)
    if (tone) base.unshift(`Respond in a ${tone} tone while staying truthful.`)
    base.push(`How can ${personaName} become more authentic over time?`)
    return base.slice(0, 6)
  }, [studioState.memories, studioState.preferences, studioState.persona.name])

  async function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed || sending) return

    const nextUser: ChatMessage = {
      id: uid(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    }
    const nextMessages = [...messages, nextUser]
    setMessages(nextMessages)
    setDraft('')
    setSending(true)
    setError(null)

    try {
      const reply = await completeUniversalReply(nextMessages, language)
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: reply,
          createdAt: Date.now(),
        },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function handleStudioSend(text: string) {
    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }
    const messagesForApi = [...studioState.messages, userMsg]
    setStudioState((s) => ({ ...s, messages: messagesForApi }))
    setStudioError(null)
    setStudioSending(true)

    try {
      const reply = await completePersonaReply(
        studioState.persona,
        studioState.memories,
        studioState.preferences,
        messagesForApi,
      )
      if (voiceRepliesEnabled) speakReply(reply)
      setStudioState((s) => ({
        ...s,
        messages: [...s.messages, { id: uid(), role: 'assistant', content: reply, createdAt: Date.now() }],
      }))
    } catch (e) {
      setStudioError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setStudioSending(false)
    }
  }

  async function handleSendData() {
    if (!backendReady) {
      setStudioNotice('Backend not configured. Set VITE_BACKEND_URL to enable sending.')
      return
    }
    setSendingData(true)
    try {
      await ingestState(studioState)
      setStudioNotice('Data sent to backend successfully.')
    } catch (e) {
      setStudioError(e instanceof Error ? e.message : 'Send failed.')
    } finally {
      setSendingData(false)
    }
  }

  function handleAddMemory(text: string, source: Memory['source'] = 'manual') {
    const trimmed = text.trim()
    if (!trimmed) return
    setStudioState((s) => ({
      ...s,
      memories: [{ id: uid(), text: trimmed, createdAt: Date.now(), source }, ...s.memories],
    }))
  }

  function handleTogglePin(id: string) {
    setStudioState((s) => ({
      ...s,
      memories: s.memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)),
    }))
  }

  function handleLearnFromChat() {
    const lines = studioState.messages.slice(-24).map((m) => `${m.role === 'user' ? 'User' : 'Persona'}: ${m.content}`)
    if (lines.length < 2) return
    setLearnBusy(true)
    setStudioError(null)
    extractFromTranscript(lines.join('\n'), studioState.memories)
      .then(({ newMemories, preferences }) => {
        setStudioState((s) => ({
          ...s,
          memories: [
            ...newMemories.map((t) => ({
              id: uid(),
              text: t,
              createdAt: Date.now(),
              source: 'learned' as const,
            })),
            ...s.memories,
          ],
          preferences: { ...s.preferences, ...preferences },
        }))
        setStudioNotice('Added new items from chat to Memories / Preferences.')
      })
      .catch((e) => setStudioError(e instanceof Error ? e.message : 'Learning failed.'))
      .finally(() => setLearnBusy(false))
  }

  function handleResetStudio() {
    if (
      !window.confirm(
        'Erase all memories, preferences, and chat from this browser? This cannot be undone.',
      )
    ) {
      return
    }
    setStudioState(defaultState())
    setStudioDraft('')
    stopVoiceOutput()
    setStudioError(null)
    setStudioNotice(null)
  }

  function handleImportBackup(file: File) {
    setStudioError(null)
    void file.text().then((raw) => {
      const parsed = parseBackupJson(raw)
      if (!parsed) {
        setStudioError('That file is not a valid Digital Immortality backup.')
        return
      }
      if (!window.confirm('Replace all current data with this backup?')) return
      setStudioState(parsed)
      setStudioNotice('Backup restored successfully.')
    })
  }

  return (
    <div className="di-page">
      <div className="stars" aria-hidden="true">
        {STAR_POINTS.map((s) => (
          <span
            key={s.id}
            className="star"
            style={
              {
                left: s.left,
                top: s.top,
                '--d': s.duration,
                '--delay': s.delay,
                '--op': s.opacity,
                width: s.size,
                height: s.size,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <nav>
        <a className="nav-logo" href="#home">
          ✦ Digital Immortality
        </a>
        <ul className="nav-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#how">How It Works</a>
          </li>
          <li>
            <a href="#persona">Your Persona</a>
          </li>
          <li>
            <a href="#studio">Studio</a>
          </li>
          <li>
            <a href="#pricing">Pricing</a>
          </li>
        </ul>
        <button className="nav-cta" type="button">
          Begin Legacy
        </button>
      </nav>

      <section className="hero" id="home">
        <p className="hero-eyebrow">A New Era of Existence</p>
        <div className="orb-container">
          <div className="orb-ring"></div>
          <div className="orb-ring"></div>
          <div className="orb-ring"></div>
          <div className="orb">
            <div className="orb-inner"></div>
            <div className="orb-dot"></div>
          </div>
        </div>
        <h1 className="hero-title">
          Digital <span className="accent">Immortality</span>
        </h1>
        <p className="hero-sub-title">Preserve Your Consciousness</p>
        <p className="hero-desc">
          An AI-powered digital persona that learns from your conversations,
          memories, and preferences - ensuring your essence lives beyond time.
        </p>
        <div className="hero-btns">
          <button className="btn-primary" type="button">
            Begin Your Legacy
          </button>
          <button className="btn-ghost" type="button">
            Explore the Vision
          </button>
        </div>
        <p className="scroll-hint">↓ &nbsp; Scroll to discover &nbsp; ↓</p>
      </section>

      <div className="divider">
        <div className="divider-line"></div>
        <div className="divider-gem"></div>
        <div className="divider-line"></div>
      </div>

      <section id="features">
        <div className="section-inner">
          <p className="section-label">Core Pillars</p>
          <h2 className="section-title">What Your Digital Self Can Do</h2>
          <p className="section-desc">
            Every facet of who you are, preserved and expressed through living
            artificial intelligence.
          </p>
          <div className="features-grid">
            <div className="feat-card">
              <div className="feat-icon">🧠</div>
              <p className="feat-title">Memory Core</p>
              <p className="feat-desc">
                Ingests your conversations and life data into a living memory graph.
              </p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">💬</div>
              <p className="feat-title">Persona Chat</p>
              <p className="feat-desc">
                Speak with your digital self in a tone that mirrors you.
              </p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">❤️</div>
              <p className="feat-title">Preference Engine</p>
              <p className="feat-desc">
                Learns habits, values, and decisions to become more authentic.
              </p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">🔒</div>
              <p className="feat-title">Eternal Vault</p>
              <p className="feat-desc">
                Secure archive with controlled access for your loved ones.
              </p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">🎙️</div>
              <p className="feat-title">Voice Synthesis</p>
              <p className="feat-desc">
                Preserve your voice cadence and spoken personality.
              </p>
            </div>
            <div className="feat-card">
              <div className="feat-icon">🌐</div>
              <p className="feat-title">Legacy Sharing</p>
              <p className="feat-desc">
                Share your preserved identity with future generations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <p className="section-label">The Journey</p>
          <h2 className="section-title">From Human to Eternal</h2>
          <p className="section-desc" style={{ margin: '0 auto' }}>
            Four steps to preserve your consciousness and create a faithful persona.
          </p>
          <div className="how-grid">
            <div className="how-step">
              <div className="how-num">I</div>
              <p className="how-label">Upload Memories</p>
              <p className="how-desc">Import chats, journals, voice notes, media.</p>
            </div>
            <div className="how-step">
              <div className="how-num">II</div>
              <p className="how-label">AI Synthesis</p>
              <p className="how-desc">Build your personality and communication model.</p>
            </div>
            <div className="how-step">
              <div className="how-num">III</div>
              <p className="how-label">Train & Refine</p>
              <p className="how-desc">Teach and calibrate authenticity over time.</p>
            </div>
            <div className="how-step">
              <div className="how-num">IV</div>
              <p className="how-label">Preserve & Share</p>
              <p className="how-desc">Secure your legacy and grant access by choice.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="divider">
        <div className="divider-line"></div>
        <div className="divider-gem"></div>
        <div className="divider-line"></div>
      </div>

      <section id="persona">
        <div className="section-inner">
          <div className="persona-demo">
            <div>
              <p className="section-label">Your Digital Self</p>
              <h2 className="section-title">Multilingual Persona Chatbot</h2>
              <p className="section-desc">
                Chat in any language. Use auto-detect or force a response language.
              </p>
            </div>
            <div className="chat-mockup">
              <div className="chat-header">
                <div className="avatar">AI</div>
                <div>
                  <p className="chat-name">Universal Chatbot</p>
                  <p className="chat-status">
                    {apiReady
                      ? 'Online · multilingual AI mode'
                      : 'Offline demo mode · add API key for full AI'}
                  </p>
                </div>
                <div className="online-dot"></div>
              </div>
              <div className="chat-controls">
                <label htmlFor="lang-select">Language</label>
                <select
                  id="lang-select"
                  value={language}
                  onChange={(e) =>
                    setLanguage(e.target.value as (typeof LANG_OPTIONS)[number])
                  }
                >
                  {LANG_OPTIONS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang === 'auto' ? 'Auto detect' : lang}
                    </option>
                  ))}
                </select>
              </div>
              <div className="chat-body">
                {messages.length === 0 && (
                  <div className="msg them">
                    Try: Hello, नमस्ते, Hola, Bonjour, こんにちは, مرحبا
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`msg ${m.role === 'user' ? 'them' : 'me'}`}>
                    {m.content}
                  </div>
                ))}
                {sending && (
                  <div className="msg them">
                    <div className="typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </div>
              <div className="chat-input">
                {error && <p className="chat-error">{error}</p>}
                <textarea
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your message in any language..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                />
                <button
                  className="btn-primary"
                  type="button"
                  disabled={sending || !draft.trim()}
                  onClick={() => void handleSend()}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <p className="section-label">Choose Your Eternity</p>
          <h2 className="section-title">Plans for Every Legacy</h2>
          <div className="pricing-grid">
            <div className="price-card">
              <p className="price-tier">Mortal</p>
              <p className="price-amount">
                <sup>₹</sup>0
              </p>
              <p className="price-period">Forever free</p>
            </div>
            <div className="price-card featured">
              <span className="price-badge">Most Chosen</span>
              <p className="price-tier">Eternal</p>
              <p className="price-amount">
                <sup>₹</sup>999
              </p>
              <p className="price-period">per month</p>
            </div>
            <div className="price-card">
              <p className="price-tier">Transcendent</p>
              <p className="price-amount">
                <sup>₹</sup>4,999
              </p>
              <p className="price-period">per month</p>
            </div>
          </div>
        </div>
      </section>

      <section id="studio">
        <div className="section-inner">
          <p className="section-label">Interactive Studio</p>
          <h2 className="section-title">Full Persona Builder</h2>
          <p className="section-desc">
            All core features are active here: memory, preferences, voice, learning,
            insights, backup/restore, and conversational persona chat.
          </p>

          <div className="studio-wrap">
            <HeaderToolbar
              memoryCount={studioState.memories.length}
              messageCount={studioState.messages.length}
              theme={theme}
              onThemeChange={setTheme}
              onExport={() => downloadBackup(studioState)}
              onImportFile={handleImportBackup}
              onSendData={handleSendData}
              sendingData={sendingData}
              onReset={handleResetStudio}
            />
            {studioNotice && (
              <div className="banner notice" role="status">
                {studioNotice}
              </div>
            )}

            <div className="studio-grid">
              <div>
                <PersonaPanel
                  persona={studioState.persona}
                  onPersonaChange={(persona) => setStudioState((s) => ({ ...s, persona }))}
                  memories={studioState.memories}
                  onAddMemory={(t) => handleAddMemory(t, 'manual')}
                  onRemoveMemory={(id) =>
                    setStudioState((s) => ({
                      ...s,
                      memories: s.memories.filter((m) => m.id !== id),
                    }))
                  }
                  onTogglePin={handleTogglePin}
                  preferences={studioState.preferences}
                  onPreferenceChange={(k, v) =>
                    setStudioState((s) => ({
                      ...s,
                      preferences: { ...s.preferences, [k]: v },
                    }))
                  }
                  onRemovePreference={(k) =>
                    setStudioState((s) => {
                      const next = { ...s.preferences }
                      delete next[k]
                      return { ...s, preferences: next }
                    })
                  }
                  onAddPreference={() => {
                    const key = newPrefKey.trim()
                    if (!key) return
                    setStudioState((s) => ({
                      ...s,
                      preferences: { ...s.preferences, [key]: '' },
                    }))
                    setNewPrefKey('')
                  }}
                  newPrefKey={newPrefKey}
                  onNewPrefKey={setNewPrefKey}
                  memoryDraft={memoryDraft}
                  onMemoryDraft={setMemoryDraft}
                />
              </div>

              <div>
                <InsightsPanel
                  insights={insights}
                  sessionGoal={sessionGoal}
                  onSessionGoalChange={setSessionGoal}
                  progress={sessionProgress}
                  onUsePrompt={setStudioDraft}
                />
                <ChatPanel
                  messages={studioState.messages}
                  sending={studioSending}
                  error={studioError}
                  apiReady={apiReady}
                  draft={studioDraft}
                  onDraftChange={setStudioDraft}
                  onSend={handleStudioSend}
                  onAddMemory={(t) => handleAddMemory(t, 'chat')}
                  onLearnFromChat={handleLearnFromChat}
                  learning={learnBusy}
                  onClearChat={() =>
                    setStudioState((s) => ({ ...s, messages: [] }))
                  }
                  suggestions={suggestions}
                  onUseSuggestion={setStudioDraft}
                  voiceRepliesEnabled={voiceRepliesEnabled}
                  onToggleVoiceReplies={() =>
                    setVoiceRepliesEnabled((prev) => {
                      if (prev) stopVoiceOutput()
                      return !prev
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <p className="section-label" style={{ textAlign: 'center' }}>
          Begin Today
        </p>
        <h2 className="section-title" style={{ textAlign: 'center' }}>
          Your Consciousness. Preserved. Continued.{' '}
          <span style={{ color: 'var(--gold)' }}>Eternal.</span>
        </h2>
      </section>

      <footer>
        <p className="footer-logo">✦ Digital Immortality</p>
        <p className="footer-note">Your soul, preserved in silicon and light.</p>
        <nav className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Ethics</a>
          <a href="#">Contact</a>
          <a href="#">Terms</a>
        </nav>
      </footer>
    </div>
  )
}
