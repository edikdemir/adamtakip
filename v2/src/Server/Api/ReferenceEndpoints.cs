using System.Text.Json;
using IsTakip.Data;
using IsTakip.Domain;
using Microsoft.EntityFrameworkCore;

namespace IsTakip.Server.Api;

public sealed record CreateProjectRequest(string Code, string? Name);
public sealed record UpdateProjectRequest(string? Name, bool? IsArchived);
public sealed record UpdateSettingRequest(string Key, JsonElement Value);

/// <summary>Referans verisi uçları: projeler, iş tipleri, zone/mahal, kullanıcılar, ayarlar, bildirimler.</summary>
public static class ReferenceEndpoints
{
    public static RouteGroupBuilder MapReferenceData(this RouteGroupBuilder api)
    {
        // Projeler
        api.MapGet("/projects", async (bool? include_archived, AppDbContext db) =>
        {
            var query = db.Projects.AsNoTracking();
            if (include_archived != true) query = query.Where(p => !p.IsArchived);
            var data = await query.OrderBy(p => p.Code)
                .Select(p => new { id = p.Id, code = p.Code, name = p.Name, is_archived = p.IsArchived, created_at = p.CreatedAt })
                .ToListAsync();
            return ApiResults.Data(data);
        }).RequireAuthorization();

        api.MapPost("/projects", async (CreateProjectRequest body, AppDbContext db) =>
        {
            var code = body.Code?.Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(code)) return ApiResults.BadRequest();
            if (await db.Projects.AnyAsync(p => p.Code == code)) return ApiResults.Conflict("Bu proje kodu zaten var");

            var now = DateTime.UtcNow;
            var project = new Project { Id = Guid.CreateVersion7(), Code = code, Name = body.Name?.Trim(), CreatedAt = now, UpdatedAt = now };
            db.Projects.Add(project);
            await db.SaveChangesAsync();
            return ApiResults.Created(new { id = project.Id, code = project.Code, name = project.Name, is_archived = project.IsArchived, created_at = project.CreatedAt });
        }).RequireAuthorization("Admin");

        api.MapPatch("/projects/{id:guid}", async (Guid id, UpdateProjectRequest body, AppDbContext db) =>
        {
            var project = await db.Projects.FindAsync(id);
            if (project is null) return ApiResults.NotFound("Proje bulunamadı");
            if (body.Name is not null) project.Name = body.Name.Trim();
            if (body.IsArchived is bool archived) project.IsArchived = archived;
            project.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return ApiResults.Data(new { id = project.Id, code = project.Code, name = project.Name, is_archived = project.IsArchived, created_at = project.CreatedAt });
        }).RequireAuthorization("Admin");

        // İş tipi ağacı (iş tipi → alt tip → yapılacak iş)
        api.MapGet("/job-types", async (AppDbContext db) =>
        {
            var data = await db.JobTypes.AsNoTracking()
                .OrderBy(t => t.SortOrder).ThenBy(t => t.Name)
                .Select(t => new
                {
                    id = t.Id,
                    name = t.Name,
                    sort_order = t.SortOrder,
                    job_sub_types = t.JobSubTypes.OrderBy(s => s.SortOrder).ThenBy(s => s.Name).Select(s => new
                    {
                        id = s.Id,
                        job_type_id = s.JobTypeId,
                        name = s.Name,
                        sort_order = s.SortOrder,
                        job_work_items = s.JobWorkItems.OrderBy(w => w.SortOrder).ThenBy(w => w.Name).Select(w => new
                        {
                            id = w.Id,
                            job_sub_type_id = w.JobSubTypeId,
                            name = w.Name,
                            sort_order = w.SortOrder,
                        }).ToList(),
                    }).ToList(),
                })
                .ToListAsync();
            return ApiResults.Data(data);
        }).RequireAuthorization();

        // Zone / Mahal
        api.MapGet("/zones", async (Guid? project_id, AppDbContext db) =>
        {
            var query = db.Zones.AsNoTracking();
            if (project_id is Guid pid) query = query.Where(z => z.ProjectId == pid);
            var data = await query.OrderBy(z => z.Name)
                .Select(z => new { id = z.Id, project_id = z.ProjectId, name = z.Name }).ToListAsync();
            return ApiResults.Data(data);
        }).RequireAuthorization();

        api.MapGet("/locations", async (Guid? project_id, AppDbContext db) =>
        {
            var query = db.Locations.AsNoTracking();
            if (project_id is Guid pid) query = query.Where(l => l.ProjectId == pid);
            var data = await query.OrderBy(l => l.Name)
                .Select(l => new { id = l.Id, project_id = l.ProjectId, name = l.Name }).ToListAsync();
            return ApiResults.Data(data);
        }).RequireAuthorization();

        // Kullanıcılar (yönetici)
        api.MapGet("/users", async (AppDbContext db) =>
        {
            var data = await db.Users.AsNoTracking().OrderBy(u => u.DisplayName)
                .Select(u => new
                {
                    id = u.Id,
                    email = u.Email,
                    display_name = u.DisplayName,
                    job_title = u.JobTitle,
                    photo_url = u.PhotoUrl,
                    role = u.Role,
                    is_active = u.IsActive,
                    last_seen_at = u.LastSeenAt,
                    created_at = u.CreatedAt,
                    updated_at = u.UpdatedAt,
                })
                .ToListAsync();
            return ApiResults.Data(data);
        }).RequireAuthorization("Admin");

        // Ayarlar: {key: value} sözlüğü; value ham JSON
        api.MapGet("/settings", async (AppDbContext db) =>
        {
            var rows = await db.SystemSettings.AsNoTracking().ToListAsync();
            var data = rows.ToDictionary(r => r.Key, r => JsonSerializer.Deserialize<JsonElement>(r.Value));
            return ApiResults.Data(data);
        }).RequireAuthorization();

        api.MapPut("/settings", async (UpdateSettingRequest body, HttpContext ctx, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(body.Key)) return ApiResults.BadRequest();
            var setting = await db.SystemSettings.FindAsync(body.Key);
            var now = DateTime.UtcNow;
            if (setting is null)
            {
                setting = new SystemSetting { Key = body.Key };
                db.SystemSettings.Add(setting);
            }
            setting.Value = body.Value.GetRawText();
            setting.UpdatedBy = ctx.User.GetUserId();
            setting.UpdatedAt = now;
            await db.SaveChangesAsync();
            return ApiResults.Data(new { key = setting.Key, value = body.Value });
        }).RequireAuthorization("Admin");

        // Bildirimler: {data, unreadCount}
        api.MapGet("/notifications", async (HttpContext ctx, AppDbContext db) =>
        {
            var userId = ctx.User.GetUserId();
            if (userId is null) return ApiResults.Unauthorized();

            var items = await db.Notifications.AsNoTracking()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt).Take(50)
                .Select(n => new { id = n.Id, user_id = n.UserId, type = n.Type, title = n.Title, body = n.Body, task_id = n.TaskId, is_read = n.IsRead, created_at = n.CreatedAt })
                .ToListAsync();
            var unread = await db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

            return Results.Ok(new NotificationsResponse(items, unread));
        }).RequireAuthorization();

        api.MapPatch("/notifications/{id:guid}/read", async (Guid id, HttpContext ctx, AppDbContext db) =>
        {
            var userId = ctx.User.GetUserId();
            var updated = await db.Notifications.Where(n => n.Id == id && n.UserId == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
            return updated == 0 ? ApiResults.NotFound() : ApiResults.Success();
        }).RequireAuthorization();

        api.MapPost("/notifications/read-all", async (HttpContext ctx, AppDbContext db) =>
        {
            var userId = ctx.User.GetUserId();
            await db.Notifications.Where(n => n.UserId == userId && !n.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
            return ApiResults.Success();
        }).RequireAuthorization();

        return api;
    }

    /// <summary>Web sözleşmesindeki tek camelCase alan: unreadCount.</summary>
    public sealed record NotificationsResponse(
        object Data,
        [property: System.Text.Json.Serialization.JsonPropertyName("unreadCount")] int UnreadCount);
}
