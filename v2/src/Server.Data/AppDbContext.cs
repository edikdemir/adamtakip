using IsTakip.Domain;
using Microsoft.EntityFrameworkCore;

namespace IsTakip.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<User> Users => Set<User>();
    public DbSet<JobType> JobTypes => Set<JobType>();
    public DbSet<JobSubType> JobSubTypes => Set<JobSubType>();
    public DbSet<JobWorkItem> JobWorkItems => Set<JobWorkItem>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<TaskNote> TaskNotes => Set<TaskNote>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<JobRun> JobRuns => Set<JobRun>();

    protected override void ConfigureConventions(ModelConfigurationBuilder b)
    {
        b.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();

        b.Properties<UserRole>().HaveConversion<SnakeEnumConverter<UserRole>>().HaveMaxLength(20);
        b.Properties<AdminStatus>().HaveConversion<SnakeEnumConverter<AdminStatus>>().HaveMaxLength(20);
        b.Properties<WorkerStatus>().HaveConversion<SnakeEnumConverter<WorkerStatus>>().HaveMaxLength(20);
        b.Properties<Priority>().HaveConversion<SnakeEnumConverter<Priority>>().HaveMaxLength(10);
        b.Properties<NotificationType>().HaveConversion<SnakeEnumConverter<NotificationType>>().HaveMaxLength(50);
        b.Properties<TimeEntrySource>().HaveConversion<SnakeEnumConverter<TimeEntrySource>>().HaveMaxLength(20);
        b.Properties<TimeEntryStatus>().HaveConversion<SnakeEnumConverter<TimeEntryStatus>>().HaveMaxLength(20);
        b.Properties<DeviceState>().HaveConversion<SnakeEnumConverter<DeviceState>>().HaveMaxLength(20);
        b.Properties<TimeEntryFlags>().HaveConversion<FlagsCsvConverter>().HaveMaxLength(200);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Project>(e =>
        {
            e.ToTable("projects");
            e.Property(p => p.Code).HasMaxLength(20).IsRequired();
            e.Property(p => p.Name).HasMaxLength(255);
            e.HasIndex(p => p.Code).IsUnique();
        });

        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.Property(u => u.Username).HasMaxLength(255).IsRequired();
            e.Property(u => u.Email).HasMaxLength(255).IsRequired();
            e.Property(u => u.DisplayName).HasMaxLength(255).IsRequired();
            e.Property(u => u.JobTitle).HasMaxLength(255);
            e.Property(u => u.ExternalId).HasMaxLength(255);
            e.HasIndex(u => u.Username).IsUnique();
            e.HasIndex(u => u.ExternalId).IsUnique().HasFilter("external_id IS NOT NULL");
            e.HasIndex(u => u.Email);
        });

        b.Entity<JobType>(e =>
        {
            e.ToTable("job_types");
            e.Property(j => j.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(j => j.Name).IsUnique();
        });

        b.Entity<JobSubType>(e =>
        {
            e.ToTable("job_sub_types");
            e.Property(j => j.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(j => new { j.JobTypeId, j.Name }).IsUnique();
            e.HasOne(j => j.JobType).WithMany(t => t.JobSubTypes).HasForeignKey(j => j.JobTypeId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<JobWorkItem>(e =>
        {
            e.ToTable("job_work_items");
            e.Property(j => j.Name).HasMaxLength(200).IsRequired();
            e.HasIndex(j => new { j.JobSubTypeId, j.Name }).IsUnique();
            e.HasOne(j => j.JobSubType).WithMany(s => s.JobWorkItems).HasForeignKey(j => j.JobSubTypeId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Zone>(e =>
        {
            e.ToTable("zones");
            e.Property(z => z.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(z => new { z.ProjectId, z.Name }).IsUnique();
            e.HasOne(z => z.Project).WithMany(p => p.Zones).HasForeignKey(z => z.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Location>(e =>
        {
            e.ToTable("locations");
            e.Property(l => l.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(l => new { l.ProjectId, l.Name }).IsUnique();
            e.HasOne(l => l.Project).WithMany(p => p.Locations).HasForeignKey(l => l.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<TaskItem>(e =>
        {
            e.ToTable("tasks");
            e.Property(t => t.Location).HasMaxLength(100);
            e.Property(t => t.DrawingNo).HasMaxLength(100).IsRequired();
            e.Property(t => t.Description).IsRequired();
            e.Property(t => t.SearchText).IsRequired().HasDefaultValue(string.Empty);

            e.HasOne(t => t.Project).WithMany().HasForeignKey(t => t.ProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.JobType).WithMany().HasForeignKey(t => t.JobTypeId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.JobSubType).WithMany().HasForeignKey(t => t.JobSubTypeId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.Zone).WithMany().HasForeignKey(t => t.ZoneId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.AssignedUser).WithMany().HasForeignKey(t => t.AssignedTo).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.AssignedByUser).WithMany().HasForeignKey(t => t.AssignedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.ApprovedByUser).WithMany().HasForeignKey(t => t.ApprovedBy).OnDelete(DeleteBehavior.Restrict);
            // Tek seviyeli bağ: birincil görev → bağımlılar (ADR 0001'deki eski trigger kuralı uygulama katmanında).
            e.HasOne(t => t.LinkedToTask).WithMany(t => t.LinkedTasks).HasForeignKey(t => t.LinkedToTaskId).OnDelete(DeleteBehavior.SetNull);

            e.HasIndex(t => t.ProjectId);
            e.HasIndex(t => t.AssignedTo);
            e.HasIndex(t => t.JobTypeId);
            e.HasIndex(t => t.JobSubTypeId);
            e.HasIndex(t => t.ZoneId).HasFilter("zone_id IS NOT NULL");
            e.HasIndex(t => t.PlannedEnd).HasFilter("planned_end IS NOT NULL");
            e.HasIndex(t => t.LinkedToTaskId).HasFilter("linked_to_task_id IS NOT NULL");
            e.HasIndex(t => new { t.AdminStatus, t.CreatedAt }).IsDescending(false, true);
            e.HasIndex(t => new { t.AssignedTo, t.AdminStatus });
            e.HasIndex(t => new { t.ProjectId, t.Location });
        });

        b.Entity<TaskNote>(e =>
        {
            e.ToTable("task_notes");
            e.Property(n => n.Content).IsRequired();
            e.HasOne(n => n.Task).WithMany(t => t.Notes).HasForeignKey(n => n.TaskId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(n => n.TaskId);
        });

        b.Entity<Notification>(e =>
        {
            e.ToTable("notifications");
            e.Property(n => n.Title).HasMaxLength(255).IsRequired();
            e.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(n => n.Task).WithMany().HasForeignKey(n => n.TaskId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(n => n.UserId);
            e.HasIndex(n => new { n.UserId, n.IsRead }).HasFilter("is_read = 0");
        });

        b.Entity<SystemSetting>(e =>
        {
            e.ToTable("system_settings");
            e.HasKey(s => s.Key);
            e.Property(s => s.Key).HasMaxLength(100);
            e.Property(s => s.Value).IsRequired();
        });

        b.Entity<Device>(e =>
        {
            e.ToTable("devices");
            e.Property(d => d.Name).HasMaxLength(255).IsRequired();
            e.Property(d => d.AppVersion).HasMaxLength(50);
            e.Property(d => d.TokenHash).HasMaxLength(64).IsRequired();
            e.HasOne(d => d.User).WithMany().HasForeignKey(d => d.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(d => d.TokenHash).IsUnique();
            e.HasIndex(d => d.UserId);
        });

        b.Entity<TimeEntry>(e =>
        {
            e.ToTable("time_entries");
            // İstemci üretir (UUID v7); sunucu asla yeni id vermez.
            e.Property(t => t.Id).ValueGeneratedNever();
            e.Property(t => t.Reason).HasMaxLength(500);
            e.Property(t => t.VoidReason).HasMaxLength(500);
            e.HasOne(t => t.Task).WithMany(x => x.TimeEntries).HasForeignKey(t => t.TaskId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.Device).WithMany().HasForeignKey(t => t.DeviceId).OnDelete(DeleteBehavior.SetNull);

            e.HasIndex(t => new { t.UserId, t.StartedAt });
            e.HasIndex(t => t.TaskId);
            e.HasIndex(t => t.Status).HasFilter("status = 'flagged'");
            // Kullanıcı başına tek açık kayıt (ADR 0002).
            e.HasIndex(t => t.UserId).IsUnique().HasFilter("is_open = 1").HasDatabaseName("ux_time_entries_single_open_per_user");
        });

        b.Entity<JobRun>(e =>
        {
            e.ToTable("job_runs");
            e.Property(j => j.JobName).HasMaxLength(100).IsRequired();
            e.HasIndex(j => new { j.JobName, j.StartedAt });
        });

        ApplySnakeCaseColumnNames(b);
    }

    /// <summary>Kolon adlarını snake_case yapar; tablo adları yukarıda açıkça verilir.</summary>
    private static void ApplySnakeCaseColumnNames(ModelBuilder b)
    {
        foreach (var entity in b.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(EnumNames.ToSnake(property.Name));
            }
        }
    }
}
