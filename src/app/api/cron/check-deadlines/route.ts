import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { ADMIN_STATUS, USER_ROLES } from "@/lib/constants"
import { notifyDeadlineWarning } from "@/lib/notifications/create-notification"
import { sendOverdueEmail } from "@/lib/email/graph-mailer"
import { TASK_EMAIL_SELECT, toEmailUser, toTaskEmailPayload } from "@/lib/email/task-email-payload"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const supabase = createServerClient()
  const today = new Date().toISOString().split("T")[0]

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`
      ${TASK_EMAIL_SELECT},
      assigned_user:users!assigned_to(id, email, display_name)
    `)
    .lt("planned_end", today)
    .not("admin_status", "in", `(${ADMIN_STATUS.ONAYLANDI},${ADMIN_STATUS.IPTAL})`)
    .or(`overdue_notified_at.is.null,overdue_notified_at.lt.${today}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: admins } = await supabase
    .from("users")
    .select("id, email, display_name")
    .eq("role", USER_ROLES.SUPER_ADMIN)
    .eq("is_active", true)

  let notified = 0
  const checked = tasks?.length || 0

  for (const task of tasks || []) {
    const t = toTaskEmailPayload(task)
    const assignedUser = toEmailUser(task.assigned_user)
    const dueDate = new Date(t.planned_end!)
    const daysOverdue = Math.max(1, Math.floor((Date.now() - dueDate.getTime()) / 86400000))

    const userOnly = t.admin_status !== ADMIN_STATUS.TAMAMLANDI

    // Notify assigned user (only if not already submitted for approval)
    if (userOnly && assignedUser) {
      notifyDeadlineWarning(assignedUser.id, t.id, t.drawing_no, daysOverdue).catch(console.error)
      sendOverdueEmail(assignedUser.email, assignedUser.display_name, t, daysOverdue, "user").catch(console.error)
    }

    // Notify all super_admins
    if (admins) {
      for (const admin of admins) {
        notifyDeadlineWarning(admin.id, t.id, t.drawing_no, daysOverdue).catch(console.error)
        sendOverdueEmail(admin.email, admin.display_name, t, daysOverdue, "admin").catch(console.error)
      }
    }

    await supabase.from("tasks").update({ overdue_notified_at: today }).eq("id", t.id)
    notified++
  }

  return NextResponse.json({ checked, notified })
}
