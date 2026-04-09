import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest, requireAdmin } from "@/lib/auth/middleware-auth"
import { USER_ROLES } from "@/lib/constants"
import { z } from "zod"

const emptyToUndefined = z.literal("").transform(() => undefined)

const createTaskSchema = z.object({
  project_id: z.string().guid(),
  job_type_id: z.string().guid(),
  job_sub_type_id: z.string().guid(),
  zone_id: z.union([emptyToUndefined, z.string().guid()]).optional(),
  location: z.union([emptyToUndefined, z.string()]).optional(),
  drawing_no: z.string().min(1),
  description: z.string().min(1),
  planned_start: z.union([emptyToUndefined, z.string()]).optional(),
  planned_end: z.union([emptyToUndefined, z.string()]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  admin_notes: z.union([emptyToUndefined, z.string()]).optional(),
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

  // Her kullanıcı yalnızca kendine atanan görevleri görür
  query = query.eq("assigned_to", user.id)

  if (status) query = query.eq("admin_status", status)
  if (projectId) query = query.eq("project_id", projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // linked_to_task ve linked_tasks ayrı query ile çek (self-referential join yön sorunu)
  let withLinks: typeof data = data ?? []
  if (data && data.length > 0) {
    const ids = data.map((t) => t.id)

    // 1) Bağımlı görevler: linked_to_task_id bu id listesinde olanlar
    const { data: children } = await supabase
      .from("tasks")
      .select("id, drawing_no, description, admin_status, assigned_to, linked_to_task_id")
      .in("linked_to_task_id", ids)

    // 2) Parent görevler: bu listedeki linked_to_task_id değerleri
    const parentIds = [...new Set(
      data.filter((t) => t.linked_to_task_id != null).map((t) => t.linked_to_task_id as number)
    )]
    const { data: parents } = parentIds.length > 0
      ? await supabase
          .from("tasks")
          .select("id, drawing_no, description, admin_status")
          .in("id", parentIds)
      : { data: [] }

    const parentMap = new Map((parents || []).map((p) => [p.id, p]))

    const childrenByParent = new Map<number, typeof children>()
    for (const c of children || []) {
      const arr = childrenByParent.get(c.linked_to_task_id!) || []
      arr.push(c)
      childrenByParent.set(c.linked_to_task_id!, arr)
    }

    withLinks = data.map((t) => ({
      ...t,
      linked_to_task: t.linked_to_task_id != null
        ? (parentMap.get(t.linked_to_task_id) ?? null)
        : null,
      linked_tasks: childrenByParent.get(t.id) || [],
    }))
  }

  return NextResponse.json({ data: withLinks })
}

export async function POST(req: NextRequest) {
  const result = await requireAdmin(req)
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
