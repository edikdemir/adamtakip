import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { ADMIN_STATUS, WORKER_STATUS } from "@/lib/constants"
import { notifyTaskRejected } from "@/lib/notifications/create-notification"
import { sendTaskRejectedEmail } from "@/lib/email/graph-mailer"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req)
  if (user instanceof NextResponse) return user

  const { id } = await params
  const body = await req.json()
  const reason: string | undefined = body.reason

  const supabase = createServerClient()

  const { data: task } = await supabase
    .from("tasks")
    .select("*, assigned_user:users!assigned_to(id, email, display_name)")
    .eq("id", id)
    .single()

  if (!task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })

  const { data: updatedTask } = await supabase
    .from("tasks")
    .update({
      admin_status: ADMIN_STATUS.ATANDI,
      worker_status: WORKER_STATUS.HAZIR,
      completion_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  // Add rejection reason as comment
  if (reason) {
    await supabase.from("task_comments").insert({
      task_id: parseInt(id),
      user_id: user.id,
      body: `🔄 Revize Sebebi: ${reason}`,
    })
  }

  if (task.assigned_to) {
    const assignedUser = task.assigned_user as { id: string; email: string; display_name: string } | null
    if (assignedUser) {
      notifyTaskRejected(assignedUser.id, parseInt(id), task.drawing_no, reason).catch(console.error)
      sendTaskRejectedEmail(assignedUser as Parameters<typeof sendTaskRejectedEmail>[0], updatedTask || task, reason).catch(console.error)
    }
  }

  return NextResponse.json({ data: updatedTask })
}
