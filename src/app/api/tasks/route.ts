import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest, requireAdmin } from "@/lib/auth/middleware-auth"
import { mapTaskListRow, mapTaskSummaryRow, parseTaskQuery, type TaskListRpcRow, type TaskSummaryRpcRow } from "@/lib/tasks/task-api"
import type { Task } from "@/types/task"

const emptyToUndefined = z.literal("").transform(() => undefined)

const createTaskSchema = z.object({
  project_id: z.string().min(1),
  job_type_id: z.string().min(1),
  job_sub_type_id: z.string().min(1),
  zone_id: z.union([emptyToUndefined, z.string().min(1)]).optional(),
  location: z.union([emptyToUndefined, z.string().trim().min(1)]).optional(),
  drawing_no: z.string(),
  description: z.string().trim().min(1),
  planned_start: z.union([emptyToUndefined, z.string()]).optional(),
  planned_end: z.union([emptyToUndefined, z.string()]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  admin_notes: z.union([emptyToUndefined, z.string()]).optional(),
})

async function attachTaskLinks(
  supabase: ReturnType<typeof createServerClient>,
  tasks: Task[]
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
  const parsedQuery = parseTaskQuery(searchParams, user)
  const { data, error } = await supabase.rpc("list_tasks", parsedQuery.args)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as TaskListRpcRow[]
  const mappedTasks = rows.map(mapTaskListRow)
  const tasks = parsedQuery.includeLinks ? await attachTaskLinks(supabase, mappedTasks) : mappedTasks
  let total = Number(rows[0]?.total_count ?? 0)

  if (rows.length === 0 && parsedQuery.offset > 0) {
    const { data: summary } = await supabase.rpc("task_summary", {
      ...parsedQuery.args,
      p_limit: null,
      p_offset: 0,
    })
    total = mapTaskSummaryRow(((summary ?? []) as TaskSummaryRpcRow[])[0]).total
  }

  return NextResponse.json({
    data: tasks,
    meta: {
      total,
      offset: parsedQuery.offset,
      limit: parsedQuery.limit,
      has_more: parsedQuery.limit != null ? parsedQuery.offset + tasks.length < total : false,
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
