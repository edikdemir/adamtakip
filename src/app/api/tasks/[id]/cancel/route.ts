import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { ADMIN_STATUS } from "@/lib/constants"
import { notifyTaskCancelled } from "@/lib/notifications/create-notification"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req)
  if (user instanceof NextResponse) return user

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const reason: string | undefined = body.reason

  const supabase = createServerClient()

  const { data: task } = await supabase
    .from("tasks")
    .select("id, assigned_to, drawing_no, admin_status, timer_started_at, total_elapsed_seconds")
    .eq("id", id)
    .single()

  if (!task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })

  if (task.admin_status === ADMIN_STATUS.IPTAL) {
    return NextResponse.json({ error: "Görev zaten iptal edilmiş" }, { status: 400 })
  }

  // Stop running timer if any
  let totalElapsed = task.total_elapsed_seconds
  if (task.timer_started_at) {
    const startTime = new Date(task.timer_started_at).getTime()
    totalElapsed += Math.max(0, (Date.now() - startTime) / 1000)
  }

  const { data: updatedTask, error } = await supabase
    .from("tasks")
    .update({
      admin_status: ADMIN_STATUS.IPTAL,
      timer_started_at: null,
      total_elapsed_seconds: totalElapsed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (reason) {
    await supabase.from("task_comments").insert({
      task_id: parseInt(id),
      user_id: user.id,
      body: `🚫 İptal Sebebi: ${reason}`,
    })
  }

  if (task.assigned_to) {
    notifyTaskCancelled(task.assigned_to, parseInt(id), task.drawing_no, reason).catch(console.error)
  }

  return NextResponse.json({ data: updatedTask })
}
