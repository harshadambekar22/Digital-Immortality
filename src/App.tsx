import { type CSSProperties, useState } from 'react'
import './App.css'
import { completeUniversalReply, isApiConfigured } from './lib/chat'
import type { ChatMessage } from './types'

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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<(typeof LANG_OPTIONS)[number]>('auto')
  const apiReady = isApiConfigured()

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
