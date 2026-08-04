import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (error) throw error
        setInfo('Nalog kreiran. Provjeri email za potvrdu (ako je potvrda uključena u Supabase podešavanjima).')
      }
    } catch (err) {
      setError(err.message || 'Greška prilikom prijave.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg border border-ink/10 shadow-sm p-6">
        <h1 className="font-mono text-sm uppercase tracking-wide text-accent mb-1">
          Terenski izvještaji
        </h1>
        <p className="text-ink/60 text-sm mb-6">
          {mode === 'signin' ? 'Prijavi se na svoj nalog' : 'Kreiraj novi nalog'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Ime i prezime
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="npr. Mirela Jašarspahić"
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
              <p className="text-[11px] text-ink/40 mt-1">
                Ovo ime se koristi kao "Stručni saradnik" u izvještajima.
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
              Lozinka
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-accent">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent text-white py-2 text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? 'Molim sačekaj…' : mode === 'signin' ? 'Prijavi se' : 'Registruj se'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setInfo('')
          }}
          className="w-full text-center text-xs text-ink/60 mt-4 hover:text-accent"
        >
          {mode === 'signin' ? 'Nemaš nalog? Registruj se' : 'Već imaš nalog? Prijavi se'}
        </button>
      </div>
    </div>
  )
}
