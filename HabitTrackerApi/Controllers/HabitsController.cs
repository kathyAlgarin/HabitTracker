using System.Globalization;
using HabitTrackerApi.Data;
using HabitTrackerApi.Dtos;
using HabitTrackerApi.Models;
using HabitTrackerApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HabitTrackerApi.Controllers;

[ApiController]
[Route("api/habits")]
public class HabitsController : ControllerBase
{
    private const string DateFormat = "yyyy-MM-dd";

    private readonly AppDbContext _db;

    public HabitsController(AppDbContext db)
    {
        _db = db;
    }

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    // GET: api/habits
    [HttpGet]
    public async Task<ActionResult<List<HabitResponseDto>>> GetAll()
    {
        var habits = await _db.Habits
            .AsNoTracking()
            .Include(h => h.Completions)
            .OrderBy(h => h.CreatedAt)
            .ToListAsync();

        return habits.Select(ToResponse).ToList();
    }

    // GET: api/habits/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<HabitResponseDto>> GetById(int id)
    {
        var habit = await FindHabit(id);
        if (habit is null) return HabitNotFound(id);

        return ToResponse(habit);
    }

    // POST: api/habits
    [HttpPost]
    public async Task<ActionResult<HabitResponseDto>> Create(HabitRequestDto dto)
    {
        var name = dto.Name.Trim();
        await ValidateHabit(name, excludeId: null);
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var habit = new Habit
        {
            Name = name,
            Description = NormalizeDescription(dto.Description),
            StartDate = dto.StartDate!.Value,
            CreatedAt = DateTime.UtcNow
        };

        _db.Habits.Add(habit);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = habit.Id }, ToResponse(habit));
    }

    // PUT: api/habits/5
    [HttpPut("{id:int}")]
    public async Task<ActionResult<HabitResponseDto>> Update(int id, HabitRequestDto dto)
    {
        var habit = await _db.Habits.Include(h => h.Completions).FirstOrDefaultAsync(h => h.Id == id);
        if (habit is null) return HabitNotFound(id);

        var name = dto.Name.Trim();
        var startDate = dto.StartDate!.Value;
        await ValidateHabit(name, excludeId: id);

        // No se puede mover la fecha de inicio después de un día que ya está marcado.
        var firstCompleted = habit.Completions.Select(c => (DateOnly?)c.Date).Min();
        if (firstCompleted is not null && startDate > firstCompleted)
        {
            ModelState.AddModelError(nameof(dto.StartDate),
                $"Hay días cumplidos desde el {firstCompleted.Value.ToString(DateFormat)}. " +
                "La fecha de inicio no puede ser posterior a ese día.");
        }

        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        habit.Name = name;
        habit.Description = NormalizeDescription(dto.Description);
        habit.StartDate = startDate;
        await _db.SaveChangesAsync();

        return ToResponse(habit);
    }

    // DELETE: api/habits/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var habit = await _db.Habits.FindAsync(id);
        if (habit is null) return HabitNotFound(id);

        _db.Habits.Remove(habit);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/habits/5/completions
    // Devuelve las fechas cumplidas (yyyy-MM-dd) para pintar el calendario.
    [HttpGet("{id:int}/completions")]
    public async Task<ActionResult<List<DateOnly>>> GetCompletions(int id)
    {
        if (!await _db.Habits.AnyAsync(h => h.Id == id)) return HabitNotFound(id);

        return await _db.HabitCompletions
            .AsNoTracking()
            .Where(c => c.HabitId == id)
            .OrderBy(c => c.Date)
            .Select(c => c.Date)
            .ToListAsync();
    }

    // PUT: api/habits/5/completions/2026-10-18
    // Marca el día como cumplido. Si ya estaba marcado no hace nada (idempotente).
    [HttpPut("{id:int}/completions/{date}")]
    public async Task<ActionResult<HabitResponseDto>> MarkDay(int id, string date)
    {
        var habit = await FindHabit(id);
        if (habit is null) return HabitNotFound(id);

        var error = ValidateDay(habit, date, out var day);
        if (error is not null) return error;

        if (!habit.Completions.Any(c => c.Date == day))
        {
            _db.HabitCompletions.Add(new HabitCompletion { HabitId = id, Date = day });
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Otra petición marcó el mismo día al mismo tiempo; el índice único lo impidió.
                // El resultado final es el esperado, así que no es un error para el usuario.
            }
        }

        return ToResponse((await FindHabit(id))!);
    }

    // DELETE: api/habits/5/completions/2026-10-18
    // Desmarca el día.
    [HttpDelete("{id:int}/completions/{date}")]
    public async Task<ActionResult<HabitResponseDto>> UnmarkDay(int id, string date)
    {
        var habit = await FindHabit(id);
        if (habit is null) return HabitNotFound(id);

        if (!TryParseDate(date, out var day)) return InvalidDate(date);

        var completion = await _db.HabitCompletions.FirstOrDefaultAsync(c => c.HabitId == id && c.Date == day);
        if (completion is null)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound,
                title: "Día no marcado",
                detail: $"El día {date} no estaba marcado como cumplido.");
        }

        _db.HabitCompletions.Remove(completion);
        await _db.SaveChangesAsync();

        return ToResponse((await FindHabit(id))!);
    }

    // ---------- Ayudantes ----------

    private Task<Habit?> FindHabit(int id) =>
        _db.Habits.AsNoTracking().Include(h => h.Completions).FirstOrDefaultAsync(h => h.Id == id);

    private async Task ValidateHabit(string name, int? excludeId)
    {
        if (name.Length < 2)
        {
            ModelState.AddModelError(nameof(HabitRequestDto.Name), "El nombre debe tener entre 2 y 100 caracteres.");
        }
        else
        {
            var lowered = name.ToLower();
            var duplicated = await _db.Habits.AnyAsync(h => h.Name.ToLower() == lowered && h.Id != excludeId);
            if (duplicated)
            {
                ModelState.AddModelError(nameof(HabitRequestDto.Name), $"Ya existe un hábito llamado \"{name}\".");
            }
        }
    }

    private ActionResult? ValidateDay(Habit habit, string date, out DateOnly day)
    {
        if (!TryParseDate(date, out day)) return InvalidDate(date);

        if (day < habit.StartDate)
        {
            return Problem(statusCode: StatusCodes.Status400BadRequest,
                title: "Fecha no válida",
                detail: $"No puedes marcar un día anterior a la fecha de inicio ({habit.StartDate.ToString(DateFormat)}).");
        }

        if (day > Today)
        {
            return Problem(statusCode: StatusCodes.Status400BadRequest,
                title: "Fecha no válida",
                detail: "No puedes marcar un día que todavía no llega.");
        }

        return null;
    }

    private static bool TryParseDate(string value, out DateOnly day) =>
        DateOnly.TryParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out day);

    private ObjectResult InvalidDate(string value) =>
        Problem(statusCode: StatusCodes.Status400BadRequest,
            title: "Fecha no válida",
            detail: $"\"{value}\" no es una fecha válida. Usa el formato {DateFormat}.");

    private ObjectResult HabitNotFound(int id) =>
        Problem(statusCode: StatusCodes.Status404NotFound,
            title: "Hábito no encontrado",
            detail: $"No existe un hábito con id {id}.");

    private static string? NormalizeDescription(string? description) =>
        string.IsNullOrWhiteSpace(description) ? null : description.Trim();

    private static HabitResponseDto ToResponse(Habit habit)
    {
        var dates = habit.Completions.Select(c => c.Date).ToList();
        var today = Today;

        return new HabitResponseDto(
            habit.Id,
            habit.Name,
            habit.Description,
            habit.StartDate,
            // SQLite no guarda el tipo de fecha; se guardó en UTC, así que se marca como UTC.
            DateTime.SpecifyKind(habit.CreatedAt, DateTimeKind.Utc),
            TotalCompleted: dates.Count,
            CurrentStreak: StreakCalculator.CurrentStreak(dates, today),
            CompletedToday: dates.Contains(today));
    }
}
