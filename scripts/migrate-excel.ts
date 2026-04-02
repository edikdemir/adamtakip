/**
 * Excel → Supabase Migrasyon Scripti
 *
 * Kullanım:
 *   npx tsx scripts/migrate-excel.ts
 *
 * Gereksinimler:
 *   npm install --save-dev tsx exceljs @supabase/supabase-js
 *   .env.local dosyasında NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı
 *
 * NOT: Supabase'de önce "Eray" adında bir kullanıcı kaydı oluşturulmalıdır.
 * Super admin olarak girip /admin/users sayfasından kullanıcıya görev atanabilir.
 * Bu script yalnızca işHavuzu (task pool) verilerini taşır.
 */

import ExcelJS from "exceljs"
import { createClient } from "@supabase/supabase-js"
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const EXCEL_PATH = path.join(process.cwd(), "Celik_Techiz_İs_Listesi.xlsm")

async function upsertProject(code: string) {
  const { data, error } = await supabase
    .from("projects")
    .upsert({ code, name: `${code} - Gemi İnşa Projesi` }, { onConflict: "code" })
    .select("id")
    .single()
  if (error) throw new Error(`Project upsert failed: ${error.message}`)
  return data.id
}

async function upsertJobType(name: string) {
  const { data, error } = await supabase
    .from("job_types")
    .upsert({ name }, { onConflict: "name" })
    .select("id")
    .single()
  if (error) throw new Error(`JobType upsert failed: ${error.message}`)
  return data.id
}

async function upsertJobSubType(jobTypeId: string, name: string) {
  const { data, error } = await supabase
    .from("job_sub_types")
    .upsert({ job_type_id: jobTypeId, name }, { onConflict: "job_type_id,name" })
    .select("id")
    .single()
  if (error) throw new Error(`JobSubType upsert failed: ${error.message}`)
  return data.id
}

async function findUserByName(name: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .ilike("display_name", `%${name}%`)
    .limit(1)
    .single()
  return data?.id ?? null
}

function parseDate(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  if (typeof val === "string" && val.trim()) {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  return null
}

function parseTime(val: unknown): number {
  // Excel time values are stored as fractions of a day
  if (typeof val === "number") return Math.round(val * 86400)
  if (val instanceof Date) {
    return val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds()
  }
  return 0
}

async function migrate() {
  console.log("📂 Excel dosyası okunuyor:", EXCEL_PATH)

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(EXCEL_PATH)

  // ── Read İşHavuzu sheet ──
  const ws = wb.getWorksheet("İşHavuzu")
  if (!ws) throw new Error("İşHavuzu sheet bulunamadı")

  // Collect unique values
  const projects = new Set<string>()
  const jobTypes = new Map<string, Set<string>>() // jobType -> Set<subType>
  const assignees = new Set<string>()

  const rows: Record<string, unknown>[] = []

  ws.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return // Skip header

    const id = row.getCell(1).value as number
    const project = String(row.getCell(2).value || "").trim()
    const jobType = String(row.getCell(3).value || "").trim()
    const subType = String(row.getCell(4).value || "").trim()
    const zone = String(row.getCell(5).value || "NA").trim()
    const location = String(row.getCell(6).value || "NA").trim()
    const drawingNo = String(row.getCell(7).value || "").trim()
    const description = String(row.getCell(8).value || "").trim()
    const plannedStart = parseDate(row.getCell(9).value)
    const plannedEnd = parseDate(row.getCell(10).value)
    const assignee = String(row.getCell(11).value || "").trim()
    const durationVal = row.getCell(12).value // Süre
    const adminStatus = String(row.getCell(17).value || "havuzda").trim()

    if (!project || !jobType || !drawingNo) return

    projects.add(project)
    if (!jobTypes.has(jobType)) jobTypes.set(jobType, new Set())
    if (subType) jobTypes.get(jobType)!.add(subType)
    if (assignee) assignees.add(assignee)

    rows.push({
      excel_id: id,
      project, jobType, subType, zone, location, drawingNo, description,
      plannedStart, plannedEnd, assignee, durationVal, adminStatus,
    })
  })

  console.log(`📊 ${rows.length} görev satırı bulundu`)
  console.log(`📁 Projeler: ${[...projects].join(", ")}`)
  console.log(`🔧 İş tipleri: ${[...jobTypes.keys()].join(", ")}`)
  console.log(`👤 Çalışanlar: ${[...assignees].join(", ")}`)

  // ── Upsert reference data ──
  console.log("\n⏳ Referans veriler oluşturuluyor...")

  const projectIds: Record<string, string> = {}
  for (const code of projects) {
    projectIds[code] = await upsertProject(code)
    console.log(`  ✓ Proje: ${code}`)
  }

  const jobTypeIds: Record<string, string> = {}
  const subTypeIds: Record<string, string> = {}

  for (const [jt, subs] of jobTypes.entries()) {
    jobTypeIds[jt] = await upsertJobType(jt)
    console.log(`  ✓ İş Tipi: ${jt}`)
    for (const sub of subs) {
      subTypeIds[`${jt}::${sub}`] = await upsertJobSubType(jobTypeIds[jt], sub)
      console.log(`    ✓ Alt Tip: ${sub}`)
    }
  }

  // ── Find user IDs ──
  const userIds: Record<string, string | null> = {}
  for (const name of assignees) {
    userIds[name] = await findUserByName(name)
    if (userIds[name]) {
      console.log(`  ✓ Kullanıcı bulundu: ${name} → ${userIds[name]}`)
    } else {
      console.warn(`  ⚠️  Kullanıcı bulunamadı: "${name}" — görev atanmamış olarak yüklenecek`)
    }
  }

  // ── Map admin status ──
  const statusMap: Record<string, string> = {
    "Atandı": "atandi",
    "Devam Ediyor": "devam_ediyor",
    "Tamamlandı": "tamamlandi",
    "Onaylandı": "onaylandi",
    "Tamamlandi": "tamamlandi",
    "Onaylandi": "onaylandi",
  }

  // ── Insert tasks ──
  console.log("\n⏳ Görevler yükleniyor...")
  let inserted = 0, skipped = 0

  for (const row of rows) {
    const projectId = projectIds[row.project as string]
    const jobTypeId = jobTypeIds[row.jobType as string]
    const subTypeId = subTypeIds[`${row.jobType}::${row.subType}`]

    if (!projectId || !jobTypeId || !subTypeId) {
      console.warn(`  ⚠️  Atlandı (eksik ref): ${row.drawingNo}`)
      skipped++
      continue
    }

    const assignedTo = row.assignee ? (userIds[row.assignee as string] ?? null) : null
    const elapsedSeconds = parseTime(row.durationVal)
    const adminStatus = statusMap[row.adminStatus as string] || "havuzda"
    const workerStatus = adminStatus === "tamamlandi" || adminStatus === "onaylandi" ? "bitti" : "hazir"

    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      job_type_id: jobTypeId,
      job_sub_type_id: subTypeId,
      location: row.location || "NA",
      drawing_no: row.drawingNo,
      description: row.description || (row.subType as string),
      planned_start: row.plannedStart || null,
      planned_end: row.plannedEnd || null,
      assigned_to: assignedTo,
      total_elapsed_seconds: elapsedSeconds,
      timer_started_at: null, // All timers stopped for migration
      admin_status: adminStatus,
      worker_status: workerStatus,
    })

    if (error) {
      console.error(`  ✗ Hata (${row.drawingNo}): ${error.message}`)
      skipped++
    } else {
      console.log(`  ✓ ${row.project} / ${row.drawingNo}`)
      inserted++
    }
  }

  console.log(`\n✅ Migrasyon tamamlandı: ${inserted} görev yüklendi, ${skipped} atlandı`)
}

migrate().catch((err) => {
  console.error("❌ Migrasyon hatası:", err)
  process.exit(1)
})
