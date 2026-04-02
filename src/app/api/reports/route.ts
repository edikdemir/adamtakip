import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireKoordinatorOrAdmin } from "@/lib/auth/middleware-auth"

export async function GET(req: NextRequest) {
  const result = await requireKoordinatorOrAdmin(req)
  if (result instanceof NextResponse) return result

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const supabase = createServerClient()

  let query = supabase
    .from("tasks")
    .select(`
      id, drawing_no, total_elapsed_seconds, timer_started_at,
      admin_status, worker_status, completion_date, planned_end,
      assigned_user:users!assigned_to(id, display_name, email),
      project:projects(code, name),
      job_sub_type:job_sub_types(name)
    `)
    .not("assigned_to", "is", null)

  if (from) query = query.gte("planned_start", from)
  if (to) query = query.lte("planned_end", to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by user
  const byUser: Record<string, { user: { id: string; display_name: string; email: string }; tasks: typeof data; totalHours: number }> = {}

  for (const task of data || []) {
    const u = (Array.isArray(task.assigned_user) ? task.assigned_user[0] : task.assigned_user) as { id: string; display_name: string; email: string } | null
    if (!u) continue
    if (!byUser[u.id]) byUser[u.id] = { user: u, tasks: [], totalHours: 0 }
    byUser[u.id].tasks.push(task)
    byUser[u.id].totalHours += task.total_elapsed_seconds / 3600
  }

  return NextResponse.json({ data: Object.values(byUser) })
}
