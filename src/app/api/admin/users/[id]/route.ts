import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"

type TaskWithLinks = {
  id: number
  linked_to_task_id: number | null
  [key: string]: unknown
}

async function attachTaskLinks(
  supabase: ReturnType<typeof createServerClient>,
  tasks: TaskWithLinks[]
) {
  if (tasks.length === 0) {
    return tasks
  }

  const taskIds = tasks.map((task) => task.id)

  const { data: children, error: childrenError } = await supabase
    .from("tasks")
    .select("id, drawing_no, description, admin_status, assigned_to, linked_to_task_id")
    .in("linked_to_task_id", taskIds)

  if (childrenError) {
    return tasks
  }

  const parentIds = [
    ...new Set(tasks.map((task) => task.linked_to_task_id).filter((value): value is number => value != null)),
  ]

  const { data: parents, error: parentsError } =
    parentIds.length > 0
      ? await supabase
          .from("tasks")
          .select("id, drawing_no, description, admin_status")
          .in("id", parentIds)
      : { data: [], error: null }

  if (parentsError) {
    return tasks
  }

  const parentMap = new Map((parents || []).map((parent) => [parent.id, parent]))
  const childrenByParent = new Map<number, typeof children>()

  for (const child of children || []) {
    const siblings = childrenByParent.get(child.linked_to_task_id!) || []
    siblings.push(child)
    childrenByParent.set(child.linked_to_task_id!, siblings)
  }

  return tasks.map((task) => ({
    ...task,
    linked_to_task: task.linked_to_task_id != null ? (parentMap.get(task.linked_to_task_id) ?? null) : null,
    linked_tasks: childrenByParent.get(task.id) || [],
  }))
}

const userDetailTaskSelect = `
  id,
  project_id,
  job_type_id,
  job_sub_type_id,
  zone_id,
  location,
  drawing_no,
  description,
  planned_start,
  planned_end,
  assigned_to,
  assigned_by,
  total_elapsed_seconds,
  timer_started_at,
  manual_hours,
  worker_status,
  admin_status,
  completion_date,
  admin_notes,
  priority,
  linked_to_task_id,
  approved_at,
  approved_by,
  overdue_notified_at,
  created_at,
  updated_at,
  project:projects(id, code, name),
  job_type:job_types(id, name),
  job_sub_type:job_sub_types(id, name),
  zone:zones(id, name),
  assigned_user:users!assigned_to(id, display_name, email, photo_url),
  assigned_by_user:users!assigned_by(id, display_name, email, photo_url),
  approved_by_user:users!approved_by(id, display_name, email, photo_url)
`

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin(req)
  if (result instanceof NextResponse) return result

  const { id } = await params
  const supabase = createServerClient()

  const [userRes, tasksRes, timerLogsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, display_name, photo_url, job_title, role, is_active, created_at")
      .eq("id", id)
      .single(),

    supabase
      .from("tasks")
      .select(userDetailTaskSelect)
      .eq("assigned_to", id)
      .order("created_at", { ascending: false }),

    supabase
      .from("timer_logs")
      .select(`
        id,
        task_id,
        action,
        elapsed_at_action,
        created_at,
        task:tasks(id, drawing_no, description, project:projects(code))
      `)
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  if (userRes.error) {
    return NextResponse.json({ error: userRes.error.message }, { status: 404 })
  }

  if (tasksRes.error) {
    return NextResponse.json({ error: tasksRes.error.message }, { status: 500 })
  }

  if (timerLogsRes.error) {
    return NextResponse.json({ error: timerLogsRes.error.message }, { status: 500 })
  }

  const tasksWithLinks = await attachTaskLinks(supabase, (tasksRes.data || []) as TaskWithLinks[])

  return NextResponse.json({
    data: {
      user: userRes.data,
      tasks: tasksWithLinks,
      timer_logs: timerLogsRes.data || [],
    },
  })
}
