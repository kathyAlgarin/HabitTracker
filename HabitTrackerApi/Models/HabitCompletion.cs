namespace HabitTrackerApi.Models;

// Un registro por cada día que el hábito se cumplió.
public class HabitCompletion
{
    public int Id { get; set; }
    public int HabitId { get; set; }
    public DateOnly Date { get; set; }

    public Habit? Habit { get; set; }
}
