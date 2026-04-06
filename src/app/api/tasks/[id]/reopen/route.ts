import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { ADMIN_STATUS } from "@/lib/constants"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req)
  if (user instanceof NextResponse) return user

  const { id } = await params
  const supabase = createServerClient()

  const { data: task } = await supabase
    .from("tasks")
    .select("id, assigned_to, admin_status")
    .eq("id", id)
    .single()

  if (!task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })

  if (task.admin_status !== ADMIN_STATUS.IPTAL) {
    return NextResponse.json({ error: "Yalnızca iptal edilmiş görev tekrar açılabilir" }, { status: 400 })
  }

  const newStatus = task.assigned_to ? ADMIN_STATUS.ATANDI : ADMIN_STATUS.HAVUZDA

  const { data: updatedTask, error } = await supabase
    .from("tasks")
    .update({
      admin_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: updatedTask })
}
