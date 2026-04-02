import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin(req)
  if (result instanceof NextResponse) return result

  const { id } = await params
  const supabase = createServerClient()

  const [userRes, tasksRes, timerLogsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, display_name, job_title, role, is_active, created_at")
      .eq("id", id)
      .single(),

    supabase
      .from("tasks")
      .select(`
        id, drawing_no, description, priority, admin_status, worker_status,
        total_elapsed_seconds, timer_started_at, manual_hours,
        planned_start, planned_end, completion_date, created_at, updated_at,
        project:projects(id, code, name),
        job_type:job_types(id, name),
        job_sub_type:job_sub_types(id, name),
        assigned_by_user:users!tasks_assigned_by_fkey(id, display_name, email)
      `)
      .eq("assigned_to", id)
      .order("created_at", { ascending: false }),

    supabase
      .from("timer_logs")
      .select(`
        id, task_id, action, elapsed_at_action, created_at,
        task:tasks(id, drawing_no, description, project:projects(code))
      `)
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  if (userRes.error) return NextResponse.json({ error: userRes.error.message }, { status: 404 })

  return NextResponse.json({
    data: {
      user: userRes.data,
      tasks: tasksRes.data || [],
      timer_logs: timerLogsRes.data || [],
    },
  })
}
