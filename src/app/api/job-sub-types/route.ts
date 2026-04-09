import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest, requireAdmin } from "@/lib/auth/middleware-auth"
import { z } from "zod"

export async function POST(req: NextRequest) {
  const result = await requireAdmin(req)
  if (result instanceof NextResponse) return result

  const body = await req.json()
  const parsed = z.object({
    job_type_id: z.string().min(1),
    name: z.string().min(1),
    sort_order: z.number().optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase.from("job_sub_types").insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
