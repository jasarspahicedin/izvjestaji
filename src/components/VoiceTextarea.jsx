import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2 } from 'lucide-react'

export default function VoiceTextarea({ label, value, onChange, rows = 2, description, className = '' }) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef(null)
  const valueRef = useRef(value || '')

  useEffect(() => {
    valueRef.current = value || ''
  }, [value])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setIsSupported(false)
      setStatusText('Glasovni unos nije podržan u ovom pregledniku. Pokušaj Chrome ili Edge.')
      return undefined
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'hr-HR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setStatusText('Slušam...')
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += `${transcript} `
        }
      }

      const spokenText = finalText.trim()
      if (!spokenText) return

      const currentValue = valueRef.current || ''
      const nextValue = currentValue ? `${currentValue}\n${spokenText}` : spokenText
      valueRef.current = nextValue
      onChange(nextValue)
      setStatusText('Gotovo.')
      recognition.stop()
    }

    recognition.onerror = (event) => {
      const errorMessage = {
        network: 'Glasovni unos trenutno nije dostupan. Provjeri internet, mikrofon i pokušaj ponovno u Chrome/Edge-u.',
        'not-allowed': 'Dozvoli pristup mikrofonu da bi se koristio glasovni unos.',
        'audio-capture': 'Nisam uspio pristupiti mikrofonu.',
        'no-speech': 'Nisam čuo govor. Pokušaj ponovno.',
        aborted: 'Otkazano.',
      }[event.error]

      setStatusText(errorMessage || `Greška: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [onChange])

  function toggleListening() {
    if (!recognitionRef.current) {
      setStatusText('Glasovni unos nije podržan u ovom pregledniku. Pokušaj Chrome ili Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setStatusText('Zaustavljeno.')
      return
    }

    try {
      recognitionRef.current.start()
    } catch (error) {
      setStatusText('Nisam uspio pokrenuti glasovni unos. Pokušaj ponovno.')
      setIsListening(false)
    }
  }

  function speakText() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setStatusText('Tekst u govor nije podržan u ovom pregledniku.')
      return
    }

    const text = (value || '').trim()
    if (!text) {
      setStatusText('Nema teksta za čitanje.')
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'hr-HR'
    utterance.rate = 1
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onerror = () => setIsSpeaking(false)
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setStatusText('Čitam...')
  }

  return (
    <div>
      {label && (
        <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">{label}</label>
      )}
      {description && <p className="text-[11px] text-ink/40 mb-2">{description}</p>}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={toggleListening}
          disabled={!isSupported}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs ${
            isListening ? 'border-red-400 bg-red-50 text-red-600' : 'border-ink/15 text-ink/70 hover:bg-ink/5'
          } ${!isSupported ? 'cursor-not-allowed opacity-50' : ''}`}
          title={isListening ? 'Zaustavi snimanje' : 'Snimaj glasovnu poruku'}
        >
          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          {isListening ? 'Zaustavi' : 'Glas'}
        </button>
        <button
          type="button"
          onClick={speakText}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs ${
            isSpeaking ? 'border-accent bg-accent/10 text-accent' : 'border-ink/15 text-ink/70 hover:bg-ink/5'
          }`}
          title="Pročitaj tekst naglas"
        >
          <Volume2 size={14} />
          Čitaj
        </button>
      </div>
      {statusText && <p className="text-[11px] text-ink/50 mb-2">{statusText}</p>}
      <textarea
        rows={rows}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent ${className}`}
      />
    </div>
  )
}
