// Sva polja su opciona (nijedno nije mandatory) - u skladu sa zahtjevom
// da unos ustanove ne zahtijeva da se popuni apoteka i obrnuto.
//
// "Stručni saradnik" NIJE ovdje - uzima se iz imena/prezimena naloga (auth profil).
// "Generalni komentar" NIJE ovdje - to je jedan zajednički komentar za cijeli dan,
// vidi src/App.jsx (dailyNote state) i tabelu daily_notes.

export const TEXT_FIELDS = [
  { key: 'doktor_u_ustanovi', label: 'Doktor u ustanovi', autocomplete: true },
  { key: 'posjecena_apoteka', label: 'Posjećena apoteka', autocomplete: true },
  { key: 'mjesto', label: 'Mjesto', autocomplete: true },
  { key: 'posjecena_ustanova', label: 'Posjećena ustanova', autocomplete: true },
  { key: 'odjel_u_ustanovi', label: 'Odjel u ustanovi', autocomplete: true },
]

export const TEXTAREA_FIELDS = [
  { key: 'komentar', label: 'Komentar za ustanovu ili apoteku' },
  { key: 'ostavljeni_promo_artikli', label: 'Ostavljeni promo artikli' },
]

export const ALL_FIELDS = [...TEXT_FIELDS, ...TEXTAREA_FIELDS]

export function emptyVisit() {
  const v = {}
  for (const f of ALL_FIELDS) v[f.key] = ''
  return v
}
