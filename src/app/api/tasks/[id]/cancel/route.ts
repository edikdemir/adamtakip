import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { ADMIN_STATUS } from "@/lib/constants"
import { sendTaskCancelledEmail } from "@/lib/email/graph-mailer"
import { notifyTaskCancelled } from "@/lib/notifications/create-notification"
import { TASK_EMAIL_SELECT, toTaskEmailPayload } from "@/lib/email/task-email-payload"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req)
  if (user instanceof NextResponse) return user

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const reason: string | undefined = body.reason

  const supabase = createServerClient()

  const { data: task } = await supabase
    .from("tasks")
    .select(`
      ${TASK_EMAIL_SELECT},
      assigned_to,
      timer_started_at
    `)
    .eq("id", id)
    .single()

  if (!task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })

  if (task.admin_status === ADMIN_STATUS.IPTAL) {
    return NextResponse.json({ error: "Görev zaten iptal edilmiş" }, { status: 400 })
  }

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
    await supabase.from("task_notes").insert({
      task_id: parseInt(id),
      user_id: user.id,
      content: `İptal Sebebi: ${reason}`,
    })
  }

  if (task.assigned_to) {
    const { data: assignedUser } = await supabase
      .from("users")
      .select("id, email, display_name")
      .eq("id", task.assigned_to)
      .single()

    notifyTaskCancelled(task.assigned_to, parseInt(id), task.drawing_no, reason).catch(console.error)

    if (assignedUser) {
      sendTaskCancelledEmail(
        assignedUser,
        toTaskEmailPayload(task, { admin_status: ADMIN_STATUS.IPTAL, total_elapsed_seconds: totalElapsed }),
        reason
      ).catch(console.error)
    }
  }

  return NextResponse.json({ data: updatedTask })
}
