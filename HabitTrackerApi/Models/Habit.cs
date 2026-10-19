namespace HabitTrackerApi.Models;

public class Habit
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly StartDate { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<HabitCompletion> Completions { get; set; } = new();
}
