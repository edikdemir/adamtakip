import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest, requireKoordinatorOrAdmin } from "@/lib/auth/middleware-auth"
import { USER_ROLES } from "@/lib/constants"
import { z } from "zod"

const createTaskSchema = z.object({
  project_id: z.string().guid(),
  job_type_id: z.string().guid(),
  job_sub_type_id: z.string().guid(),
  zone_id: z.string().guid().optional(),
  location: z.string().optional(),
  drawing_no: z.string().min(1),
  description: z.string().min(1),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  admin_notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const projectId = searchParams.get("project_id")

  let query = supabase
    .from("tasks")
    .select(`
      *,
      project:projects(id, code, name),
      job_type:job_types(id, name),
      job_sub_type:job_sub_types(id, name),
      zone:zones(id, name),
      assigned_user:users!assigned_to(id, display_name, email),
      assigned_by_user:users!assigned_by(id, display_name, email)
    `)
    .order("created_at", { ascending: false })

  // Non-admins only see their own tasks
  if (user.role === USER_ROLES.USER) {
    query = query.eq("assigned_to", user.id)
  }

  if (status) query = query.eq("admin_status", status)
  if (projectId) query = query.eq("project_id", projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const result = await requireKoordinatorOrAdmin(req)
  if (result instanceof NextResponse) return result

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
