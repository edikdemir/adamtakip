import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"
import { ADMIN_STATUS } from "@/lib/constants"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("id, assigned_to, timer_started_at, total_elapsed_seconds, admin_status")
    .eq("id", id)
    .single()

  if (fetchError || !task) {
    return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })
  }

  if (task.assigned_to !== user.id) {
    return NextResponse.json({ error: "Bu göreve erişim yetkiniz yok" }, { status: 403 })
  }

  if (task.timer_started_at !== null) {
    return NextResponse.json({ error: "Timer zaten çalışıyor" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const newAdminStatus =
    task.admin_status === ADMIN_STATUS.ATANDI ? ADMIN_STATUS.DEVAM_EDIYOR : task.admin_status

  const { data: updatedTask, error: updateError } = await supabase
    .from("tasks")
    .update({
      timer_started_at: now,
      last_heartbeat_at: now,
      admin_status: newAdminStatus,
      updated_at: now,
    })
    .eq("id", id)
    .is("timer_started_at", null) // Optimistic lock: IS NULL
    .select()
    .single()

  if (updateError || !updatedTask) {
    return NextResponse.json({ error: "Timer başlatılamadı" }, { status: 500 })
  }

  // Log
  await supabase.from("timer_logs").insert({
    task_id: parseInt(id),
    user_id: user.id,
    action: "start",
    elapsed_at_action: task.total_elapsed_seconds,
  })

  return NextResponse.json({ data: updatedTask })
}
