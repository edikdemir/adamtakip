import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const supabase = createServerClient()

  const { count, error: countErr } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("zone_id", id)
  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 })

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `${count} görevde kullanılıyor, önce o görevleri güncelleyin` },
      { status: 409 },
    )
  }

  const { error } = await supabase.from("zones").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
