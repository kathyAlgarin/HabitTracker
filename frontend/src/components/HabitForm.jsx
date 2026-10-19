import { useState } from 'react'
import { todayIso } from '../utils/dates'

const EMPTY = { name: '', description: '', startDate: '' }

// Mismas reglas que la API, para avisar antes de enviar.
function validate(values) {
  const errors = {}
  const name = values.name.trim()

  if (!name) errors.name = 'El nombre es obligatorio.'
  else if (name.length < 2 || name.length > 100) errors.name = 'El nombre debe tener entre 2 y 100 caracteres.'

  if (values.description.length > 500) errors.description = 'La descripción no puede superar los 500 caracteres.'

  if (!values.startDate) errors.startDate = 'La fecha de inicio es obligatoria.'

  return errors
}

export default function HabitForm({ habit, onSubmit, onCancel }) {
  const isEditing = Boolean(habit)
  // App usa key={habit.id} para que el formulario se reinicie al cambiar de hábito.
  const [values, setValues] = useState(() =>
    habit
      ? { name: habit.name, description: habit.description ?? '', startDate: habit.startDate }
      : { ...EMPTY, startDate: todayIso() },
  )
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    setErrors((err) => ({ ...err, [name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    const fieldErrors = await onSubmit({
      name: values.name.trim(),
      description: values.description.trim() || null,
      startDate: values.startDate,
    })
    setSaving(false)

    // Si la API rechazó algún campo (por ejemplo, nombre repetido) se muestra junto al campo.
    if (fieldErrors) setErrors(fieldErrors)
    else if (!isEditing) setValues({ ...EMPTY, startDate: todayIso() })
  }

  return (
    <form className="card habit-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEditing ? 'Editar hábito' : 'Nuevo hábito'}</h2>

      <label>
        Nombre *
        <input
          name="name"
          value={values.name}
          onChange={handleChange}
          maxLength={100}
          placeholder="Ej. Leer 20 minutos"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>

      <label>
        <span>
          Descripción <span className="muted">(opcional)</span>
        </span>
        <textarea
          name="description"
          value={values.description}
          onChange={handleChange}
          maxLength={500}
          rows={3}
          placeholder="Ej. Antes de dormir"
          aria-invalid={Boolean(errors.description)}
        />
        <span className="counter">{values.description.length}/500</span>
        {errors.description && <span className="field-error">{errors.description}</span>}
      </label>

      <label>
        Fecha de inicio *
        <input
          type="date"
          name="startDate"
          value={values.startDate}
          onChange={handleChange}
          aria-invalid={Boolean(errors.startDate)}
        />
        {errors.startDate && <span className="field-error">{errors.startDate}</span>}
      </label>

      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear hábito'}
        </button>
        {isEditing && (
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
