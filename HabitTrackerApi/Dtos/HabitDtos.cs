using System.ComponentModel.DataAnnotations;

namespace HabitTrackerApi.Dtos;

// Datos que envía el cliente para crear o editar un hábito.
public class HabitRequestDto
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 100 caracteres.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "La descripción no puede superar los 500 caracteres.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "La fecha de inicio es obligatoria.")]
    public DateOnly? StartDate { get; set; }
}

// Datos que devuelve la API, con el progreso ya calculado.
public record HabitResponseDto(
    int Id,
    string Name,
    string? Description,
    DateOnly StartDate,
    DateTime CreatedAt,
    int TotalCompleted,
    int CurrentStreak,
    bool CompletedToday);
