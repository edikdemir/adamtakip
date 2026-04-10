import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest, requireAdmin } from "@/lib/auth/middleware-auth"
import { USER_ROLES } from "@/lib/constants"
import { getDeadlineStatus } from "@/lib/utils"

const emptyToUndefined = z.literal("").transform(() => undefined)

const createTaskSchema = z.object({
  project_id: z.string().min(1),
  job_type_id: z.string().min(1),
  job_sub_type_id: z.string().min(1),
  zone_id: z.union([emptyToUndefined, z.string().min(1)]).optional(),
  location: z.string().min(1),
  drawing_no: z.string(),
  description: z.string(),
  planned_start: z.union([emptyToUndefined, z.string()]).optional(),
  planned_end: z.union([emptyToUndefined, z.string()]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  admin_notes: z.union([emptyToUndefined, z.string()]).optional(),
})

const taskListSelect = `
  *,
  project:projects(id, code, name),
  job_type:job_types(id, name),
  job_sub_type:job_sub_types(id, name),
  zone:zones(id, name),
  assigned_user:users!assigned_to(id, display_name, email, photo_url),
  assigned_by_user:users!assigned_by(id, display_name, email)
`

function parseNonNegativeNumber(value: string | null) {
  if (value == null || value.trim() === "") {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) {
    return undefined
  }

  return parsed
}

function matchesSearch(task: Record<string, unknown>, search: string) {
  const query = search.toLowerCase()
  const values = [
    task.drawing_no,
    task.description,
    task.location,
    (task.project as { code?: string } | null)?.code,
    (task.zone as { name?: string } | null)?.name,
    (task.assigned_user as { display_name?: string } | null)?.display_name,
  ]

  return values.some((value) => String(value ?? "").toLowerCase().includes(query))
}

function totalTaskHours(task: Record<string, unknown>) {
  return ((task.total_elapsed_seconds as number) ?? 0) + ((((task.manual_hours as number) ?? 0) || 0) * 3600)
}

function priorityRank(priority: unknown) {
  switch (priority) {
    case "urgent":
      return 4
    case "high":
      return 3
    case "medium":
      return 2
    case "low":
      return 1
    default:
      return 0
  }
}

function parseDateValue(value: unknown) {
  if (!value) {
    return null
  }

  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function matchesComputedFilters(
  task: Record<string, unknown>,
  filters: {
    search: string
    assignmentState: string | null
    timerState: string | null
    linkState: string | null
    deadlineState: string | null
  }
) {
  if (filters.search && !matchesSearch(task, filters.search)) {
    return false
  }

  if (filters.assignmentState === "assigned" && !task.assigned_to) {
    return false
  }

  if (filters.assignmentState === "unassigned" && task.assigned_to) {
    return false
  }

  if (filters.timerState === "running" && !task.timer_started_at) {
    return false
  }

  if (filters.timerState === "stopped" && task.timer_started_at) {
    return false
  }

  const hasLinks =
    task.linked_to_task_id != null ||
    (((task.linked_tasks as Record<string, unknown>[] | undefined) ?? []).length > 0)

  if (filters.linkState === "linked" && !hasLinks) {
    return false
  }

  if (filters.linkState === "unlinked" && hasLinks) {
    return false
  }

  if (filters.deadlineState && filters.deadlineState !== "all") {
    if (getDeadlineStatus(task.planned_end as string | null | undefined) !== filters.deadlineState) {
      return false
    }
  }

  return true
}

function sortTasks(tasks: Record<string, unknown>[], sort: string | null) {
  const rows = [...tasks]

  switch (sort) {
    case "deadline_asc":
      rows.sort((first, second) => {
        const firstDate = parseDateValue(first.planned_end)
        const secondDate = parseDateValue(second.planned_end)
        if (!firstDate && !secondDate) return 0
        if (!firstDate) return 1
        if (!secondDate) return -1
        return firstDate.getTime() - secondDate.getTime()
      })
      return rows
    case "deadline_desc":
      rows.sort((first, second) => {
        const firstDate = parseDateValue(first.planned_end)
        const secondDate = parseDateValue(second.planned_end)
        if (!firstDate && !secondDate) return 0
        if (!firstDate) return 1
        if (!secondDate) return -1
        return secondDate.getTime() - firstDate.getTime()
      })
      return rows
    case "priority_desc":
      rows.sort((first, second) => priorityRank(second.priority) - priorityRank(first.priority))
      return rows
    case "duration_desc":
      rows.sort((first, second) => totalTaskHours(second) - totalTaskHours(first))
      return rows
    case "drawing_asc":
      rows.sort((first, second) => String(first.drawing_no ?? "").localeCompare(String(second.drawing_no ?? ""), "tr"))
      return rows
    default:
      return rows
  }
}

async function attachTaskLinks(
  supabase: ReturnType<typeof createServerClient>,
  tasks: Record<string, unknown>[]
) {
  if (tasks.length === 0) {
    return tasks
  }

  const taskIds = tasks.map((task) => task.id as number)

  const { data: children } = await supabase
    .from("tasks")
    .select("id, drawing_no, description, admin_status, assigned_to, linked_to_task_id")
    .in("linked_to_task_id", taskIds)

  const parentIds = [...new Set(
    tasks
      .filter((task) => task.linked_to_task_id != null)
      .map((task) => task.linked_to_task_id as number)
  )]

  const { data: parents } = parentIds.length > 0
    ? await supabase
        .from("tasks")
        .select("id, drawing_no, description, admin_status")
        .in("id", parentIds)
    : { data: [] }

  const parentMap = new Map((parents || []).map((parent) => [parent.id, parent]))
  const childrenByParent = new Map<number, typeof children>()

  for (const child of children || []) {
    const siblings = childrenByParent.get(child.linked_to_task_id!) || []
    siblings.push(child)
    childrenByParent.set(child.linked_to_task_id!, siblings)
  }

  return tasks.map((task) => ({
    ...task,
    linked_to_task:
      task.linked_to_task_id != null ? (parentMap.get(task.linked_to_task_id as number) ?? null) : null,
    linked_tasks: childrenByParent.get(task.id as number) || [],
  }))
}

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const projectId = searchParams.get("project_id")
  const assignedTo = searchParams.get("assigned_to")
  const jobTypeId = searchParams.get("job_type_id")
  const jobSubTypeId = searchParams.get("job_sub_type_id")
  const zoneId = searchParams.get("zone_id")
  const location = searchParams.get("location")
  const priority = searchParams.get("priority")
  const assignmentState = searchParams.get("assignment_state")
  const timerState = searchParams.get("timer_state")
  const linkState = searchParams.get("link_state")
  const deadlineState = searchParams.get("deadline_state")
  const plannedStartFrom = searchParams.get("planned_start_from")
  const plannedStartTo = searchParams.get("planned_start_to")
  const plannedEndFrom = searchParams.get("planned_end_from")
  const plannedEndTo = searchParams.get("planned_end_to")
  const sort = searchParams.get("sort")
  const search = searchParams.get("search")?.trim() || ""
  const myTasks = searchParams.get("my_tasks") === "true"
  const includeLinks = searchParams.get("include_links") === "true" || linkState === "linked" || linkState === "unlinked"
  const limit = parseNonNegativeNumber(searchParams.get("limit"))
  const offset = parseNonNegativeNumber(searchParams.get("offset")) ?? 0

  let query = supabase
    .from("tasks")
    .select(taskListSelect)
    .order("created_at", { ascending: false })

  if (user.role === USER_ROLES.USER || myTasks) {
    query = query.eq("assigned_to", user.id)
  } else if (assignedTo) {
    query = query.eq("assigned_to", assignedTo)
  }

  if (status) {
    query = query.eq("admin_status", status)
  }

  if (projectId) {
    query = query.eq("project_id", projectId)
  }

  if (jobTypeId) {
    query = query.eq("job_type_id", jobTypeId)
  }

  if (jobSubTypeId) {
    query = query.eq("job_sub_type_id", jobSubTypeId)
  }

  if (zoneId) {
    query = query.eq("zone_id", zoneId)
  }

  if (location) {
    query = query.eq("location", location)
  }

  if (priority) {
    query = query.eq("priority", priority)
  }

  if (plannedStartFrom) {
    query = query.gte("planned_start", plannedStartFrom)
  }

  if (plannedStartTo) {
    query = query.lte("planned_start", plannedStartTo)
  }

  if (plannedEndFrom) {
    query = query.gte("planned_end", plannedEndFrom)
  }

  if (plannedEndTo) {
    query = query.lte("planned_end", plannedEndTo)
  }

  if (assignmentState === "assigned") {
    query = query.not("assigned_to", "is", null)
  }

  if (assignmentState === "unassigned") {
    query = query.is("assigned_to", null)
  }

  if (timerState === "running") {
    query = query.not("timer_started_at", "is", null)
  }

  if (timerState === "stopped") {
    query = query.is("timer_started_at", null)
  }

  if (search) {
    query = query.or(`drawing_no.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const withLinks = includeLinks ? await attachTaskLinks(supabase, data || []) : (data || [])
  const filtered = withLinks.filter((task) =>
    matchesComputedFilters(task, {
      search,
      assignmentState,
      timerState,
      linkState,
      deadlineState,
    })
  )
  const sorted = sortTasks(filtered, sort)
  const paginated = limit != null ? sorted.slice(offset, offset + limit) : sorted.slice(offset)

  return NextResponse.json({
    data: paginated,
    meta: {
      total: sorted.length,
      offset,
      limit: limit ?? null,
      has_more: limit != null ? offset + paginated.length < sorted.length : false,
    },
  })
}

export async function POST(req: NextRequest) {
  const result = await requireAdmin(req)
  if (result instanceof NextResponse) {
    return result
  }

  const body = await req.json()
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("tasks")
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
