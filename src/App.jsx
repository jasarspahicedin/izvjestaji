import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import AutocompleteInput from './components/AutocompleteInput'
import Mappings from './components/Mappings'
import { TEXT_FIELDS, TEXTAREA_FIELDS, emptyVisit } from './lib/fields'
import { todayYMD, formatDisplay, getWeekDates, parseYMD, toYMD } from './lib/dateUtils'
import { generateDailyReport, generateWeeklyReport } from './lib/reportGenerator'
import { guessKanton } from './lib/kantoni'
import { ChevronLeft, ChevronRight, Plus, Trash2, FileText, Sheet, Loader2, Pencil } from 'lucide-react'
import VoiceTextarea from './components/VoiceTextarea'

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
  const [showMappings, setShowMappings] = useState(false)
  const [doctorMappings, setDoctorMappings] = useState(() => {
    try {
      const cloud = session?.user?.user_metadata?.mappings?.doctorMappings
      if (cloud) return cloud
      return JSON.parse(localStorage.getItem('doctorMappings') || '{}')
    } catch (e) {
      return {}
    }
  })
  const [apotekaMappings, setApotekaMappings] = useState(() => {
    try {
      const cloud = session?.user?.user_metadata?.mappings?.apotekaMappings
      if (cloud) return cloud
      return JSON.parse(localStorage.getItem('apotekaMappings') || '{}')
    } catch (e) {
      return {}
    }
  })
  const [dailyNote, setDailyNote] = useState('')
  const [reportStartDate, setReportStartDate] = useState(() => getWeekDates(todayYMD())[0])
  const [reportEndDate, setReportEndDate] = useState(() => getWeekDates(todayYMD())[6])
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

  // Persist mappings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('doctorMappings', JSON.stringify(doctorMappings || {}))
    } catch (e) {}
  }, [doctorMappings])
  useEffect(() => {
    try {
      localStorage.setItem('apotekaMappings', JSON.stringify(apotekaMappings || {}))
    } catch (e) {}
  }, [apotekaMappings])

  async function saveMappingsToCloud() {
    try {
      const payload = { mappings: { doctorMappings: doctorMappings || {}, apotekaMappings: apotekaMappings || {} } }
      const { error } = await supabase.auth.updateUser({ data: payload })
      if (error) throw error
      alert('Mappings saved to cloud (user metadata).')
    } catch (e) {
      console.error(e)
      alert('Greška pri čuvanju u oblaku. Pogledajte konzolu.')
    }
  }

  async function loadMappingsFromCloud() {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      const cloud = data?.user?.user_metadata?.mappings || {}
      setDoctorMappings(cloud.doctorMappings || {})
      setApotekaMappings(cloud.apotekaMappings || {})
      alert('Mappings učitani iz oblaka.')
    } catch (e) {
      console.error(e)
      alert('Greška pri učitavanju iz oblaka. Pogledajte konzolu.')
    }
  }

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

  // Auto-fill when doctor or apoteka entered
  useEffect(() => {
    if (!current) return
    const docVal = (current.doktor_u_ustanovi || '').trim()
    if (docVal && doctorMappings[docVal]) {
      const map = doctorMappings[docVal]
      if (map.mjesto && map.mjesto !== current.mjesto) updateField('mjesto', map.mjesto)
      if (map.posjecena_ustanova && map.posjecena_ustanova !== current.posjecena_ustanova) updateField('posjecena_ustanova', map.posjecena_ustanova)
      if (map.odjel_u_ustanovi && map.odjel_u_ustanovi !== current.odjel_u_ustanovi) updateField('odjel_u_ustanovi', map.odjel_u_ustanovi)
    }
    const apoVal = (current.posjecena_apoteka || '').trim()
    if (apoVal && apotekaMappings[apoVal]) {
      const map = apotekaMappings[apoVal]
      if (map.mjesto && map.mjesto !== current.mjesto) updateField('mjesto', map.mjesto)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.doktor_u_ustanovi, current?.posjecena_apoteka])

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

  function getDatesInRange(startYmd, endYmd) {
    if (!startYmd || !endYmd) return []
    const start = parseYMD(startYmd)
    const end = parseYMD(endYmd)
    if (end < start) return []

    const dates = []
    const cursor = new Date(start)
    while (cursor <= end) {
      dates.push(toYMD(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return dates
  }

  async function handleWeeklyReport() {
    setBusyReport(true)
    try {
      const rangeDates = getDatesInRange(reportStartDate, reportEndDate)
      if (rangeDates.length === 0) {
        alert('Odaberite važeći raspon datuma.')
        return
      }

      const groups = []
      for (const d of rangeDates) {
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
        alert('Nema unesenih posjeta u odabranom rasponu datuma.')
        return
      }
      const label = `${formatDisplay(reportStartDate)} - ${formatDisplay(reportEndDate)}`
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
            <button onClick={() => setShowMappings((s) => !s)} className="text-sm text-ink/40 hover:text-ink">Povezivanja</button>
            <button onClick={saveMappingsToCloud} className="text-sm text-ink/40 hover:text-ink">Sačuvaj u oblak</button>
            <button onClick={loadMappingsFromCloud} className="text-sm text-ink/40 hover:text-ink">Učitaj iz oblaka</button>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-ink/40 hover:text-ink">
              Odjava
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {showMappings ? (
          <Mappings
            doctorMappings={doctorMappings}
            setDoctorMappings={setDoctorMappings}
            apotekaMappings={apotekaMappings}
            setApotekaMappings={setApotekaMappings}
            onDone={() => setShowMappings(false)}
          />
        ) : (
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
                      <VoiceTextarea
                        label={f.label}
                        value={current[f.key] || ''}
                        onChange={(val) => updateField(f.key, val)}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generalni komentar - JEDAN, za citav dan, ne po posjeti */}
            <div className="bg-white rounded-lg border border-ink/10 p-5 mt-4">
              <VoiceTextarea
                label="Generalni komentar (za cijeli dan)"
                description="Zajednički komentar za sve posjete danas. Svaki novi red postaje posebna tačka u izvještaju."
                value={dailyNote}
                onChange={updateDailyNote}
                rows={4}
              />
            </div>
          </>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-end gap-2 mb-3">
            <label className="text-xs text-ink/60">
              <span className="block mb-1">Od</span>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="rounded-md border border-ink/15 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-ink/60">
              <span className="block mb-1">Do</span>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="rounded-md border border-ink/15 px-2 py-1.5 text-sm"
              />
            </label>
            <span className="text-[11px] text-ink/40">Nema brisanja — exportuje se samo odabrani period.</span>
          </div>
          <div className="flex gap-3">
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
              <Sheet size={16} /> Izvještaj za raspon (Excel)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
