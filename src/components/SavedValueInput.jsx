import { useMemo, useState } from 'react'
import VoiceTextarea from './VoiceTextarea'

export default function SavedValueInput({
  label,
  value,
  onChange,
  suggestions = [],
  multiline = false,
  rows = 2,
}) {
  const [focused, setFocused] = useState(false)

  const filteredSuggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase()
    return suggestions
      .filter((suggestion) => !query || suggestion.toLowerCase().includes(query))
      .slice(0, 8)
  }, [value, suggestions])

  function chooseSuggestion(suggestion) {
    onChange(suggestion)
    setFocused(false)
  }

  return (
    <div className="relative">
      <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
        {label}
      </label>
      {multiline ? (
        <VoiceTextarea
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder="Unesite komentar"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder="Počnite unositi ili odaberite raniji zapis"
          className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          autoComplete="off"
        />
      )}
      {focused && filteredSuggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-ink/10 bg-white shadow-lg text-sm">
          {filteredSuggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(suggestion)}
                className="w-full px-3 py-2 text-left hover:bg-accent/10"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
