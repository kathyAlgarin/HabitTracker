import { useState } from 'react'
import { buildMonthCells, formatDate, monthTitle, parseIso, todayIso } from '../utils/dates'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function HabitCalendar({ habit, completedDates, loading, loadFailed, busyDate, onToggleDay }) {
  const today = todayIso()
  const current = parseIso(today)
  // App usa key={habit.id}, así que al cambiar de hábito se vuelve al mes actual.
  const [view, setView] = useState({ year: current.year, month: current.month })

  // Se puede navegar entre el mes de inicio y el mes actual (en cualquier orden,
  // porque la fecha de inicio puede estar en el futuro).
  const start = parseIso(habit.startDate)
  const startIndex = start.year * 12 + start.month
  const currentIndex = current.year * 12 + current.month
  const viewIndex = view.year * 12 + view.month
  const canGoBack = viewIndex > Math.min(startIndex, currentIndex)
  const canGoForward = viewIndex < Math.max(startIndex, currentIndex)
  const notStartedYet = habit.startDate > today

  function move(delta) {
    const index = viewIndex + delta
    setView({ year: Math.floor(index / 12), month: index % 12 })
  }

  const cells = buildMonthCells(view.year, view.month)
  const monthCount = cells.filter((iso) => iso && completedDates.has(iso)).length

  return (
    <section className="card calendar">
      <header className="calendar-header">
        <button type="button" className="btn small" onClick={() => move(-1)} disabled={!canGoBack} aria-label="Mes anterior">
          ‹
        </button>
        <h3>{monthTitle(view.year, view.month)}</h3>
        <button type="button" className="btn small" onClick={() => move(1)} disabled={!canGoForward} aria-label="Mes siguiente">
          ›
        </button>
      </header>

      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <span key={d} className="weekday">
            {d}
          </span>
        ))}

        {cells.map((iso, i) => {
          if (!iso) return <span key={`empty-${i}`} />

          const done = completedDates.has(iso)
          const outOfRange = iso < habit.startDate || iso > today
          const classes = ['day', done && 'done', iso === today && 'today', outOfRange && 'out'].filter(Boolean).join(' ')
          const title = outOfRange
            ? iso > today
              ? 'Este día todavía no llega'
              : 'Antes de la fecha de inicio'
            : `${formatDate(iso)} — ${done ? 'cumplido (clic para desmarcar)' : 'clic para marcar'}`

          return (
            <button
              key={iso}
              type="button"
              className={classes}
              title={title}
              disabled={outOfRange || loading || loadFailed || busyDate !== null}
              onClick={() => onToggleDay(iso, done)}
            >
              {parseIso(iso).day}
            </button>
          )
        })}
      </div>

      <p className="muted small calendar-footer">
        {loading
          ? 'Cargando días…'
          : loadFailed
            ? 'No se pudieron cargar los días cumplidos. Recarga la página para intentarlo de nuevo.'
            : notStartedYet
              ? `Este hábito empieza el ${formatDate(habit.startDate)}. Podrás marcar días desde esa fecha.`
              : `${monthCount} ${monthCount === 1 ? 'día cumplido' : 'días cumplidos'} este mes`}
      </p>
    </section>
  )
}
