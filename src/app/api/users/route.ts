import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"

export async function GET(req: NextRequest) {
  const result = await requireAdmin(req)
  if (result instanceof NextResponse) return result

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, email, display_name, job_title, role, is_active, photo_url, created_at, last_seen_at")
    .order("display_name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
