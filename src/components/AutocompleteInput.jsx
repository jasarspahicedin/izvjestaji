import { useMemo, useState } from 'react'

/**
 * Tekstualni input sa autocomplete prijedlozima iz liste ranije unesenih vrijednosti.
 * suggestions: string[] - sve poznate vrijednosti za ovo polje (za trenutnog korisnika)
 */
export default function AutocompleteInput({ label, value, onChange, suggestions = [] }) {
  const [focused, setFocused] = useState(false)

  const filtered = useMemo(() => {
    const q = (value || '').trim().toLowerCase()
    if (!q) return suggestions.slice(0, 6)
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 6)
  }, [value, suggestions])

  const showList = focused && filtered.length > 0

  return (
    <div className="relative">
      <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        autoComplete="off"
      />
      {showList && (
        <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-ink/10 bg-white shadow-lg text-sm">
          {filtered.map((s) => (
            <li
              key={s}
              onMouseDown={() => onChange(s)}
              className="px-3 py-2 cursor-pointer hover:bg-accent/10"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
