import { useState } from 'react'
import VoiceTextarea from './VoiceTextarea'

const ADD_NEW_VALUE = '__add_new_value__'

export default function SavedValueInput({
  label,
  value,
  onChange,
  suggestions = [],
  multiline = false,
  description,
  rows = 2,
}) {
  const [addingNew, setAddingNew] = useState(false)
  const matchingIndex = suggestions.indexOf(value)
  const isNewValue = addingNew || (Boolean(value) && matchingIndex < 0)
  const selectedValue = isNewValue
    ? ADD_NEW_VALUE
    : matchingIndex >= 0
      ? String(matchingIndex)
      : ''

  function handleSelectChange(event) {
    const selected = event.target.value
    if (selected === '') {
      setAddingNew(false)
      onChange('')
      return
    }
    if (selected === ADD_NEW_VALUE) {
      setAddingNew(true)
      return
    }

    setAddingNew(false)
    onChange(suggestions[Number(selected)])
  }

  return (
    <div>
      <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
        {label}
      </label>
      {description && <p className="text-[11px] text-ink/40 mb-2">{description}</p>}
      <select
        value={selectedValue}
        onChange={handleSelectChange}
        className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
      >
        <option value="">Odaberite raniji zapis ili dodajte novi</option>
        {suggestions.map((suggestion, index) => (
          <option key={`${index}-${suggestion}`} value={String(index)}>
            {suggestion}
          </option>
        ))}
        <option value={ADD_NEW_VALUE}>Dodaj novi zapis</option>
      </select>
      {isNewValue && (
        <div className="mt-2">
          {multiline ? (
            <VoiceTextarea
              value={value}
              onChange={onChange}
              rows={rows}
            />
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(event) => onChange(event.target.value)}
              className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              autoComplete="off"
              autoFocus
            />
          )}
        </div>
      )}
    </div>
  )
}
