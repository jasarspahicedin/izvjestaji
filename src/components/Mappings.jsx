import { useState } from 'react'

function MappingRow({ keyName, data, onDelete, onEdit }) {
  const display = [
    data.mjesto,
    data.posjecena_ustanova,
    data.odjel_u_ustanovi,
    data.komentar,
  ].filter(Boolean).join(', ')
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 border p-2 rounded-md">
      <div className="flex-1">
        <div className="font-mono text-sm">{keyName}</div>
        <div className="text-[13px] text-ink/60">{display}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onEdit(keyName)} className="text-sm px-2 py-1 rounded-md border">Uredi</button>
        <button
          onClick={() => onDelete(keyName)}
          className="text-sm text-red-600 px-2 py-1 rounded-md border border-red-100"
        >
          Obriši
        </button>
      </div>
    </div>
  )
}

export default function Mappings({ doctorMappings, setDoctorMappings, apotekaMappings, setApotekaMappings, onDone }) {
  const [docName, setDocName] = useState('')
  const [docMjesto, setDocMjesto] = useState('')
  const [docUstanova, setDocUstanova] = useState('')
  const [docOdjel, setDocOdjel] = useState('')
  const [docKomentar, setDocKomentar] = useState('')
  const [editing, setEditing] = useState(null)

  const [apoName, setApoName] = useState('')
  const [apoMjesto, setApoMjesto] = useState('')
  const [apoKomentar, setApoKomentar] = useState('')
  const [apoEditing, setApoEditing] = useState(null)

  function doctorValues() {
    return {
      mjesto: docMjesto.trim(),
      posjecena_ustanova: docUstanova.trim(),
      odjel_u_ustanovi: docOdjel.trim(),
      komentar: docKomentar.trim(),
    }
  }

  function apotekaValues() {
    return {
      mjesto: apoMjesto.trim(),
      posjecena_ustanova: '',
      odjel_u_ustanovi: '',
      komentar: apoKomentar.trim(),
    }
  }

  function clearDoctorForm() {
    setDocName('')
    setDocMjesto('')
    setDocUstanova('')
    setDocOdjel('')
    setDocKomentar('')
  }

  function clearApotekaForm() {
    setApoName('')
    setApoMjesto('')
    setApoKomentar('')
  }

  function addDoctor() {
    if (!docName.trim()) return
    const next = { ...doctorMappings, [docName.trim()]: doctorValues() }
    setDoctorMappings(next)
    clearDoctorForm()
  }

  function editDoctor(name) {
    const v = doctorMappings[name]
    if (!v) return
    setEditing(name)
    setDocName(name)
    setDocMjesto(v.mjesto || '')
    setDocUstanova(v.posjecena_ustanova || '')
    setDocOdjel(v.odjel_u_ustanovi || '')
    setDocKomentar(v.komentar || '')
  }

  function saveEditDoctor() {
    if (!editing) return
    if (!docName.trim()) return
    const next = { ...doctorMappings, [docName.trim()]: doctorValues() }
    // If name changed, remove old key
    if (editing !== docName.trim()) {
      delete next[editing]
    }
    setDoctorMappings(next)
    setEditing(null)
    clearDoctorForm()
  }

  function deleteDoctor(name) {
    const next = { ...doctorMappings }
    delete next[name]
    setDoctorMappings(next)
  }

  function addApoteka() {
    if (!apoName.trim()) return
    if (apoEditing) {
      saveEditApoteka(apoEditing)
      setApoEditing(null)
      return
    }
    const next = { ...apotekaMappings, [apoName.trim()]: apotekaValues() }
    setApotekaMappings(next)
    clearApotekaForm()
  }

  function editApoteka(name) {
    const v = apotekaMappings[name]
    if (!v) return
    setApoEditing(name)
    setApoName(name)
    setApoMjesto(v.mjesto || '')
    setApoKomentar(v.komentar || '')
  }

  function saveEditApoteka(oldName) {
    if (!apoName.trim()) return
    const next = { ...apotekaMappings, [apoName.trim()]: apotekaValues() }
    if (oldName && oldName !== apoName.trim()) delete next[oldName]
    setApotekaMappings(next)
    clearApotekaForm()
    setApoEditing(null)
  }

  function deleteApoteka(name) {
    const next = { ...apotekaMappings }
    delete next[name]
    setApotekaMappings(next)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-sm text-ink/70">Povezivanja</h2>
        <div className="flex gap-2">
          <button onClick={onDone} className="text-sm px-3 py-1 rounded-md border">Nazad</button>
        </div>
      </div>

      <section className="bg-white rounded-lg border p-4 mb-4">
        <h3 className="font-mono text-xs text-ink/60 mb-2">Doktori → Podaci za posjetu</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <input placeholder="Doktor (npr. dr. X)" value={docName} onChange={(e) => setDocName(e.target.value)} className="px-3 py-2 border rounded-md" />
          <input placeholder="Mjesto" value={docMjesto} onChange={(e) => setDocMjesto(e.target.value)} className="px-3 py-2 border rounded-md" />
          <input placeholder="Posjećena ustanova" value={docUstanova} onChange={(e) => setDocUstanova(e.target.value)} className="px-3 py-2 border rounded-md" />
          <input placeholder="Odjel" value={docOdjel} onChange={(e) => setDocOdjel(e.target.value)} className="px-3 py-2 border rounded-md" />
          <textarea placeholder="Komentar za ustanovu ili apoteku" value={docKomentar} onChange={(e) => setDocKomentar(e.target.value)} className="px-3 py-2 border rounded-md" />
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={saveEditDoctor} className="px-3 py-2 bg-accent text-white rounded-md">Spasi</button>
              <button onClick={() => { setEditing(null); clearDoctorForm() }} className="px-3 py-2 border rounded-md">Otkaži</button>
            </>
          ) : (
            <button onClick={addDoctor} className="px-3 py-2 bg-accent text-white rounded-md">Dodaj</button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {Object.keys(doctorMappings || {}).length === 0 && <div className="text-sm text-ink/40">Nema definisanih doktora.</div>}
          {Object.entries(doctorMappings || {}).map(([k, v]) => (
            <MappingRow key={k} keyName={k} data={v} onDelete={deleteDoctor} onEdit={editDoctor} />
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg border p-4">
        <h3 className="font-mono text-xs text-ink/60 mb-2">Apoteke → Podaci za posjetu</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <input placeholder="Apoteka (npr. apote x)" value={apoName} onChange={(e) => setApoName(e.target.value)} className="px-3 py-2 border rounded-md" />
          <input placeholder="Mjesto" value={apoMjesto} onChange={(e) => setApoMjesto(e.target.value)} className="px-3 py-2 border rounded-md" />
          <textarea placeholder="Komentar za ustanovu ili apoteku" value={apoKomentar} onChange={(e) => setApoKomentar(e.target.value)} className="px-3 py-2 border rounded-md" />
        </div>
        <div className="flex gap-2 mb-4">
          {apoEditing ? (
            <>
              <button onClick={() => saveEditApoteka(apoEditing)} className="px-3 py-2 bg-accent text-white rounded-md">Sačuvaj</button>
              <button onClick={() => { setApoEditing(null); clearApotekaForm() }} className="px-3 py-2 border rounded-md">Otkaži</button>
            </>
          ) : (
            <button onClick={addApoteka} className="px-3 py-2 bg-accent text-white rounded-md">Dodaj</button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {Object.keys(apotekaMappings || {}).length === 0 && <div className="text-sm text-ink/40">Nema definisanih apoteka.</div>}
          {Object.entries(apotekaMappings || {}).map(([k, v]) => (
            <MappingRow key={k} keyName={k} data={v} onDelete={deleteApoteka} onEdit={editApoteka} />
          ))}
        </div>
      </section>
    </div>
  )
}
