import { formatDate, todayIso } from '../utils/dates'

export default function HabitCard({ habit, selected, busy, onSelect, onToggleToday, onEdit, onDelete }) {
  return (
    <li className={`card habit-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="habit-card-main" onClick={onSelect}>
        <strong>{habit.name}</strong>
        {habit.description && <span className="muted">{habit.description}</span>}
        <span className="muted small">
          {habit.startDate > todayIso() ? 'Empieza el' : 'Desde el'} {formatDate(habit.startDate)}
        </span>
      </button>

      <div className="stats">
        <span>
          {habit.totalCompleted} {habit.totalCompleted === 1 ? 'día cumplido' : 'días cumplidos'}
        </span>
        <span>Racha: {habit.currentStreak}</span>
      </div>

      <div className="card-actions">
        <button
          type="button"
          className={`btn small ${habit.completedToday ? 'done' : 'primary'}`}
          onClick={onToggleToday}
          disabled={busy}
        >
          {habit.completedToday ? 'Hecho hoy' : 'Marcar hoy'}
        </button>
        <button type="button" className="btn small" onClick={onEdit} disabled={busy}>
          Editar
        </button>
        <button type="button" className="btn small danger" onClick={onDelete} disabled={busy}>
          Eliminar
        </button>
      </div>
    </li>
  )
}
