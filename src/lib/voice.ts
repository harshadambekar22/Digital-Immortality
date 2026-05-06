type RecognitionCtor = new () => RecognitionLike

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type RecognitionResultLike = {
  isFinal: boolean
  0: { transcript: string }
}

type RecognitionEventLike = {
  resultIndex: number
  results: RecognitionResultLike[]
}

type VoiceInputHandlers = {
  lang?: string
  onChunk: (text: string) => void
  onEnd?: () => void
  onError?: (message: string) => void
}

const speech = window.speechSynthesis

function getCtor(): RecognitionCtor | null {
  const maybe = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return maybe.SpeechRecognition ?? maybe.webkitSpeechRecognition ?? null
}

export function canUseVoiceInput(): boolean {
  return Boolean(getCtor())
}

export function canUseVoiceOutput(): boolean {
  return typeof speech !== 'undefined'
}

export function startVoiceInput(handlers: VoiceInputHandlers): (() => void) | null {
  const Ctor = getCtor()
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = handlers.lang ?? navigator.language ?? 'en-US'
  recognition.continuous = true
  recognition.interimResults = false
  recognition.onresult = (event) => {
    let chunk = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i]
      if (result.isFinal) chunk += ` ${result[0].transcript}`
    }
    const clean = chunk.trim()
    if (clean) handlers.onChunk(clean)
  }
  recognition.onerror = (event) => {
    handlers.onError?.(event.error ?? 'Voice input failed')
  }
  recognition.onend = () => {
    handlers.onEnd?.()
  }
  recognition.start()
  return () => recognition.stop()
}

export function speakReply(text: string): void {
  if (!canUseVoiceOutput()) return
  speech.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1
  utterance.pitch = 1
  utterance.volume = 1
  speech.speak(utterance)
}

export function stopVoiceOutput(): void {
  if (!canUseVoiceOutput()) return
  speech.cancel()
}
