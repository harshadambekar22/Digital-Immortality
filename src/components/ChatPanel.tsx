import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import { formatMessageTime } from '../lib/time'
import { canUseVoiceInput, startVoiceInput, stopVoiceOutput } from '../lib/voice'

type Props = {
  messages: ChatMessage[]
  sending: boolean
  error: string | null
  apiReady: boolean
  draft: string
  onDraftChange: (text: string) => void
  onSend: (text: string) => void
  onAddMemory: (text: string) => void
  onLearnFromChat: () => void
  learning: boolean
  onClearChat: () => void
  suggestions: string[]
  onUseSuggestion: (text: string) => void
  voiceRepliesEnabled: boolean
  onToggleVoiceReplies: () => void
}

export function ChatPanel({
  messages,
  sending,
  error,
  apiReady,
  draft,
  onDraftChange,
  onSend,
  onAddMemory,
  onLearnFromChat,
  learning,
  onClearChat,
  suggestions,
  onUseSuggestion,
  voiceRepliesEnabled,
  onToggleVoiceReplies,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const stopListeningRef = useRef<(() => void) | null>(null)
  const draftRef = useRef(draft)
  const [copyId, setCopyId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    if (!copyId) return
    const t = window.setTimeout(() => setCopyId(null), 2000)
    return () => window.clearTimeout(t)
  }, [copyId])

  useEffect(
    () => () => {
      stopListeningRef.current?.()
      stopListeningRef.current = null
      stopVoiceOutput()
    },
    [],
  )

  async function copyToClipboard(text: string, messageId: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyId(messageId)
    } catch {
      setCopyId(null)
    }
  }

  function submitDraft() {
    const text = draft.trim()
    if (!text || sending) return
    onSend(text)
    onDraftChange('')
  }

  function toggleVoiceInput() {
    if (isListening) {
      stopListeningRef.current?.()
      stopListeningRef.current = null
      setIsListening(false)
      return
    }

    const stop = startVoiceInput({
      onChunk: (chunk) => {
        const current = draftRef.current
        onDraftChange(`${current}${current ? ' ' : ''}${chunk}`.trim())
      },
      onEnd: () => setIsListening(false),
      onError: () => setIsListening(false),
    })
    if (!stop) return
    stopListeningRef.current = stop
    setIsListening(true)
  }

  return (
    <section className="chat-panel" aria-label="Conversation">
      <div className="chat-toolbar">
        <button
          type="button"
          className="btn secondary"
          onClick={onLearnFromChat}
          disabled={learning || messages.length < 2 || !apiReady}
          title={
            apiReady
              ? 'Use AI to extract new memories and preferences from recent messages'
              : 'Requires VITE_OPENAI_API_KEY'
          }
        >
          {learning ? 'Learning…' : 'Learn from chat'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={onClearChat}
          disabled={messages.length === 0 || sending}
          title="Clear all messages in this chat"
        >
          Clear chat
        </button>
        <button
          type="button"
          className={`btn ghost ${isListening ? 'active-voice' : ''}`}
          onClick={toggleVoiceInput}
          disabled={!canUseVoiceInput() || sending}
          title={
            canUseVoiceInput()
              ? isListening
                ? 'Stop listening'
                : 'Speak to type'
              : 'Voice input not supported in this browser'
          }
        >
          {isListening ? 'Stop mic' : 'Voice input'}
        </button>
        <button
          type="button"
          className={`btn ghost ${voiceRepliesEnabled ? 'active-voice' : ''}`}
          onClick={onToggleVoiceReplies}
          title="Read assistant replies aloud"
        >
          Voice replies {voiceRepliesEnabled ? 'on' : 'off'}
        </button>
        {!apiReady && (
          <span className="hint small">
            Offline mode: add <code>VITE_OPENAI_API_KEY</code> for full AI.
          </span>
        )}
      </div>

      <div className="chat-messages" role="log" aria-live="polite">
        {messages.length === 0 && (
          <p className="empty-chat">
            Start a conversation. Your persona uses{' '}
            <strong>Memories</strong> and <strong>Preferences</strong> from the
            sidebar—teach it who you are.
          </p>
        )}
        {messages.map((m) => (
          <article
            key={m.id}
            className={`bubble ${m.role}`}
            data-role={m.role}
          >
            <header className="bubble-head">
              <span className="who">{m.role === 'user' ? 'You' : 'Persona'}</span>
              <time dateTime={new Date(m.createdAt).toISOString()}>
                {formatMessageTime(m.createdAt)}
              </time>
            </header>
            <p className="bubble-text">{m.content}</p>
            <div className="bubble-actions">
              {m.role === 'user' && (
                <button
                  type="button"
                  className="linkish"
                  onClick={() => onAddMemory(m.content)}
                >
                  Save as memory
                </button>
              )}
              {m.role === 'assistant' && (
                <button
                  type="button"
                  className="linkish"
                  onClick={() => copyToClipboard(m.content, m.id)}
                >
                  {copyId === m.id ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </article>
        ))}
        {sending && (
          <div className="bubble assistant loading" aria-busy="true">
            <header className="bubble-head">
              <span className="who">Persona</span>
            </header>
            <p>Thinking…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="suggestion-row" aria-label="Conversation starters">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="suggestion-chip"
              onClick={() => onUseSuggestion(s)}
              disabled={sending}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        ref={formRef}
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          submitDraft()
        }}
      >
        <label className="sr-only" htmlFor="chat-message">
          Message
        </label>
        <textarea
          id="chat-message"
          name="message"
          rows={3}
          placeholder="Speak with your digital persona…"
          value={draft}
          disabled={sending}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submitDraft()
            }
          }}
        />
        <div className="chat-form-row">
          <span className="kbd-hint">
            <kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line
          </span>
          <button type="submit" className="btn primary" disabled={sending}>
            Send
          </button>
        </div>
      </form>
    </section>
  )
}
