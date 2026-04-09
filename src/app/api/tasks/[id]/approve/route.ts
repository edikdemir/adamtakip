import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { ADMIN_STATUS } from "@/lib/constants"
import { notifyTaskApproved } from "@/lib/notifications/create-notification"
import { sendTaskApprovedEmail } from "@/lib/email/graph-mailer"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req)
  if (user instanceof NextResponse) return user

  const { id } = await params
  const supabase = createServerClient()

  const { data: task } = await supabase
    .from("tasks")
    .select(`
      *,
      project:projects(id, code, name),
      job_type:job_types(id, name),
      job_sub_type:job_sub_types(id, name),
      assigned_user:users!assigned_to(id, email, display_name)
    `)
    .eq("id", id)
    .single()

  if (!task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })

  const { data: updatedTask } = await supabase
    .from("tasks")
    .update({
      admin_status: ADMIN_STATUS.ONAYLANDI,
      approved_at: new Date().toISOString().split("T")[0],
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (task.assigned_to) {
    const assignedUser = task.assigned_user as { id: string; email: string; display_name: string } | null
    if (assignedUser) {
      notifyTaskApproved(assignedUser.id, parseInt(id), task.drawing_no).catch(console.error)
      sendTaskApprovedEmail(assignedUser as Parameters<typeof sendTaskApprovedEmail>[0], { ...task, approved_at: updatedTask?.approved_at ?? task.approved_at } as unknown as import("@/types/task").Task).catch(console.error)
    }
  }

  return NextResponse.json({ data: updatedTask })
}
