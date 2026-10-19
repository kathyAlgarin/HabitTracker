namespace HabitTrackerApi.Services;

public static class StreakCalculator
{
    // Racha actual: días seguidos cumplidos que terminan hoy.
    // Si hoy todavía no se marca, la racha se cuenta hasta ayer (el día aún no termina).
    public static int CurrentStreak(IEnumerable<DateOnly> completedDates, DateOnly today)
    {
        var dates = completedDates.ToHashSet();

        var day = dates.Contains(today) ? today : today.AddDays(-1);
        var streak = 0;

        while (dates.Contains(day))
        {
            streak++;
            day = day.AddDays(-1);
        }

        return streak;
    }
}
