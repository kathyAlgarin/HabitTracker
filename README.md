# Rastreador de Hábitos

Aplicación web para registrar hábitos y marcar los días en que se cumplen.

- **API REST:** ASP.NET Core (.NET 10) + Entity Framework Core + SQLite → carpeta [`HabitTrackerApi`](HabitTrackerApi)
- **Frontend:** React + Vite → carpeta [`frontend`](frontend)

En [DOCUMENTACION.md](DOCUMENTACION.md) se explica en detalle cómo está construida la API y cómo la consume el frontend.

## Funcionalidades

- Crear, listar, editar y eliminar hábitos (nombre, descripción opcional y fecha de inicio).
- Marcar y desmarcar un día como cumplido.
- Calendario mensual con los días cumplidos de cada hábito.
- Total de días cumplidos y racha actual por hábito.

## Requisitos

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 20 o superior

## Cómo ejecutarlo

### 1. API

```bash
cd HabitTrackerApi
dotnet run --launch-profile http
```

- Queda escuchando en `http://localhost:5285`.
- La base de datos `habits.db` (SQLite) se crea sola la primera vez, aplicando las migraciones.
- Documentación interactiva (Swagger): `http://localhost:5285/swagger`

También se puede abrir `HabitTrackerApi.sln` en Visual Studio y ejecutar.

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abrir `http://localhost:5173`.

Si la API corre en otra URL, crear `frontend/.env` a partir de `frontend/.env.example` y cambiar `VITE_API_URL`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/habits` | Lista los hábitos con su progreso |
| GET | `/api/habits/{id}` | Obtiene un hábito |
| POST | `/api/habits` | Crea un hábito |
| PUT | `/api/habits/{id}` | Edita un hábito |
| DELETE | `/api/habits/{id}` | Elimina un hábito (y sus días cumplidos) |
| GET | `/api/habits/{id}/completions` | Fechas cumplidas del hábito |
| PUT | `/api/habits/{id}/completions/{yyyy-MM-dd}` | Marca un día como cumplido |
| DELETE | `/api/habits/{id}/completions/{yyyy-MM-dd}` | Desmarca un día |

Ejemplo de cuerpo para crear/editar:

```json
{
  "name": "Leer 20 minutos",
  "description": "Antes de dormir",
  "startDate": "2026-10-01"
}
```

Cada hábito se devuelve con `totalCompleted` (días cumplidos), `currentStreak` (racha actual) y `completedToday`.

El archivo `HabitTrackerApi/HabitTrackerApi.http` tiene ejemplos listos para probar desde Visual Studio o VS Code.

## Validaciones

La API valida todo (el frontend repite las mismas reglas para avisar antes de enviar):

- Nombre obligatorio, de 2 a 100 caracteres, y sin repetir (no distingue mayúsculas).
- Descripción de máximo 500 caracteres.
- La fecha de inicio es obligatoria y puede ser cualquier fecha (pasada, hoy o futura).
- Al editar, la fecha de inicio no puede quedar después de un día ya marcado.
- Solo se pueden marcar días entre la fecha de inicio y hoy (si el hábito empieza en el futuro, todavía no se puede marcar ningún día).
- Un día no se guarda dos veces (índice único en la base de datos); marcarlo de nuevo no da error.
- Fechas con formato inválido o hábitos inexistentes devuelven 400 / 404 con un mensaje claro.

Los errores se devuelven en formato `ProblemDetails` (`detail` o `errors` por campo), y el frontend los muestra junto al campo o en un aviso.

## Cómo se calcula la racha

Es la cantidad de días seguidos cumplidos que terminan hoy. Si hoy todavía no se marca, la racha se cuenta hasta ayer (el día aún no termina). Si ayer tampoco se cumplió, la racha es 0.

## Estructura

```
HabitTrackerApi/
  Controllers/HabitsController.cs   endpoints y validaciones
  Data/AppDbContext.cs              contexto de EF Core (SQLite)
  Dtos/HabitDtos.cs                 datos de entrada y salida
  Models/                           Habit y HabitCompletion
  Services/StreakCalculator.cs      cálculo de la racha
  Migrations/                       migraciones de la base de datos
frontend/
  src/api/habitsApi.js              llamadas a la API y manejo de errores
  src/components/                   formulario, tarjeta y calendario
  src/utils/dates.js                utilidades de fechas
  src/App.jsx                       pantalla principal
```
