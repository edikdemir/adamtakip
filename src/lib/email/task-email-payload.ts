import type { AdminStatus, Priority } from "@/lib/constants"
import type { User } from "@/types/user"

export type EmailUser = Pick<User, "id" | "email" | "display_name">

export interface TaskEmailPayload {
  id: number
  drawing_no: string
  description: string
  planned_end: string | null
  priority: Priority
  admin_notes: string | null
  admin_status: AdminStatus
  total_elapsed_seconds: number
  manual_hours: number | null
  approved_at: string | null
  project?: { id: string; code: string; name: string | null } | null
  job_type?: { id: string; name: string } | null
  job_sub_type?: { id: string; name: string } | null
}

export const TASK_EMAIL_SELECT = `
  id,
  drawing_no,
  description,
  planned_end,
  priority,
  admin_notes,
  admin_status,
  total_elapsed_seconds,
  manual_hours,
  approved_at,
  project:projects(id, code, name),
  job_type:job_types(id, name),
  job_sub_type:job_sub_types(id, name)
`

function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export function toEmailUser(value: unknown): EmailUser | null {
  const user = firstJoin(value as EmailUser | EmailUser[] | null | undefined)
  if (!user?.id || !user.email) {
    return null
  }

  return {
    id: String(user.id),
    email: String(user.email),
    display_name: String(user.display_name ?? ""),
  }
}

export function toTaskEmailPayload(
  row: Record<string, unknown>,
  overrides: Partial<TaskEmailPayload> = {}
): TaskEmailPayload {
  const merged: Record<string, unknown> = { ...row, ...overrides }

  return {
    id: Number(merged.id),
    drawing_no: String(merged.drawing_no ?? ""),
    description: String(merged.description ?? ""),
    planned_end: (merged.planned_end as string | null | undefined) ?? null,
    priority: (merged.priority as Priority | undefined) ?? "medium",
    admin_notes: (merged.admin_notes as string | null | undefined) ?? null,
    admin_status: (merged.admin_status as AdminStatus | undefined) ?? "havuzda",
    total_elapsed_seconds: Number(merged.total_elapsed_seconds ?? 0),
    manual_hours: merged.manual_hours == null ? null : Number(merged.manual_hours),
    approved_at: (merged.approved_at as string | null | undefined) ?? null,
    project: firstJoin(merged.project as TaskEmailPayload["project"]),
    job_type: firstJoin(merged.job_type as TaskEmailPayload["job_type"]),
    job_sub_type: firstJoin(merged.job_sub_type as TaskEmailPayload["job_sub_type"]),
  }
}
