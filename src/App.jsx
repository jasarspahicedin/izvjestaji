import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import AutocompleteInput from './components/AutocompleteInput'
import { TEXT_FIELDS, TEXTAREA_FIELDS, emptyVisit } from './lib/fields'
import { todayYMD, formatDisplay, getWeekDates } from './lib/dateUtils'
import { generateDailyReport, generateWeeklyReport } from './lib/reportGenerator'
import { guessKanton } from './lib/kantoni'
import { ChevronLeft, ChevronRight, Plus, Trash2, FileText, Sheet, Loader2, Pencil } from 'lucide-react'

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink/50">
        <Loader2 className="animate-spin" size={20} />
      </div>
    )
  }

  if (!session) return <Login />

  return <ReportApp session={session} />
}

function ReportApp({ session }) {
  const userId = session.user.id
  const userEmail = session.user.email
  const [fullName, setFullName] = useState(session.user.user_metadata?.full_name || '')

  async function editFullName() {
    const value = window.prompt('Ime i prezime (koristi se kao "Stručni saradnik" u izvještajima):', fullName)
    if (value === null) return
    const trimmed = value.trim()
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
    if (!error) setFullName(trimmed)
  }

  const [date, setDate] = useState(todayYMD())
  const [visits, setVisits] = useState([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('') // '', 'saving', 'saved'
  const [suggestions, setSuggestions] = useState({})
  const [busyReport, setBusyReport] = useState(false)
  const [dailyNote, setDailyNote] = useState('')
  const saveTimer = useRef(null)
  const noteTimer = useRef(null)

  // Ucitaj poznate vrijednosti za autocomplete (jednom, po polju)
  useEffect(() => {
    async function loadSuggestions() {
      const result = {}
      for (const f of TEXT_FIELDS) {
        const { data, error } = await supabase
          .from('visits')
          .select(f.key)
          .eq('user_id', userId)
          .not(f.key, 'is', null)
          .neq(f.key, '')
          .limit(500)
        if (!error && data) {
          result[f.key] = [...new Set(data.map((r) => r[f.key]).filter(Boolean))]
        }
      }
      setSuggestions(result)
    }
    loadSuggestions()
  }, [userId])

  // Ucitaj posjete i dnevni (zajednicki) komentar za odabrani datum
  useEffect(() => {
    async function loadDay() {
      setLoading(true)

      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', userId)
        .eq('visit_date', date)
        .order('visit_order', { ascending: true })

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      if (data.length === 0) {
        const { data: created, error: insertErr } = await supabase
          .from('visits')
          .insert({ user_id: userId, visit_date: date, visit_order: 1, ...emptyVisit() })
          .select()
          .single()
        if (!insertErr) {
          setVisits([created])
          setIndex(0)
        }
      } else {
        setVisits(data)
        setIndex(0)
      }

      const { data: note } = await supabase
        .from('daily_notes')
        .select('generalni_komentar')
        .eq('user_id', userId)
        .eq('visit_date', date)
        .maybeSingle()
      setDailyNote(note?.generalni_komentar || '')

      setLoading(false)
    }
    loadDay()
  }, [date, userId])

  const current = visits[index]

  function updateField(key, value) {
    setVisits((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
    setSaveStatus('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveCurrent(key, value), 500)
  }

  async function saveCurrent(key, value) {
    if (!current) return
    const { error } = await supabase
      .from('visits')
      .update({ [key]: value })
      .eq('id', current.id)
    setSaveStatus(error ? '' : 'saved')
    if (!error) {
      setSuggestions((prev) => {
        const list = prev[key] || []
        if (value && !list.includes(value)) return { ...prev, [key]: [value, ...list] }
        return prev
      })
      setTimeout(() => setSaveStatus(''), 1500)
    }
  }

  function updateDailyNote(value) {
    setDailyNote(value)
    setSaveStatus('saving')
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => saveDailyNote(value), 500)
  }

  async function saveDailyNote(value) {
    const { error } = await supabase
      .from('daily_notes')
      .upsert({ user_id: userId, visit_date: date, generalni_komentar: value }, { onConflict: 'user_id,visit_date' })
    setSaveStatus(error ? '' : 'saved')
    if (!error) setTimeout(() => setSaveStatus(''), 1500)
  }

  async function goPrev() {
    if (index > 0) setIndex(index - 1)
  }

  async function goNext() {
    if (index < visits.length - 1) {
      setIndex(index + 1)
      return
    }
    const maxOrder = Math.max(0, ...visits.map((v) => v.visit_order))
    const { data, error } = await supabase
      .from('visits')
      .insert({ user_id: userId, visit_date: date, visit_order: maxOrder + 1, ...emptyVisit() })
      .select()
      .single()
    if (!error) {
      setVisits((prev) => [...prev, data])
      setIndex(visits.length)
    }
  }

  async function deleteCurrent() {
    if (!current || visits.length === 1) return
    const ok = window.confirm('Obrisati ovu posjetu?')
    if (!ok) return
    const { error } = await supabase.from('visits').delete().eq('id', current.id)
    if (!error) {
      const next = visits.filter((_, i) => i !== index)
      setVisits(next)
      setIndex(Math.max(0, index - 1))
    }
  }

  function hasContent(v) {
    return [...TEXT_FIELDS, ...TEXTAREA_FIELDS].some((f) => (v[f.key] || '').trim())
  }

  async function handleDailyReport() {
    setBusyReport(true)
    try {
      const nonEmpty = visits.filter(hasContent)
      await generateDailyReport(date, nonEmpty.length ? nonEmpty : visits, fullName, dailyNote)
    } finally {
      setBusyReport(false)
    }
  }

  async function handleWeeklyReport() {
    setBusyReport(true)
    try {
      const weekDates = getWeekDates(date)
      const groups = []
      for (const d of weekDates) {
        const { data } = await supabase
          .from('visits')
          .select('*')
          .eq('user_id', userId)
          .eq('visit_date', d)
          .order('visit_order', { ascending: true })
        const nonEmpty = (data || []).filter(hasContent)

        const { data: note } = await supabase
          .from('daily_notes')
          .select('generalni_komentar')
          .eq('user_id', userId)
          .eq('visit_date', d)
          .maybeSingle()

        if (nonEmpty.length || note?.generalni_komentar) {
          groups.push({ date: d, visits: nonEmpty, generalniKomentar: note?.generalni_komentar || '' })
        }
      }
      if (groups.length === 0) {
        alert('Nema unesenih posjeta u ovoj sedmici.')
        return
      }
      const label = `${formatDisplay(weekDates[0])} - ${formatDisplay(weekDates[6])}`
      await generateWeeklyReport(label, fullName, groups)
    } finally {
      setBusyReport(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-ink/10 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-mono text-xs uppercase tracking-wide text-accent">Terenski izvještaji</h1>
            <button
              onClick={editFullName}
              className="flex items-center gap-1 text-xs text-ink/40 hover:text-ink"
              title="Izmijeni ime i prezime"
            >
              {fullName || userEmail} <Pencil size={11} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink/40 w-14 text-right">
              {saveStatus === 'saving' && 'čuvanje…'}
              {saveStatus === 'saved' && 'sačuvano'}
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-ink/15 px-2 py-1.5 text-sm"
            />
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-ink/40 hover:text-ink">
              Odjava
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16 text-ink/40">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goPrev}
                disabled={index === 0}
                className="flex items-center gap-1 text-sm px-3 py-2 rounded-md border border-ink/15 disabled:opacity-30 hover:bg-ink/5"
              >
                <ChevronLeft size={16} /> Prethodna posjeta
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink/50">
                  posjeta {index + 1} / {visits.length}
                </span>
                {visits.length > 1 && (
                  <button
                    onClick={deleteCurrent}
                    title="Obriši ovu posjetu"
                    className="text-ink/30 hover:text-red-600 p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <button
                onClick={goNext}
                className="flex items-center gap-1 text-sm px-3 py-2 rounded-md border border-ink/15 hover:bg-ink/5"
              >
                Sljedeća posjeta <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex gap-1.5 mb-5 flex-wrap">
              {visits.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setIndex(i)}
                  className={`font-mono text-xs w-8 h-8 rounded-md border ${
                    i === index
                      ? 'bg-accent text-white border-accent'
                      : 'border-ink/15 text-ink/50 hover:bg-ink/5'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </button>
              ))}
              <button
                onClick={goNext}
                title="Nova posjeta"
                className="w-8 h-8 rounded-md border border-dashed border-ink/25 text-ink/40 hover:bg-ink/5 flex items-center justify-center"
              >
                <Plus size={15} />
              </button>
            </div>

            {current && (
              <div className="bg-white rounded-lg border border-ink/10 p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TEXT_FIELDS.map((f) => (
                    <div key={f.key}>
                      <AutocompleteInput
                        label={f.label}
                        value={current[f.key]}
                        onChange={(val) => updateField(f.key, val)}
                        suggestions={suggestions[f.key] || []}
                      />
                      {f.key === 'mjesto' && current.mjesto && (
                        <p className="text-[11px] text-ink/40 mt-1">
                          {guessKanton(current.mjesto)
                            ? `Prepoznato: ${guessKanton(current.mjesto)}`
                            : 'Kanton/regija nije prepoznat(a) — biće prazno u izvještaju'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {TEXTAREA_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                        {f.label}
                      </label>
                      <textarea
                        rows={2}
                        value={current[f.key] || ''}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generalni komentar - JEDAN, za citav dan, ne po posjeti */}
            <div className="bg-white rounded-lg border border-ink/10 p-5 mt-4">
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Generalni komentar (za cijeli dan)
              </label>
              <p className="text-[11px] text-ink/40 mb-2">
                Zajednički komentar za sve posjete danas. Svaki novi red postaje posebna tačka u izvještaju.
              </p>
              <textarea
                rows={4}
                value={dailyNote}
                onChange={(e) => updateDailyNote(e.target.value)}
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
          </>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3">
          <button
            onClick={handleDailyReport}
            disabled={busyReport}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-accent text-white py-2.5 text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            <FileText size={16} /> Dnevni izvještaj
          </button>
          <button
            onClick={handleWeeklyReport}
            disabled={busyReport}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-accent2 text-white py-2.5 text-sm font-medium hover:bg-accent2/90 disabled:opacity-50"
          >
            <Sheet size={16} /> Sedmični izvještaj (Excel)
          </button>
        </div>
      </div>
    </div>
  )
}
