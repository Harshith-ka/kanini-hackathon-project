
import { useState, useEffect, useRef } from 'react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window)) {
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      onTranscript(text)
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
  }, [onTranscript])

  const toggleListening = () => {
    if (disabled || !recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  if (!recognitionRef.current) return null

  return (
    <button
      onClick={toggleListening}
      disabled={disabled}
      style={{
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: 'none',
        background: isListening ? 'var(--critical)' : '#f1f5f9',
        color: isListening ? '#fff' : '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 18,
        transition: 'all 0.2s',
        animation: isListening ? 'pulse 1.5s infinite' : 'none'
      }}
      title="Voice Input"
    >
      {isListening ? '🎙️' : '🎤'}
    </button>
  )
}
