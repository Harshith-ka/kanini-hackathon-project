import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

export default function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { lang } = useLanguage()
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)

  useEffect(() => {
    const API = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!API) {
      setSupported(false)
      return
    }
    try {
      const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition!)()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
      rec.onresult = (e: SpeechRecognitionEvent) => {
        const last = e.results.length - 1
        const text = e.results[last][0].transcript
        if (e.results[last].isFinal && text.trim()) onTranscript(text.trim())
      }
      rec.onerror = () => setListening(false)
      rec.onend = () => setListening(false)
      setRecognition(rec)
      setSupported(true)
    } catch {
      setSupported(false)
    }
  }, [lang])

  const toggle = useCallback(() => {
    if (!recognition) return
    if (listening) {
      recognition.stop()
      setListening(false)
    } else {
      try {
        recognition.start()
        setListening(true)
      } catch {
        setListening(false)
      }
    }
  }, [recognition, listening])

  if (!supported) return null

  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          padding: '8px 14px',
          background: listening ? 'var(--red)' : 'var(--surface)',
          color: listening ? '#fff' : 'var(--text)',
          border: `1px solid ${listening ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 6,
          fontWeight: 600,
        }}
      >
        {listening ? '⏹ Stop' : '🎤 ' + t(lang, 'voiceInput')}
      </button>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t(lang, 'speakToAddSymptoms')}</span>
    </div>
  )
}
