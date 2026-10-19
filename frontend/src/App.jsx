import { useCallback, useEffect, useState } from 'react'
import { habitsApi } from './api/habitsApi'
import HabitForm from './components/HabitForm'
import HabitCard from './components/HabitCard'
import HabitCalendar from './components/HabitCalendar'
import { formatDate, todayIso } from './utils/dates'
import './App.css'

export default function App() {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)

  // Días cumplidos del hábito seleccionado. Se guarda a qué hábito pertenecen para no
  // mostrar los de otro mientras llegan los nuevos.
  const [completions, setCompletions] = useState({ habitId: null, dates: new Set(), failed: false })
  const [completionsVersion, setCompletionsVersion] = useState(0)

  // Hábito con una operación en curso (para deshabilitar sus botones y evitar dobles clics).
  const [busy, setBusy] = useState({ habitId: null, date: null })
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }

  const selectedHabit = habits.find((h) => h.id === selectedId) ?? null
  const editingHabit = habits.find((h) => h.id === editingId) ?? null
  const completionsReady = selectedId !== null && completions.habitId === selectedId
  const completedDates = completionsReady ? completions.dates : new Set()

  const showError = (text) => setNotice({ type: 'error', text })
  const showSuccess = (text) => setNotice({ type: 'success', text })

  // Trae la lista desde la API. También se usa para re-sincronizar después de un error.
  const loadHabits = useCallback(async () => {
    try {
      const data = await habitsApi.getAll()
      setHabits(data)
      setSelectedId((id) => (data.some((h) => h.id === id) ? id : (data[0]?.id ?? null)))
      setEditingId((id) => (data.some((h) => h.id === id) ? id : null))
      setCompletionsVersion((v) => v + 1)
      setLoadError(null)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // loadHabits es asíncrona: solo actualiza el estado cuando responde la API.
    // oxlint-disable-next-line react/set-state-in-effect
    loadHabits()
  }, [loadHabits])

  function retryLoad() {
    setLoading(true)
    loadHabits()
  }

  // Los mensajes de éxito se ocultan solos; los de error se quedan hasta cerrarlos.
  useEffect(() => {
    if (notice?.type !== 'success') return
    const timer = setTimeout(() => setNotice(null), 3000)
    return () => clearTimeout(timer)
  }, [notice])

  // Cargar los días cumplidos del hábito seleccionado.
  useEffect(() => {
    if (selectedId === null) return

    let ignore = false // evita mostrar datos de otro hábito si se cambia rápido de selección
    habitsApi
      .getCompletions(selectedId)
      .then((dates) => !ignore && setCompletions({ habitId: selectedId, dates: new Set(dates), failed: false }))
      .catch((err) => {
        if (ignore) return
        setCompletions({ habitId: selectedId, dates: new Set(), failed: true })
        showError(err.message)
      })

    return () => {
      ignore = true
    }
  }, [selectedId, completionsVersion])

  function replaceHabit(updated) {
    setHabits((list) => list.map((h) => (h.id === updated.id ? updated : h)))
  }

  async function handleSubmit(values) {
    try {
      if (editingHabit) {
        const updated = await habitsApi.update(editingHabit.id, values)
        replaceHabit(updated)
        setEditingId(null)
        showSuccess(`Se guardaron los cambios de "${updated.name}".`)
      } else {
        const created = await habitsApi.create(values)
        setHabits((list) => [...list, created])
        setSelectedId(created.id)
        showSuccess(`Hábito "${created.name}" creado.`)
      }
      return null
    } catch (err) {
      showError(err.message)
      if (err.status === 404) loadHabits() // el hábito ya no existe: refrescar la lista
      return Object.keys(err.fieldErrors ?? {}).length > 0 ? err.fieldErrors : null
    }
  }

  async function handleDelete(habit) {
    const days = habit.totalCompleted
    const warning = days > 0 ? `\nTambién se borrarán sus ${days} ${days === 1 ? 'día cumplido' : 'días cumplidos'}.` : ''
    if (!window.confirm(`¿Eliminar el hábito "${habit.name}"?${warning}`)) return

    setBusy({ habitId: habit.id, date: null })
    try {
      await habitsApi.remove(habit.id)
      const rest = habits.filter((h) => h.id !== habit.id)
      setHabits(rest)
      if (selectedId === habit.id) setSelectedId(rest[0]?.id ?? null)
      if (editingId === habit.id) setEditingId(null)
      showSuccess(`Hábito "${habit.name}" eliminado.`)
    } catch (err) {
      showError(err.message)
      loadHabits()
    } finally {
      setBusy({ habitId: null, date: null })
    }
  }

  async function toggleDay(habit, date, isDone) {
    setBusy({ habitId: habit.id, date })
    try {
      const updated = isDone ? await habitsApi.unmarkDay(habit.id, date) : await habitsApi.markDay(habit.id, date)
      replaceHabit(updated)
      if (habit.id === selectedId) {
        setCompletions((prev) => {
          if (prev.habitId !== habit.id) return prev
          const dates = new Set(prev.dates)
          if (isDone) dates.delete(date)
          else dates.add(date)
          return { ...prev, dates }
        })
      }
    } catch (err) {
      showError(err.message)
      loadHabits() // volver a sincronizar con lo que realmente hay en la base de datos
    } finally {
      setBusy({ habitId: null, date: null })
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Rastreador de Hábitos</h1>
        <p className="muted">Hoy es {formatDate(todayIso())}</p>
      </header>

      {notice && (
        <div className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.text}</span>
          <button type="button" className="notice-close" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}

      <main className="layout">
        <aside className="sidebar">
          <HabitForm
            key={editingHabit ? editingHabit.id : 'new'}
            habit={editingHabit}
            onSubmit={handleSubmit}
            onCancel={() => setEditingId(null)}
          />

          <h2 className="section-title">Mis hábitos</h2>

          {loading && <p className="muted">Cargando hábitos…</p>}

          {!loading && loadError && (
            <div className="card load-error">
              <p>{loadError}</p>
              <button type="button" className="btn primary" onClick={retryLoad}>
                Reintentar
              </button>
            </div>
          )}

          {!loading && !loadError && habits.length === 0 && (
            <p className="muted">Todavía no tienes hábitos. Crea el primero con el formulario de arriba.</p>
          )}

          <ul className="habit-list">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                selected={habit.id === selectedId}
                busy={busy.habitId === habit.id}
                onSelect={() => setSelectedId(habit.id)}
                onToggleToday={() => toggleDay(habit, todayIso(), habit.completedToday)}
                onEdit={() => setEditingId(habit.id)}
                onDelete={() => handleDelete(habit)}
              />
            ))}
          </ul>
        </aside>

        <section className="detail">
          {selectedHabit ? (
            <>
              <div className="card detail-header">
                <h2>{selectedHabit.name}</h2>
                {selectedHabit.description && <p>{selectedHabit.description}</p>}
                <p className="muted small">Fecha de inicio: {formatDate(selectedHabit.startDate)}</p>
                <div className="big-stats">
                  <div>
                    <span className="big-number">{selectedHabit.totalCompleted}</span>
                    <span className="muted">días cumplidos</span>
                  </div>
                  <div>
                    <span className="big-number">{selectedHabit.currentStreak}</span>
                    <span className="muted">racha actual</span>
                  </div>
                </div>
              </div>

              <HabitCalendar
                key={selectedHabit.id}
                habit={selectedHabit}
                completedDates={completedDates}
                loading={!completionsReady}
                loadFailed={completionsReady && completions.failed}
                busyDate={busy.habitId === selectedHabit.id ? busy.date : null}
                onToggleDay={(date, isDone) => toggleDay(selectedHabit, date, isDone)}
              />
              <p className="muted small">Haz clic en un día del calendario para marcarlo o desmarcarlo.</p>
            </>
          ) : (
            !loading && !loadError && <p className="muted empty-detail">Selecciona un hábito para ver su calendario.</p>
          )}
        </section>
      </main>
    </div>
  )
}
