import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"
import { USER_ROLES } from "@/lib/constants"
import { z } from "zod"

const addSchema = z.object({
  hours: z.number().positive().max(24),
  reason: z.string().min(3),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  // Only the assigned user or koordinatör/admin can view entries
  if (user.role === USER_ROLES.USER) {
    const { data: task } = await supabase
      .from("tasks")
      .select("assigned_to")
      .eq("id", id)
      .single()
    if (task?.assigned_to !== user.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from("manual_time_entries")
    .select("*, user:users(display_name, email)")
    .eq("task_id", id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("id, assigned_to, worker_status, admin_status")
    .eq("id", id)
    .single()

  if (fetchError || !task) {
    return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })
  }
  if (task.assigned_to !== user.id) {
    return NextResponse.json({ error: "Bu göreve erişim yetkiniz yok" }, { status: 403 })
  }
  if (task.admin_status === "onaylandi") {
    return NextResponse.json({ error: "Onaylanmış göreve manuel süre eklenemez" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 })
  }

  const { hours, reason } = parsed.data

  const { data: entry, error: insertError } = await supabase
    .from("manual_time_entries")
    .insert({ task_id: parseInt(id), user_id: user.id, hours, reason })
    .select()
    .single()

  if (insertError || !entry) {
    return NextResponse.json({ error: "Manuel süre eklenemedi" }, { status: 500 })
  }

  // Update denormalized manual_hours on task
  await supabase.rpc("increment_manual_hours", { p_task_id: parseInt(id), p_hours: hours })

  return NextResponse.json({ data: entry }, { status: 201 })
}
