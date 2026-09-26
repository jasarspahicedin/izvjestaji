import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { formatDisplay } from './dateUtils'
import { guessKanton } from './kantoni'

const INK = '1E2A38'
const ACCENT = '2F6F62'

/**
 * Gradi jednu liniju teksta za posjetu, u stilu:
 * "Ustanova, odjel doktor (ostavljeni uzorci, promo artikli) — komentar"
 * Prazna polja se jednostavno preskaču.
 */
export function visitLineText(v) {
  // Prefer doctor's first name if present, then other data (ustanova/apoteka, odjel)
  function extractFirstName(name) {
    if (!name) return ''
    const cleaned = name.replace(/\bdr\.?\b/i, '').trim()
    const parts = cleaned.split(/\s+/).filter(Boolean)
    return parts[0] || cleaned
  }

  const docFirst = extractFirstName(v.doktor_u_ustanovi)
  const place = v.posjecena_ustanova || v.posjecena_apoteka || ''
  const odjel = v.odjel_u_ustanovi || ''

  let line = docFirst || place
  const extras = [place, odjel].filter((x) => x && x !== docFirst)
  if (extras.length) line += docFirst ? `, ${extras.join(', ')}` : ` ${extras.join(', ')}`

  const left = [v.ostavljeni_promo_artikli].filter(Boolean).join(', ')
  if (left) line += ` (${left})`

  if (v.komentar && v.komentar.trim()) line += ` — ${v.komentar.trim()}`

  if (!line && v.mjesto) line = v.mjesto
  if (!line) line = '(bez unesenih detalja)'

  return line
}

function headerParagraphs({ dateLabel, fullName, mjesto }) {
  const lines = [`Dan: ${dateLabel}`, `Stručni saradnik: ${fullName || '—'}`]
  if (mjesto) lines.push(`Mjesto: ${mjesto}`)

  const paragraphs = lines.map(
    (text) =>
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text, bold: true, size: 22, color: INK })],
      })
  )
  paragraphs.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT } },
      spacing: { after: 200 },
      children: [new TextRun({ text: '' })],
    })
  )
  return paragraphs
}

function visitListParagraphs(visits) {
  return visits.map(
    (v, i) =>
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, size: 20, color: ACCENT }),
          new TextRun({ text: visitLineText(v), size: 20, color: INK }),
        ],
      })
  )
}

function generalCommentParagraphs(text) {
  const clean = (text || '').trim()
  if (!clean) return []
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean)
  const paras = [
    new Paragraph({
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: 'Generalni komentar', bold: true, size: 22, color: ACCENT })],
    }),
  ]
  for (const line of lines) {
    const text = line.startsWith('-') ? line : `- ${line}`
    paras.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text, size: 20, color: INK })],
      })
    )
  }
  return paras
}

function uniqueMjesto(visits) {
  const set = new Set(visits.map((v) => v.mjesto).filter(Boolean))
  return [...set].join(', ')
}

export async function createDailyReportFile(dateYMD, visits, fullName, generalniKomentar) {
  const doc = new Document({
    sections: [
      {
        children: [
          ...headerParagraphs({
            dateLabel: formatDisplay(dateYMD),
            fullName,
            mjesto: uniqueMjesto(visits),
          }),
          ...visitListParagraphs(visits),
          ...generalCommentParagraphs(generalniKomentar),
        ],
      },
    ],
  })
  const blob = await Packer.toBlob(doc)
  const fileName = `dnevni-izvjestaj-${dateYMD}.docx`
  return new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

export async function generateDailyReport(dateYMD, visits, fullName, generalniKomentar) {
  const file = await createDailyReportFile(dateYMD, visits, fullName, generalniKomentar)
  saveAs(file, file.name)
}

// Sedmicni izvjestaj je Excel tabela (jedan red po posjeti), po uzoru na postojeci
// radni format: DATUM, GRAD, KANTON/REGIJA, USTANOVA, ODJEL, APOTEKA, DOKTOR/FARMACEUT,
// OSTAVLJENI UZORCI, PROMO ARTIKLI, KOMENTAR. Kanton/regija se automatski prepoznaje iz Grada.
export async function generateWeeklyReport(weekLabel, fullName, dayGroups) {
  // dayGroups: [{ date: 'YYYY-MM-DD', visits: [...], generalniKomentar: '...' }, ...]
  const rows = []
  for (const day of dayGroups) {
    for (const v of day.visits) {
      rows.push({
        DATUM: formatDisplay(day.date),
        GRAD: v.mjesto || '',
        'KANTON/REGIJA': v.mjesto ? guessKanton(v.mjesto) || '' : '',
        'POSJEĆENA USTANOVA': v.posjecena_ustanova || '',
        ODJEL: v.odjel_u_ustanovi || '',
        'POSJEĆENA APOTEKA': v.posjecena_apoteka || '',
        'DOKTOR/FARMACEUT': (function getFirst(name) { if (!name) return ''; const cleaned = name.replace(/\bdr\.?\b/i, '').trim(); return cleaned.split(/\s+/)[0] || cleaned })(v.doktor_u_ustanovi) || '',
        'OSTAVLJENI UZORCI': 'Da',
        'PROMO ARTIKLI': v.ostavljeni_promo_artikli || '',
        KOMENTAR: v.komentar || '',
      })
    }
  }

  const visitSheet = XLSX.utils.json_to_sheet(rows)
  visitSheet['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 16 },
    { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 26 }, { wch: 30 },
  ]

  const noteRows = dayGroups
    .filter((d) => d.generalniKomentar && d.generalniKomentar.trim())
    .map((d) => ({ DATUM: formatDisplay(d.date), 'GENERALNI KOMENTAR': d.generalniKomentar.trim() }))
  const noteSheet = XLSX.utils.json_to_sheet(
    noteRows.length ? noteRows : [{ DATUM: '', 'GENERALNI KOMENTAR': '' }]
  )
  noteSheet['!cols'] = [{ wch: 12 }, { wch: 80 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, visitSheet, 'Posjete')
  XLSX.utils.book_append_sheet(wb, noteSheet, 'Generalni komentar')

  const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
  saveAs(blob, `sedmicni-izvjestaj-${dayGroups[0]?.date || 'nedelja'}.xlsx`)
}
