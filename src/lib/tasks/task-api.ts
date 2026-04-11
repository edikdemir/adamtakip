import { USER_ROLES } from "@/lib/constants"
import type { Task } from "@/types/task"
import type { SessionUser } from "@/types/user"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface TaskListMeta {
  total: number
  offset: number
  limit: number | null
  has_more: boolean
}

export interface TaskListResponse {
  data: Task[]
  meta: TaskListMeta
}

export interface TaskSummary {
  total: number
  by_status: Record<string, number>
  active_timer_count: number
  overdue_count: number
  updated_today_count: number
  total_duration_seconds: number
}

export interface ParsedTaskQuery {
  args: Record<string, string | number | boolean | null>
  includeLinks: boolean
  limit: number | null
  offset: number
}

export interface TaskListRpcRow {
  id: number
  project_id: string
  job_type_id: string
  job_sub_type_id: string
  zone_id: string | null
  location: string | null
  drawing_no: string
  description: string
  planned_start: string | null
  planned_end: string | null
  assigned_to: string | null
  assigned_by: string | null
  total_elapsed_seconds: number | null
  timer_started_at: string | null
  manual_hours: number | null
  worker_status: Task["worker_status"]
  admin_status: Task["admin_status"]
  completion_date: string | null
  admin_notes: string | null
  priority: Task["priority"]
  linked_to_task_id: number | null
  approved_at: string | null
  approved_by: string | null
  overdue_notified_at: string | null
  created_at: string
  updated_at: string
  project_code: string | null
  project_name: string | null
  project_is_archived: boolean | null
  project_created_at: string | null
  job_type_name: string | null
  job_sub_type_name: string | null
  zone_name: string | null
  assigned_user_id: string | null
  assigned_user_display_name: string | null
  assigned_user_email: string | null
  assigned_user_photo_url: string | null
  assigned_by_user_id: string | null
  assigned_by_user_display_name: string | null
  assigned_by_user_email: string | null
  assigned_by_user_photo_url: string | null
  approved_by_user_id: string | null
  approved_by_user_display_name: string | null
  approved_by_user_email: string | null
  approved_by_user_photo_url: string | null
  has_links: boolean
  deadline_state: string
  duration_seconds: number | null
  total_count: number
}

export interface TaskSummaryRpcRow {
  total_count: number
  by_status: Record<string, number> | null
  active_timer_count: number
  overdue_count: number
  updated_today_count: number
  total_duration_seconds: number | null
}

function emptyToNull(value: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function uuidOrNull(value: string | null) {
  const normalized = emptyToNull(value)
  if (!normalized || normalized === "all") {
    return null
  }

  return UUID_PATTERN.test(normalized) ? normalized : null
}

function dateOrNull(value: string | null) {
  const normalized = emptyToNull(value)
  return normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null
}

function parseNonNegativeNumber(value: string | null) {
  if (value == null || value.trim() === "") {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

export function parseTaskQuery(searchParams: URLSearchParams, user: SessionUser): ParsedTaskQuery {
  const linkState = emptyToNull(searchParams.get("link_state"))
  const includeLinks = searchParams.get("include_links") === "true" || linkState === "linked" || linkState === "unlinked"
  const limit = parseNonNegativeNumber(searchParams.get("limit"))
  const offset = parseNonNegativeNumber(searchParams.get("offset")) ?? 0

  return {
    includeLinks,
    limit,
    offset,
    args: {
      p_requesting_user_id: user.id,
      p_is_super_admin: user.role === USER_ROLES.SUPER_ADMIN,
      p_my_tasks: searchParams.get("my_tasks") === "true",
      p_status: emptyToNull(searchParams.get("status")),
      p_project_id: uuidOrNull(searchParams.get("project_id")),
      p_assigned_to: uuidOrNull(searchParams.get("assigned_to")),
      p_job_type_id: uuidOrNull(searchParams.get("job_type_id")),
      p_job_sub_type_id: uuidOrNull(searchParams.get("job_sub_type_id")),
      p_zone_id: uuidOrNull(searchParams.get("zone_id")),
      p_location: emptyToNull(searchParams.get("location")),
      p_priority: emptyToNull(searchParams.get("priority")),
      p_assignment_state: emptyToNull(searchParams.get("assignment_state")),
      p_timer_state: emptyToNull(searchParams.get("timer_state")),
      p_link_state: linkState,
      p_deadline_state: emptyToNull(searchParams.get("deadline_state")),
      p_planned_start_from: dateOrNull(searchParams.get("planned_start_from")),
      p_planned_start_to: dateOrNull(searchParams.get("planned_start_to")),
      p_planned_end_from: dateOrNull(searchParams.get("planned_end_from")),
      p_planned_end_to: dateOrNull(searchParams.get("planned_end_to")),
      p_sort: emptyToNull(searchParams.get("sort")) ?? "created_desc",
      p_search: emptyToNull(searchParams.get("search")),
      p_limit: limit,
      p_offset: offset,
    },
  }
}

function userJoin(
  id: string | null,
  displayName: string | null,
  email: string | null,
  photoUrl: string | null
) {
  if (!id) {
    return undefined
  }

  return {
    id,
    display_name: displayName ?? "",
    email: email ?? "",
    photo_url: photoUrl,
  }
}

export function mapTaskListRow(row: TaskListRpcRow): Task {
  return {
    id: Number(row.id),
    project_id: row.project_id,
    job_type_id: row.job_type_id,
    job_sub_type_id: row.job_sub_type_id,
    zone_id: row.zone_id,
    location: row.location,
    drawing_no: row.drawing_no ?? "",
    description: row.description ?? "",
    planned_start: row.planned_start,
    planned_end: row.planned_end,
    assigned_to: row.assigned_to,
    assigned_by: row.assigned_by,
    total_elapsed_seconds: Number(row.total_elapsed_seconds ?? 0),
    timer_started_at: row.timer_started_at,
    manual_hours: row.manual_hours == null ? null : Number(row.manual_hours),
    worker_status: row.worker_status,
    admin_status: row.admin_status,
    completion_date: row.completion_date,
    admin_notes: row.admin_notes,
    priority: row.priority,
    linked_to_task_id: row.linked_to_task_id == null ? null : Number(row.linked_to_task_id),
    approved_at: row.approved_at,
    approved_by: row.approved_by,
    overdue_notified_at: row.overdue_notified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    project: row.project_id
      ? {
          id: row.project_id,
          code: row.project_code ?? "",
          name: row.project_name,
          is_archived: row.project_is_archived ?? false,
          created_at: row.project_created_at ?? "",
        }
      : undefined,
    job_type: row.job_type_id ? { id: row.job_type_id, name: row.job_type_name ?? "" } : undefined,
    job_sub_type: row.job_sub_type_id
      ? { id: row.job_sub_type_id, job_type_id: row.job_type_id, name: row.job_sub_type_name ?? "" }
      : undefined,
    zone: row.zone_id ? { id: row.zone_id, project_id: row.project_id, name: row.zone_name ?? "" } : undefined,
    assigned_user: userJoin(
      row.assigned_user_id,
      row.assigned_user_display_name,
      row.assigned_user_email,
      row.assigned_user_photo_url
    ),
    assigned_by_user: userJoin(
      row.assigned_by_user_id,
      row.assigned_by_user_display_name,
      row.assigned_by_user_email,
      row.assigned_by_user_photo_url
    ),
    approved_by_user: userJoin(
      row.approved_by_user_id,
      row.approved_by_user_display_name,
      row.approved_by_user_email,
      row.approved_by_user_photo_url
    ),
  }
}

export function mapTaskSummaryRow(row: TaskSummaryRpcRow | null | undefined): TaskSummary {
  return {
    total: Number(row?.total_count ?? 0),
    by_status: row?.by_status ?? {},
    active_timer_count: Number(row?.active_timer_count ?? 0),
    overdue_count: Number(row?.overdue_count ?? 0),
    updated_today_count: Number(row?.updated_today_count ?? 0),
    total_duration_seconds: Number(row?.total_duration_seconds ?? 0),
  }
}
