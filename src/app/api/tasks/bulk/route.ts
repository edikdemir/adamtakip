import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { z } from "zod"

const emptyToUndefined = z.literal("").transform(() => undefined)

const taskSchema = z.object({
  project_id: z.string().guid(),
  job_type_id: z.string().guid(),
  job_sub_type_id: z.string().guid(),
  zone_id: z.union([emptyToUndefined, z.string().guid()]).optional(),
  location: z.union([emptyToUndefined, z.string()]).optional(),
  drawing_no: z.string().min(1),
  description: z.string().min(1),
  planned_start: z.union([emptyToUndefined, z.string()]).optional(),
  planned_end: z.union([emptyToUndefined, z.string()]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  admin_notes: z.union([emptyToUndefined, z.string()]).optional(),
})

const bulkSchema = z.object({
  tasks: z.array(taskSchema).min(1).max(1000),
})

function dupKey(project_id: string, drawing_no: string, location: string | null, job_sub_type_id: string): string {
  return `${project_id}|${drawing_no.toLowerCase().trim()}|${(location ?? "").toLowerCase().trim()}|${job_sub_type_id}`
}

export async function POST(req: NextRequest) {
  const result = await requireAdmin(req)
  if (result instanceof NextResponse) return result

  const body = await req.json()
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createServerClient()
  const incoming = parsed.data.tasks

  // Race-condition guard: aynı tuple DB'de varsa filtrele
  const projectIds = Array.from(new Set(incoming.map((t) => t.project_id)))
  const { data: existing, error: existingErr } = await supabase
    .from("tasks")
    .select("project_id, drawing_no, location, job_sub_type_id")
    .in("project_id", projectIds)

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 })
  }

  const existingKeys = new Set<string>()
  for (const e of existing || []) {
    existingKeys.add(dupKey(e.project_id, e.drawing_no, e.location ?? null, e.job_sub_type_id))
  }

  const toInsert: typeof incoming = []
  let skipped = 0
  for (const t of incoming) {
    const key = dupKey(t.project_id, t.drawing_no, t.location ?? null, t.job_sub_type_id)
    if (existingKeys.has(key)) {
      skipped++
      continue
    }
    existingKeys.add(key) // batch içinde tekrarı da koru
    toInsert.push(t)
  }

  let inserted = 0
  const errors: Array<{ index: number; message: string }> = []

  if (toInsert.length > 0) {
    const { data: insertedRows, error: insertErr } = await supabase
      .from("tasks")
      .insert(toInsert)
      .select("id")

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message, inserted: 0, skipped_duplicates: skipped, errors: [] },
        { status: 500 }
      )
    }
    inserted = insertedRows?.length || 0
  }

  return NextResponse.json({
    inserted,
    skipped_duplicates: skipped,
    errors,
  })
}
