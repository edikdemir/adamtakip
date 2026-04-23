import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { getReportDate, isReportDateInRange } from "@/lib/reports/report-date"

function normalizeFilter(value: string | null) {
  return value && value !== "all" ? value : null
}

export async function GET(req: NextRequest) {
  const result = await requireAdmin(req)
  if (result instanceof NextResponse) return result

  const { searchParams } = new URL(req.url)
  const from         = searchParams.get("from")
  const to           = searchParams.get("to")
  const projectId    = normalizeFilter(searchParams.get("project_id"))
  const userId       = normalizeFilter(searchParams.get("user_id"))
  const jobTypeId    = normalizeFilter(searchParams.get("job_type_id"))
  const adminStatus  = searchParams.get("admin_status") ?? "all"

  const supabase = createServerClient()

  let query = supabase
    .from("tasks")
    .select(`
      id, drawing_no, total_elapsed_seconds, manual_hours,
      admin_status, worker_status, completion_date, approved_at, planned_end, planned_start,
      assigned_user:users!assigned_to(id, display_name, email),
      project:projects(id, code, name),
      job_type:job_types(id, name),
      job_sub_type:job_sub_types(id, name)
    `)
    .not("assigned_to", "is", null)

  if (projectId)    query = query.eq("project_id", projectId)
  if (userId)       query = query.eq("assigned_to", userId)
  if (jobTypeId)    query = query.eq("job_type_id", jobTypeId)
  if (adminStatus !== "all") query = query.eq("admin_status", adminStatus)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filteredData = (data ?? [])
    .filter((task) => isReportDateInRange(task, from, to))
    .sort((first, second) => (getReportDate(first) ?? "").localeCompare(getReportDate(second) ?? ""))

  return NextResponse.json({ data: filteredData })
}
