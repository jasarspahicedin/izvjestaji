// Automatsko prepoznavanje kantona (FBiH) / entiteta (RS) / distrikta (BD)
// na osnovu unesenog Mjesta. Radi po opštinama/gradovima BiH.
//
// Ovo je pomoćna, "best effort" logika - lista nije 100% kompletna za svako
// selo, ali pokriva sve opštine i najčešće nazive/varijante. Ako mjesto nije
// prepoznato, vraća null i korisnik može ručno dodati novi alias ovdje.

function normalize(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // skini dijakritike (č,ć,š,ž,đ -> c,c,s,z,d)
    .replace(/[.\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// key: normalizovan naziv opstine/grada, value: kod koji se prikazuje u izvjestaju
const RAW_MAP = {
  // ===== Kanton Sarajevo (KS) =====
  sarajevo: 'KS', 'kanton sarajevo': 'KS', 'centar sarajevo': 'KS', centar: 'KS',
  'novo sarajevo': 'KS', 'novi grad sarajevo': 'KS', 'novi grad': 'KS',
  'stari grad sarajevo': 'KS', 'stari grad': 'KS', ilidza: 'KS', vogosca: 'KS',
  hadzici: 'KS', ilijas: 'KS', 'trnovo fbih': 'KS',

  // ===== Unsko-sanski kanton (USK) =====
  bihac: 'USK', cazin: 'USK', buzim: 'USK', 'velika kladusa': 'USK',
  'sanski most': 'USK', kljuc: 'USK', 'bosanska krupa': 'USK', krupa: 'USK',
  'bosanski petrovac': 'USK', 'bos petrovac': 'USK',

  // ===== Posavski kanton (PK) =====
  orasje: 'PK', odzak: 'PK', 'domaljevac samac': 'PK', domaljevac: 'PK',

  // ===== Tuzlanski kanton (TK) =====
  tuzla: 'TK', zivinice: 'TK', gracanica: 'TK', gradacac: 'TK', lukavac: 'TK',
  srebrenik: 'TK', kalesija: 'TK', banovici: 'TK', celic: 'TK', sapna: 'TK',
  teocak: 'TK', 'doboj istok': 'TK', kladanj: 'TK',

  // ===== Zenicko-dobojski kanton (ZDK) =====
  zenica: 'ZDK', kakanj: 'ZDK', visoko: 'ZDK', vares: 'ZDK', breza: 'ZDK',
  zavidovici: 'ZDK', zepce: 'ZDK', maglaj: 'ZDK', tesanj: 'ZDK',
  'doboj jug': 'ZDK', usora: 'ZDK', olovo: 'ZDK',

  // ===== Bosansko-podrinjski kanton (BPK - Goražde) =====
  gorazde: 'BPK', 'pale praca': 'BPK', 'pale-praca': 'BPK', 'foca fbih': 'BPK',
  ustikolina: 'BPK',

  // ===== Srednjobosanski kanton (SBK) =====
  travnik: 'SBK', 'novi travnik': 'SBK', 'n travnik': 'SBK', bugojno: 'SBK',
  'gornji vakuf': 'SBK', 'gornji vakuf uskoplje': 'SBK', 'g vakuf': 'SBK',
  uskoplje: 'SBK', 'donji vakuf': 'SBK', jajce: 'SBK', vitez: 'SBK',
  busovaca: 'SBK', kiseljak: 'SBK', kresevo: 'SBK', fojnica: 'SBK',
  dobretici: 'SBK',

  // ===== Hercegovacko-neretvanski kanton (HNK) =====
  mostar: 'HNK', konjic: 'HNK', jablanica: 'HNK', 'prozor rama': 'HNK',
  prozor: 'HNK', capljina: 'HNK', citluk: 'HNK', neum: 'HNK', stolac: 'HNK',
  ravno: 'HNK',

  // ===== Zapadnohercegovacki kanton (ZHK) =====
  'siroki brijeg': 'ZHK', ljubuski: 'ZHK', grude: 'ZHK', posusje: 'ZHK',

  // ===== Kanton 10 / Hercegbosanski kanton (K10) =====
  livno: 'K10', tomislavgrad: 'K10', kupres: 'K10', 'bosansko grahovo': 'K10',
  grahovo: 'K10', drvar: 'K10', glamoc: 'K10',

  // ===== Brcko distrikt (BD) =====
  brcko: 'BD',

  // ===== Republika Srpska (RS) =====
  'banja luka': 'RS', bijeljina: 'RS', prijedor: 'RS', doboj: 'RS',
  trebinje: 'RS', zvornik: 'RS', gradiska: 'RS', laktasi: 'RS',
  derventa: 'RS', 'foca rs': 'RS', srbinje: 'RS', foca: 'RS',
  visegrad: 'RS', rogatica: 'RS', 'samac rs': 'RS', samac: 'RS',
  modrica: 'RS', prnjavor: 'RS', celinac: 'RS', 'kotor varos': 'RS',
  'kozarska dubica': 'RS', 'novi grad rs': 'RS', 'bosanski novi': 'RS',
  srbac: 'RS', teslic: 'RS', ugljevik: 'RS', lopare: 'RS', pale: 'RS',
  sokolac: 'RS', 'istocno sarajevo': 'RS', 'istocno novo sarajevo': 'RS',
  'istocna ilidza': 'RS', 'istocni stari grad': 'RS', 'trnovo rs': 'RS',
  lukavica: 'RS', 'han pijesak': 'RS', kalinovik: 'RS', nevesinje: 'RS',
  gacko: 'RS', bileca: 'RS', berkovici: 'RS', ljubinje: 'RS',
  knezevo: 'RS', 'mrkonjic grad': 'RS', sipovo: 'RS', ribnik: 'RS',
  petrovo: 'RS', vukosavlje: 'RS', milici: 'RS', vlasenica: 'RS',
  bratunac: 'RS', srebrenica: 'RS', osmaci: 'RS', brod: 'RS',
  pelagicevo: 'RS', 'donji zabar': 'RS', cajnice: 'RS', rudo: 'RS',
  'novo gorazde': 'RS', 'istocni mostar': 'RS',
}

export function guessKanton(mjesto) {
  const n = normalize(mjesto)
  if (!n) return ''
  if (RAW_MAP[n]) return RAW_MAP[n]

  // fallback: probaj pronaci poznato mjesto kao dio unesenog teksta
  // (npr. "Sarajevo - Novo Sarajevo" ili "Lukavica kod Sarajeva")
  for (const key of Object.keys(RAW_MAP)) {
    if (n.includes(key)) return RAW_MAP[key]
  }
  return ''
}
