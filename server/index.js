import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const PORT = Number(process.env.PORT ?? 8787)
const DATA_DIR = path.resolve(process.cwd(), 'data')
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(
  /\/$/,
  '',
)
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function safeId(raw) {
  const s = String(raw || '').trim()
  if (!s) return crypto.randomUUID()
  return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || crypto.randomUUID()
}

async function writeJson(file, data) {
  const tmp = `${file}.${crypto.randomUUID()}.tmp`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function nowIso() {
  return new Date().toISOString()
}

function asArray(v) {
  return Array.isArray(v) ? v : []
}

function pickString(v, max = 4000) {
  return String(v ?? '').slice(0, max)
}

function userFile() {
  return path.join(DATA_DIR, 'users.json')
}

function memoriesFile(userId) {
  return path.join(DATA_DIR, `memories.${safeId(userId)}.json`)
}

function timelineFile(userId) {
  return path.join(DATA_DIR, `timeline.${safeId(userId)}.json`)
}

function chatFile(userId) {
  return path.join(DATA_DIR, `chat.${safeId(userId)}.json`)
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true })
})

// ---- Users (mirrors Emergent-style /users) ----
app.get('/api/users', async (_req, res) => {
  await ensureDataDir()
  const users = await readJson(userFile(), [])
  res.json({ ok: true, users })
})

app.post('/api/users', async (req, res) => {
  await ensureDataDir()
  const users = await readJson(userFile(), [])
  const name = pickString(req.body?.name, 120).trim()
  const email = pickString(req.body?.email, 180).trim()
  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }
  const user = { id: safeId(req.body?.id), name, email, createdAt: nowIso() }
  users.push(user)
  await writeJson(userFile(), users)
  res.json({ ok: true, user })
})

app.put('/api/users/:userId', async (req, res) => {
  await ensureDataDir()
  const users = await readJson(userFile(), [])
  const userId = safeId(req.params.userId)
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  const name = pickString(req.body?.name, 120).trim()
  const email = pickString(req.body?.email, 180).trim()
  users[idx] = { ...users[idx], ...(name ? { name } : {}), ...(email ? { email } : {}) }
  await writeJson(userFile(), users)
  res.json({ ok: true, user: users[idx] })
})

app.post('/api/ingest', async (req, res) => {
  await ensureDataDir()
  const clientId = safeId(req.body?.clientId)
  const state = req.body?.state
  if (!state || typeof state !== 'object') {
    res.status(400).json({ error: 'Missing state' })
    return
  }
  const record = {
    clientId,
    receivedAt: Date.now(),
    state,
  }
  await writeJson(path.join(DATA_DIR, `${clientId}.json`), record)
  res.json({ ok: true, clientId })
})

// ---- Memories (mirrors /memories) ----
app.get('/api/memories/:userId', async (req, res) => {
  await ensureDataDir()
  const file = memoriesFile(req.params.userId)
  const memories = await readJson(file, [])
  res.json({ ok: true, memories })
})

app.post('/api/memories', async (req, res) => {
  await ensureDataDir()
  const userId = safeId(req.body?.userId)
  const text = pickString(req.body?.text, 800).trim()
  const source = pickString(req.body?.source, 32).trim() || 'manual'
  if (!userId || !text) {
    res.status(400).json({ error: 'userId and text are required' })
    return
  }
  const file = memoriesFile(userId)
  const memories = await readJson(file, [])
  const memory = { id: safeId(req.body?.id), userId, text, source, createdAt: Date.now() }
  memories.unshift(memory)
  await writeJson(file, memories)
  res.json({ ok: true, memory })
})

app.delete('/api/memories/:memoryId', async (req, res) => {
  await ensureDataDir()
  const userId = safeId(req.query.userId)
  if (!userId) {
    res.status(400).json({ error: 'userId query param is required' })
    return
  }
  const file = memoriesFile(userId)
  const memories = await readJson(file, [])
  const next = memories.filter((m) => m.id !== safeId(req.params.memoryId))
  await writeJson(file, next)
  res.json({ ok: true })
})

// ---- Timeline (mirrors /timeline) ----
app.get('/api/timeline/:userId', async (req, res) => {
  await ensureDataDir()
  const events = await readJson(timelineFile(req.params.userId), [])
  res.json({ ok: true, events })
})

app.post('/api/timeline', async (req, res) => {
  await ensureDataDir()
  const userId = safeId(req.body?.userId)
  const title = pickString(req.body?.title, 200).trim()
  const body = pickString(req.body?.body, 1200).trim()
  const when = pickString(req.body?.when, 40).trim() || nowIso()
  if (!userId || !title) {
    res.status(400).json({ error: 'userId and title are required' })
    return
  }
  const file = timelineFile(userId)
  const events = await readJson(file, [])
  const event = { id: safeId(req.body?.id), userId, title, body, when, createdAt: Date.now() }
  events.unshift(event)
  await writeJson(file, events)
  res.json({ ok: true, event })
})

// ---- Chat history (mirrors /chat + /chat/history/:userId) ----
app.get('/api/chat/history/:userId', async (req, res) => {
  await ensureDataDir()
  const history = await readJson(chatFile(req.params.userId), [])
  res.json({ ok: true, history })
})

app.post('/api/chat', async (req, res) => {
  await ensureDataDir()
  const userId = safeId(req.body?.userId)
  const mode = pickString(req.body?.mode, 24).trim() || 'universal'
  const preferredLanguage = pickString(req.body?.preferredLanguage, 40).trim() || 'auto'
  const system = pickString(req.body?.system, 8000).trim()
  const content = pickString(req.body?.content, 8000).trim()
  const messages = asArray(req.body?.messages)
  if (!userId) {
    res.status(400).json({ error: 'userId is required' })
    return
  }
  const file = chatFile(userId)
  const history = await readJson(file, [])
  if (content) history.push({ role: 'user', content, at: Date.now() })

  try {
    let reply = ''
    if (mode === 'persona') {
      if (!system) throw new Error('Missing system prompt')
      const payload = messages.length > 0 ? messages : history.map((m) => ({ role: m.role, content: m.content }))
      reply = await openaiChat([{ role: 'system', content: system }, ...payload], 0.75, 1024)
    } else {
      const sys = `You are a multilingual AI chatbot for a product called Digital Immortality.
Understand and respond in ANY language.
- If preferred language is "auto", detect the user's language from their latest message and reply in that same language.
- If preferred language is a specific language, reply in that language unless the user explicitly asks otherwise.
Preferred language: ${preferredLanguage}`.trim()
      const payload = messages.length > 0 ? messages : history.map((m) => ({ role: m.role, content: m.content }))
      reply = await openaiChat([{ role: 'system', content: sys }, ...payload], 0.6, 900)
    }
    history.push({ role: 'assistant', content: reply, at: Date.now() })
    await writeJson(file, history.slice(-200))
    res.json({ ok: true, reply })
  } catch (e) {
    await writeJson(file, history.slice(-200))
    res.status(500).json({ error: e instanceof Error ? e.message : 'Chat failed' })
  }
})

// ---- Analytics (mirrors /analytics/:userId) ----
app.get('/api/analytics/:userId', async (req, res) => {
  await ensureDataDir()
  const userId = safeId(req.params.userId)
  const memories = await readJson(memoriesFile(userId), [])
  const timeline = await readJson(timelineFile(userId), [])
  const history = await readJson(chatFile(userId), [])
  const userMessages = history.filter((m) => m.role === 'user').length
  const assistantMessages = history.filter((m) => m.role === 'assistant').length
  res.json({
    ok: true,
    analytics: {
      memories: memories.length,
      timelineEvents: timeline.length,
      userMessages,
      assistantMessages,
      updatedAt: nowIso(),
    },
  })
})

async function openaiChat(messages, temperature, max_tokens) {
  if (!OPENAI_API_KEY) throw new Error('Server missing OPENAI_API_KEY')
  const r = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature,
      max_tokens,
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(t || `OpenAI request failed (${r.status})`)
  }
  const data = await r.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from model')
  return text
}

app.post('/api/chat/universal', async (req, res) => {
  try {
    const preferredLanguage = String(req.body?.preferredLanguage ?? 'auto')
    const payload = Array.isArray(req.body?.messages) ? req.body.messages : []
    const system = `You are a multilingual AI chatbot for a product called Digital Immortality.
Understand and respond in ANY language.
- If preferred language is "auto", detect the user's language from their latest message and reply in that same language.
- If preferred language is a specific language, reply in that language unless the user explicitly asks otherwise.
- Keep responses clear, friendly, and concise by default.
- Preserve technical terms and proper nouns when needed.
Preferred language: ${preferredLanguage}`.trim()
    const text = await openaiChat([{ role: 'system', content: system }, ...payload], 0.6, 900)
    res.json({ ok: true, text })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Chat failed' })
  }
})

app.post('/api/chat/persona', async (req, res) => {
  try {
    const system = String(req.body?.system ?? '').trim()
    const payload = Array.isArray(req.body?.messages) ? req.body.messages : []
    if (!system) {
      res.status(400).json({ error: 'Missing system prompt' })
      return
    }
    const text = await openaiChat([{ role: 'system', content: system }, ...payload], 0.75, 1024)
    res.json({ ok: true, text })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Chat failed' })
  }
})

app.post('/api/learn', async (req, res) => {
  try {
    const transcript = String(req.body?.transcript ?? '')
    const existing = String(req.body?.existing ?? '')
    const system = `You help build a personal knowledge base for a \"digital persona\".
Given a chat transcript and existing memories, output ONLY compact JSON with this shape (no markdown):
{\"newMemories\":[\"short factual bullet about the user\"],\"preferences\":{\"key\":\"value\"}}

Rules:
- newMemories: only NEW stable facts or preferences the user stated; no duplicates of existing memories.
- preferences: optional flat string map. Empty object {} if nothing new.
- If nothing to learn, return {\"newMemories\":[],\"preferences\":{}}
- Keep memory bullets under 200 characters each; at most 8 items.`.trim()
    const userContent = `EXISTING MEMORIES:\n${existing || '(none)'}\n\nTRANSCRIPT:\n${transcript}`
    const text = await openaiChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      0.2,
      800,
    )
    res.json({ ok: true, text })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Learn failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Digital Immortality API listening on http://localhost:${PORT}`)
})

