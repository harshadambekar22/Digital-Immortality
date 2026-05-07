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

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true })
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
  // eslint-disable-next-line no-console
  console.log(`Digital Immortality API listening on http://localhost:${PORT}`)
})

