// Best-effort prepoznavanje kantona (FBiH) / entiteta na osnovu unesenog grada/mjesta.
// Nije 100% pouzdano za sva mjesta u BiH (neka su granicna ili imaju isto ime u
// vise opstina), ali pokriva najcesce gradove. Ako sistem ne prepozna mjesto,
// kolona ostaje prazna i moze se rucno popuniti u exportovanom fajlu.

function normalize(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/đ/g, 'dj')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// VAZNO: redoslijed je bitan - specificniji (duzi) nazivi moraju biti PRIJE
// generickih (npr. "istocno sarajevo" prije "sarajevo"), zato se na kraju
// sortira po duzini opadajuce, ali eksplicitan raspored ovdje takodjer pomaze citljivosti.
const ENTRIES = [
  // Republika Srpska - Istocno Sarajevo podrucje i ostali gradovi RS
  { match: 'istocno sarajevo', code: 'RS', label: 'Republika Srpska' },
  { match: 'istocna ilidza', code: 'RS', label: 'Republika Srpska' },
  { match: 'istocni stari grad', code: 'RS', label: 'Republika Srpska' },
  { match: 'istocno novo sarajevo', code: 'RS', label: 'Republika Srpska' },
  { match: 'lukavica', code: 'RS', label: 'Republika Srpska' },
  { match: 'pale', code: 'RS', label: 'Republika Srpska' },
  { match: 'sokolac', code: 'RS', label: 'Republika Srpska' },
  { match: 'banja luka', code: 'RS', label: 'Republika Srpska' },
  { match: 'bijeljina', code: 'RS', label: 'Republika Srpska' },
  { match: 'doboj', code: 'RS', label: 'Republika Srpska' },
  { match: 'prijedor', code: 'RS', label: 'Republika Srpska' },
  { match: 'trebinje', code: 'RS', label: 'Republika Srpska' },
  { match: 'zvornik', code: 'RS', label: 'Republika Srpska' },
  { match: 'gradiska', code: 'RS', label: 'Republika Srpska' },
  { match: 'laktasi', code: 'RS', label: 'Republika Srpska' },
  { match: 'modrica', code: 'RS', label: 'Republika Srpska' },
  { match: 'derventa', code: 'RS', label: 'Republika Srpska' },
  { match: 'visegrad', code: 'RS', label: 'Republika Srpska' },
  { match: 'rogatica', code: 'RS', label: 'Republika Srpska' },
  { match: 'srbac', code: 'RS', label: 'Republika Srpska' },
  { match: 'celinac', code: 'RS', label: 'Republika Srpska' },
  { match: 'kotor varos', code: 'RS', label: 'Republika Srpska' },
  { match: 'srebrenica', code: 'RS', label: 'Republika Srpska' },
  { match: 'bratunac', code: 'RS', label: 'Republika Srpska' },
  { match: 'foca', code: 'RS', label: 'Republika Srpska' },
  { match: 'novi grad sarajevo', code: 'KS', label: 'Kanton Sarajevo' },

  // Brcko distrikt
  { match: 'brcko', code: 'BD', label: 'Brčko distrikt' },

  // Kanton Sarajevo
  { match: 'sarajevo', code: 'KS', label: 'Kanton Sarajevo' },
  { match: 'ilidza', code: 'KS', label: 'Kanton Sarajevo' },
  { match: 'vogosca', code: 'KS', label: 'Kanton Sarajevo' },
  { match: 'hadzici', code: 'KS', label: 'Kanton Sarajevo' },
  { match: 'ilijas', code: 'KS', label: 'Kanton Sarajevo' },
  { match: 'trnovo', code: 'KS', label: 'Kanton Sarajevo' },

  // Unsko-sanski kanton
  { match: 'bihac', code: 'USK', label: 'Unsko-sanski kanton' },
  { match: 'cazin', code: 'USK', label: 'Unsko-sanski kanton' },
  { match: 'bosanska krupa', code: 'USK', label: 'Unsko-sanski kanton' },
  { match: 'buzim', code: 'USK', label: 'Unsko-sanski kanton' },
  { match: 'kljuc', code: 'USK', label: 'Unsko-sanski kanton' },
  { match: 'sanski most', code: 'USK', label: 'Unsko-sanski kanton' },
  { match: 'velika kladusa', code: 'USK', label: 'Unsko-sanski kanton' },

  // Posavski kanton
  { match: 'orasje', code: 'PK', label: 'Posavski kanton' },
  { match: 'odzak', code: 'PK', label: 'Posavski kanton' },
  { match: 'domaljevac', code: 'PK', label: 'Posavski kanton' },

  // Tuzlanski kanton
  { match: 'tuzla', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'zivinice', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'gracanica', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'gradacac', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'lukavac', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'srebrenik', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'kalesija', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'banovici', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'celic', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'sapna', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'teocak', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'kladanj', code: 'TK', label: 'Tuzlanski kanton' },
  { match: 'doboj istok', code: 'TK', label: 'Tuzlanski kanton' },

  // Zenicko-dobojski kanton
  { match: 'zenica', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'kakanj', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'visoko', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'vares', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'breza', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'zavidovici', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'maglaj', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'doboj jug', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'tesanj', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'usora', code: 'ZDK', label: 'Zeničko-dobojski kanton' },
  { match: 'zepce', code: 'ZDK', label: 'Zeničko-dobojski kanton' },

  // Bosansko-podrinjski kanton
  { match: 'gorazde', code: 'BPK', label: 'Bosansko-podrinjski kanton' },
  { match: 'ustikolina', code: 'BPK', label: 'Bosansko-podrinjski kanton' },

  // Srednjobosanski kanton
  { match: 'travnik', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'novi travnik', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'n travnik', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'bugojno', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'vitez', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'busovaca', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'fojnica', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'kiseljak', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'kresevo', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'donji vakuf', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'gornji vakuf', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'g vakuf', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'uskoplje', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'jajce', code: 'SBK', label: 'Srednjobosanski kanton' },
  { match: 'dobretici', code: 'SBK', label: 'Srednjobosanski kanton' },

  // Hercegovacko-neretvanski kanton
  { match: 'mostar', code: 'HNK', label: 'Hercegovačko-neretvanski kanton' },
  { match: 'konjic', code: 'HNK', label: 'Hercegovačko-neretvanski kanton' },
  { match: 'jablanica', code: 'HNK', label: 'Hercegovačko-neretvanski kanton' },
  { match: 'prozor', code: 'HNK', label: 'Hercegovačko-neretvanski kanton' },
  { match: 'capljina', code: 'HNK', label: 'Hercegovačko-neretvanski kanton' },
  { match: 'citluk', code: 'HNK', label: 'Hercegovačko-neretvanski kanton' },
  { match: 'stolac', code: 'HNK', label: 'Hercegovačko-neretvanski kanton' },
  { match: 'neum', code: 'HNK', label: 'Hercegovačko-neretvanski kanton' },
  { match: 'ravno', code: 'HNK', label: 'Hercegovačko-neretvanski kanton' },

  // Zapadnohercegovacki kanton
  { match: 'ljubuski', code: 'ZHK', label: 'Zapadnohercegovački kanton' },
  { match: 'siroki brijeg', code: 'ZHK', label: 'Zapadnohercegovački kanton' },
  { match: 'grude', code: 'ZHK', label: 'Zapadnohercegovački kanton' },
  { match: 'posusje', code: 'ZHK', label: 'Zapadnohercegovački kanton' },

  // Kanton 10 (Hercegbosanski / Livanjski)
  { match: 'livno', code: 'K10', label: 'Kanton 10' },
  { match: 'tomislavgrad', code: 'K10', label: 'Kanton 10' },
  { match: 'bosansko grahovo', code: 'K10', label: 'Kanton 10' },
  { match: 'kupres', code: 'K10', label: 'Kanton 10' },
  { match: 'glamoc', code: 'K10', label: 'Kanton 10' },
]

const SORTED_ENTRIES = [...ENTRIES].sort((a, b) => b.match.length - a.match.length)

/**
 * Vraca { code, label } na osnovu naziva grada/mjesta.
 * Ako se ne prepozna, vraca { code: '', label: '' }.
 */
export function guessCanton(mjesto) {
  const norm = normalize(mjesto)
  if (!norm) return { code: '', label: '' }
  for (const entry of SORTED_ENTRIES) {
    if (norm.includes(entry.match)) return { code: entry.code, label: entry.label }
  }
  return { code: '', label: '' }
}
