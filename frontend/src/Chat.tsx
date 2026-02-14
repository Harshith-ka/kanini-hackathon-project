import { useState, useRef, useEffect } from 'react'
import { chat } from './api'
import type { ChatState } from './types'

interface Message {
  role: 'user' | 'bot'
  text: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Hi, I'm the Triage Support Bot. I can help you with: (1) Guided symptom collection — just describe how you feel. (2) After adding a patient, ask 'Why am I high risk?' or 'Why Emergency?' for an explanation. (3) Ask 'What is SpO2?' or other medical terms for general info. How can I help?" },
  ])
  const [input, setInput] = useState('')
  const [chatState, setChatState] = useState<ChatState>({})
  const [lastPatientId, setLastPatientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = localStorage.getItem('triage_last_patient_id')
    if (id) setLastPatientId(id)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const res = await chat(msg, chatState, lastPatientId)
      setChatState(res.chat_state)
      const reply = res.reply.replace(/\*\*(.*?)\*\*/g, '$1')
      setMessages((m) => [...m, { role: 'bot', text: reply }])
      if (res.collected_symptoms?.length) {
        const stored = localStorage.getItem('triage_chat_symptoms')
        const prev = stored ? JSON.parse(stored) : []
        const combined = [...new Set([...prev, ...res.collected_symptoms])]
        localStorage.setItem('triage_chat_symptoms', JSON.stringify(combined))
      }
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <h1 style={{ marginBottom: '1rem' }}>Triage Support Bot</h1>
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              background: m.role === 'user' ? 'var(--accent)' : 'var(--bg)',
              color: m.role === 'user' ? '#fff' : 'var(--text)',
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)' }}>…</div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          Send
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        General info only, not medical advice. After adding a patient, use &quot;Why am I high risk?&quot; or &quot;Why Emergency?&quot; for explanations.
      </p>
    </div>
  )
}
