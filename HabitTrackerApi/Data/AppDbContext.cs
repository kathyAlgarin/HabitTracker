using HabitTrackerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace HabitTrackerApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitCompletion> HabitCompletions => Set<HabitCompletion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Habit>(e =>
        {
            e.Property(h => h.Name).IsRequired().HasMaxLength(100);
            e.Property(h => h.Description).HasMaxLength(500);
            e.Property(h => h.StartDate).IsRequired();
        });

        modelBuilder.Entity<HabitCompletion>(e =>
        {
            // Un mismo día no se puede marcar dos veces para el mismo hábito.
            e.HasIndex(c => new { c.HabitId, c.Date }).IsUnique();

            // Al eliminar un hábito se eliminan también sus días cumplidos.
            e.HasOne(c => c.Habit)
             .WithMany(h => h.Completions)
             .HasForeignKey(c => c.HabitId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
