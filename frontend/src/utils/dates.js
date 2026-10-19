// Las fechas viajan como texto "yyyy-mm-dd". Se trabaja siempre con la fecha local
// (no se usa toISOString porque convierte a UTC y puede cambiar el día).

const pad = (n) => String(n).padStart(2, '0')

export function toIsoDate(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export function todayIso() {
  const now = new Date()
  return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate())
}

export function parseIso(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month: month - 1, day }
}

export function formatDate(iso) {
  const { year, month, day } = parseIso(iso)
  return new Date(year, month, day).toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function monthTitle(year, month) {
  const text = new Date(year, month, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Celdas de un mes con la semana empezando en lunes. Las celdas vacías son null.
export function buildMonthCells(year, month) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = Array(firstWeekday).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toIsoDate(year, month, day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
