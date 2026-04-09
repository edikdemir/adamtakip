import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { ADMIN_STATUS } from "@/lib/constants"
import { notifyTaskAssigned } from "@/lib/notifications/create-notification"
import { sendTaskAssignedEmail } from "@/lib/email/graph-mailer"
import { z } from "zod"

const schema = z.object({ assigned_to: z.string().guid() })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req)
  if (user instanceof NextResponse) return user

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("*, project:projects(id, code, name), job_type:job_types(id, name), job_sub_type:job_sub_types(id, name)")
    .eq("id", id)
    .single()

  if (fetchError || !task) {
    return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })
  }

  const { data: assignedUser } = await supabase
    .from("users")
    .select("id, email, display_name")
    .eq("id", parsed.data.assigned_to)
    .single()

  if (!assignedUser) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })
  }

  const { data: updatedTask, error: updateError } = await supabase
    .from("tasks")
    .update({
      assigned_to: parsed.data.assigned_to,
      assigned_by: user.id,
      admin_status: ADMIN_STATUS.ATANDI,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (updateError || !updatedTask) {
    return NextResponse.json({ error: "Atama yapılamadı" }, { status: 500 })
  }

  // In-app notification + email (fire and forget)
  const projectCode = (task.project as { code: string } | null)?.code || ""
  notifyTaskAssigned(assignedUser.id, parseInt(id), task.drawing_no, projectCode).catch(console.error)
  sendTaskAssignedEmail(assignedUser as Parameters<typeof sendTaskAssignedEmail>[0], task as unknown as import("@/types/task").Task).catch(console.error)

  return NextResponse.json({ data: updatedTask })
}
