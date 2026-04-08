import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { z } from "zod"

const createSchema = z.object({
  job_sub_type_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
})

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("job_work_items")
    .insert(parsed.data)
    .select("id, job_sub_type_id, name, sort_order")
    .single()

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Bu iş kalemi zaten var" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
