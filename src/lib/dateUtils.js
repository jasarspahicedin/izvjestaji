export function todayYMD() {
  return toYMD(new Date())
}

export function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseYMD(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDisplay(ymd) {
  const [y, m, d] = ymd.split('-')
  return `${d}.${m}.${y}.`
}

// Ponedjeljak (start radne sedmice) za dati datum
export function getMonday(ymd) {
  const date = parseYMD(ymd)
  const day = date.getDay() // 0 = nedjelja
  const diff = (day + 6) % 7 // koliko dana od ponedjeljka
  date.setDate(date.getDate() - diff)
  return date
}

export function getWeekDates(ymd) {
  const monday = getMonday(ymd)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(toYMD(d))
  }
  return days
}
