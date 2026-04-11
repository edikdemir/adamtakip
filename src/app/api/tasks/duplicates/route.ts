import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth/middleware-auth"
import { createServerClient } from "@/lib/supabase/server"

const duplicateTaskSchema = z.object({
  project_id: z.string().guid(),
  job_sub_type_id: z.string().guid(),
  drawing_no: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

const duplicateSchema = z.object({
  tasks: z.array(duplicateTaskSchema).min(1).max(1000),
})

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("tr-TR")
}

function duplicateKey(
  projectId: string,
  drawingNo: string | null | undefined,
  location: string | null | undefined,
  jobSubTypeId: string,
  description?: string | null | undefined
) {
  const normalizedDrawingNo = normalize(drawingNo)
  const normalizedDescription = normalize(description)
  const identity = normalizedDrawingNo || `desc:${normalizedDescription}`

  return `${projectId}|${identity}|${normalize(location)}|${jobSubTypeId}`
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req)
  if (user instanceof NextResponse) {
    return user
  }

  const body = await req.json()
  const parsed = duplicateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 })
  }

  const projectIds = Array.from(new Set(parsed.data.tasks.map((task) => task.project_id)))
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("tasks")
    .select("project_id, drawing_no, location, job_sub_type_id, description")
    .in("project_id", projectIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const existingKeys = new Set(
    (data ?? []).map((task) =>
      duplicateKey(task.project_id, task.drawing_no, task.location, task.job_sub_type_id, task.description)
    )
  )

  const duplicateKeys = parsed.data.tasks
    .map((task) =>
      duplicateKey(task.project_id, task.drawing_no, task.location, task.job_sub_type_id, task.description)
    )
    .filter((key) => existingKeys.has(key))

  return NextResponse.json({ data: { duplicate_keys: [...new Set(duplicateKeys)] } })
}
