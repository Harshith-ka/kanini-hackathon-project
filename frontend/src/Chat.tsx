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
      setMessages((m) => [...m, { role: 'bot', text: res.reply }])
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

  const resetChat = () => {
    setChatState({})
    setMessages([{ role: 'bot', text: "Chat state has been reset. How else can I assist you with triage or medical information today?" }])
    localStorage.removeItem('triage_chat_symptoms')
  }

  return (
    <div className="glass-card" style={{
      display: 'flex', flexDirection: 'column', height: '100%', padding: 0, overflow: 'hidden',
      border: '1px solid var(--border)', maxWidth: 800, margin: '0 auto'
    }}>
      {/* Chat Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>AI Triage Assistant</h3>
            <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
              ACTIVE SESSION
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={resetChat} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: 11, fontWeight: 700 }}>Reset Session</button>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              padding: '12px 18px',
              borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              background: m.role === 'user' ? 'linear-gradient(135deg, var(--accent), #2563eb)' : 'var(--surface-solid)',
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              boxShadow: m.role === 'user' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
              color: '#fff',
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {m.text.split('\n').map((line, li) => (
                <div key={li} style={{
                  marginBottom: line.startsWith('###') ? '1rem' : line.trim() === '' ? '0.5rem' : '0',
                  fontWeight: line.startsWith('###') || line.startsWith('**') ? 700 : 400,
                  fontSize: line.startsWith('###') ? 16 : 14,
                  color: line.startsWith('###') ? 'var(--accent)' : '#fff'
                }}>
                  {line.replace(/^###\s*/, '').replace(/\*\*/g, '')}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{m.role === 'user' ? 'User' : 'AI Assistant'}</span>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '12px 18px', background: 'var(--surface-solid)', borderRadius: '20px 20px 20px 4px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}></span>
              <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animationDelay: '0.2s' }}></span>
              <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Describe your symptoms or ask a question..."
            style={{
              width: '100%',
              padding: '14px 100px 14px 20px',
              background: 'var(--surface-solid)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none'
            }}
          />
          <div style={{ position: 'absolute', right: 8, display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>📎</button>
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: '8px 20px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                boxShadow: '0 4px 12px var(--accent-glow)'
              }}
            >
              Send
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: '1rem', overflowX: 'auto', paddingBottom: 8 }}>
          <button
            onClick={() => { setInput('Why is this patient high risk? Explain the contributing factors.'); }}
            style={{ whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8 }}
          >
            Explain Risk Factors
          </button>
          <button
            onClick={() => { setInput('Explain SpO2 and normal heart rate ranges.'); }}
            style={{ whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8 }}
          >
            Medical Info
          </button>
          <button
            onClick={() => { setInput('Help me triage a new patient. I will describe their symptoms.'); }}
            style={{ whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8 }}
          >
            Start Guided Intake
          </button>
        </div>
      </div>
    </div>
  )
}
