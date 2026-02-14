import { useState, useRef, useEffect } from 'react'
import { chat } from './api'
import type { ChatState } from './types'
import VoiceInput from './VoiceInput'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'

interface Message {
  role: 'user' | 'bot'
  text: string
}

export default function Chat() {
  const { lang } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: t(lang, 'appTitle') + " - " + t(lang, 'speakToAddSymptoms') },
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
      setMessages((m) => [...m, { role: 'bot', text: 'Connection interrupt. Please re-submit your query.' }])
    } finally {
      setLoading(false)
    }
  }

  const resetChat = () => {
    setChatState({})
    setMessages([{ role: 'bot', text: "Clinical context reset. How can I assist you with your health assessment today?" }])
    localStorage.removeItem('triage_chat_symptoms')
  }

  return (
    <div className="glass-card" style={{
      display: 'flex', flexDirection: 'column', height: '100%', padding: 0, overflow: 'hidden',
      border: '1px solid var(--border)', maxWidth: 840, margin: '0 auto', background: '#fff'
    }}>
      {/* Chat Header */}
      <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            boxShadow: '0 8px 16px var(--accent-glow)'
          }}>🤖</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Clinical Intelligence Assistant</h3>
            <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }}></span>
              Neural Network Online
            </div>
          </div>
        </div>
        <button onClick={resetChat} style={{ padding: '10px 20px', borderRadius: 12, background: '#fff', border: '1px solid var(--border)', color: '#64748b', fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }} className="button-hover">Reset Protocol</button>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: '#f8fafc' }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
              animation: 'fadeIn 0.3s ease-out'
            }}
          >
            <div style={{
              padding: '1.25rem 1.75rem',
              borderRadius: m.role === 'user' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
              background: m.role === 'user' ? '#0f172a' : '#fff',
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              boxShadow: m.role === 'user' ? '0 10px 20px rgba(15, 23, 42, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.03)',
              color: m.role === 'user' ? '#fff' : '#1e293b',
              fontSize: 15,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              fontWeight: 500
            }}>
              {m.text.split('\n').map((line, li) => (
                <div key={li} style={{
                  marginBottom: line.startsWith('###') ? '1.5rem' : line.trim() === '' ? '0.75rem' : '0',
                  fontWeight: line.startsWith('###') || line.startsWith('**') ? 900 : 500,
                  fontSize: line.startsWith('###') ? 18 : 15,
                  color: line.startsWith('###') ? (m.role === 'user' ? '#fff' : 'var(--accent)') : 'inherit',
                  letterSpacing: line.startsWith('###') ? '-0.02em' : 'normal'
                }}>
                  {line.replace(/^###\s*/, '').replace(/\*\*/g, '')}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px' }}>
              {m.role === 'user' ? 'Clinical Staff' : 'Core AI'}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '1.25rem 1.75rem', background: '#fff', borderRadius: '24px 24px 24px 4px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 1, 2].map(dot => (
                <span key={dot} className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', opacity: 0.4 }}></span>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '2.5rem', borderTop: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={t(lang, 'speakToAddSymptoms')}
            style={{
              width: '100%',
              padding: '18px 140px 18px 28px',
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: 20,
              color: '#0f172a',
              fontSize: 15,
              fontWeight: 600,
              outline: 'none',
              transition: 'all 0.2s',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}
          />
          <div style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 24px',
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                transition: 'all 0.2s',
                height: 42
              }}
              className="button-hover"
            >
              {t(lang, 'send')}
            </button>
            <div style={{ width: 1, height: 24, background: '#cbd5e1' }}></div>
            <VoiceInput onTranscript={(text) => setInput(text)} disabled={loading} />
          </div>
        </div>
      </div>

      {/* Safety Disclaimer */}
      <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
        ⚠️ {t(lang, 'aiDisclaimer')}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: '1.5rem', overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none', justifyContent: 'center' }}>
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
        {[
          { label: 'Interpret Risk', text: 'Break down the specific clinical drivers behind the current risk assessment.' },
          { label: 'Biometric Norms', text: 'What are the critical thresholds for SpO2 and HR in adult emergency triage?' },
          { label: 'Differential AI', text: 'Generate a list of high-probability differential diagnoses based on these symptoms.' }
        ].map(btn => (
          <button
            key={btn.label}
            onClick={() => { setInput(btn.text); }}
            style={{ whiteSpace: 'nowrap', fontSize: 11, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-light)', padding: '10px 20px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}
            className="button-hover"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
