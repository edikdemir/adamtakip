import type {
  Lookups,
  ParsedRow,
  ParseResult,
  ParsedRowFields,
  ParsedRowDisplay,
  RowStatus,
} from "./types"

const HEADER_ALIASES: Record<string, string[]> = {
  project_code: ["proje kodu", "proje", "project code", "project"],
  job_type: ["is tipi", "iş tipi", "job type"],
  job_sub_type: ["is alt tipi", "iş alt tipi", "alt tip", "job sub type"],
  zone: ["zone", "bolge", "bölge"],
  location: ["mahal", "lokasyon", "location"],
  drawing_no: ["resim no", "cizim no", "çizim no", "drawing no", "drawing number"],
  description: ["yapilacak is", "yapılacak iş", "aciklama", "açıklama", "description"],
  planned_start: ["baslama tarihi", "başlama tarihi", "baslangic", "başlangıç", "planlanan baslangic", "start date"],
  planned_end: ["hedef bitis tarihi", "hedef bitiş tarihi", "bitis tarihi", "bitiş tarihi", "end date", "due date"],
  priority: ["oncelik", "öncelik", "priority"],
  admin_notes: ["notlar", "not", "notes", "aciklama notu"],
}

const PRIORITY_MAP: Record<string, "low" | "medium" | "high" | "urgent"> = {
  dusuk: "low", düşük: "low", low: "low",
  orta: "medium", normal: "medium", medium: "medium",
  yuksek: "high", yüksek: "high", high: "high",
  acil: "urgent", urgent: "urgent",
}

function normalize(s: unknown): string {
  if (s == null) return ""
  return String(s).trim().toLocaleLowerCase("tr-TR")
}

function findHeaderIndex(headers: string[], key: keyof typeof HEADER_ALIASES): number {
  const aliases = HEADER_ALIASES[key]
  return headers.findIndex((h) => aliases.includes(normalize(h)))
}

function toIsoDate(value: unknown): { ok: true; iso?: string } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true, iso: undefined }
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return { ok: false, error: "geçersiz tarih" }
    return { ok: true, iso: value.toISOString().split("T")[0] }
  }
  const s = String(value).trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: true, iso: s }
  // DD.MM.YYYY veya DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return { ok: true, iso: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}` }
  }
  // Excel serial number
  const num = Number(s)
  if (!isNaN(num) && num > 25569 && num < 2958465) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000))
    return { ok: true, iso: date.toISOString().split("T")[0] }
  }
  return { ok: false, error: "tarih formatı tanınmadı (YYYY-MM-DD veya DD.MM.YYYY)" }
}

function dupKey(
  project_id: string,
  drawing_no: string,
  location: string | null | undefined,
  job_sub_type_id: string
): string {
  return `${project_id}|${normalize(drawing_no)}|${normalize(location ?? "")}|${job_sub_type_id}`
}

export async function parseTasksXlsx(file: File, lookups: Lookups): Promise<ParseResult> {
  if (file.size > 5 * 1024 * 1024) {
    return { rows: [], fileError: "Dosya 5MB'tan büyük olamaz" }
  }

  // Dynamic import — sadece dialog açıldığında bundle yüklenir
  const XLSX = await import("xlsx")

  const buffer = await file.arrayBuffer()
  let workbook: import("xlsx").WorkBook
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  } catch (e) {
    return { rows: [], fileError: `Dosya okunamadı: ${(e as Error).message}` }
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { rows: [], fileError: "Excel dosyasında sayfa bulunamadı" }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" })

  if (rows.length < 2) {
    return { rows: [], fileError: "Dosyada veri yok (en az 1 başlık + 1 satır gerekli)" }
  }

  const headers = (rows[0] as unknown[]).map((c) => String(c ?? ""))
  const idx = {
    project_code: findHeaderIndex(headers, "project_code"),
    job_type: findHeaderIndex(headers, "job_type"),
    job_sub_type: findHeaderIndex(headers, "job_sub_type"),
    zone: findHeaderIndex(headers, "zone"),
    location: findHeaderIndex(headers, "location"),
    drawing_no: findHeaderIndex(headers, "drawing_no"),
    description: findHeaderIndex(headers, "description"),
    planned_start: findHeaderIndex(headers, "planned_start"),
    planned_end: findHeaderIndex(headers, "planned_end"),
    priority: findHeaderIndex(headers, "priority"),
    admin_notes: findHeaderIndex(headers, "admin_notes"),
  }

  const missing: string[] = []
  if (idx.project_code < 0) missing.push("Proje Kodu")
  if (idx.job_type < 0) missing.push("İş Tipi")
  if (idx.job_sub_type < 0) missing.push("İş Alt Tipi")
  if (idx.drawing_no < 0) missing.push("Resim No")
  if (idx.description < 0) missing.push("Yapılacak İş")
  if (missing.length > 0) {
    return { rows: [], fileError: `Eksik zorunlu kolon başlıkları: ${missing.join(", ")}` }
  }

  const dataRows = rows.slice(1)
  if (dataRows.length > 1000) {
    return { rows: [], fileError: `1000 satır limiti aşıldı (${dataRows.length} satır bulundu)` }
  }

  // Lookup map'leri kur
  const projectByCode = new Map<string, { id: string; code: string }>()
  for (const p of lookups.projects) projectByCode.set(normalize(p.code), { id: p.id, code: p.code })

  const jobTypeByName = new Map<string, { id: string; name: string; subs: Map<string, string> }>()
  for (const jt of lookups.jobTypes) {
    const subs = new Map<string, string>()
    for (const st of jt.job_sub_types || []) subs.set(normalize(st.name), st.id)
    jobTypeByName.set(normalize(jt.name), { id: jt.id, name: jt.name, subs })
  }

  // Zone: project_id -> name -> id
  const zonesByProject = new Map<string, Map<string, string>>()
  for (const z of lookups.zones) {
    let inner = zonesByProject.get(z.project_id)
    if (!inner) {
      inner = new Map()
      zonesByProject.set(z.project_id, inner)
    }
    inner.set(normalize(z.name), z.id)
  }

  const dbKeys = new Set<string>()
  for (const e of lookups.existing) {
    dbKeys.add(dupKey(e.project_id, e.drawing_no, e.location, e.job_sub_type_id))
  }

  const fileKeyCount = new Map<string, number>()
  const parsed: ParsedRow[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as unknown[]
    const rowNumber = i + 2 // Excel satır numarası (1-indexed + header)
    const errors: string[] = []
    const fields: ParsedRowFields = {}
    const display: ParsedRowDisplay = {}

    const get = (col: number): string => {
      if (col < 0) return ""
      const v = row[col]
      return v == null ? "" : String(v).trim()
    }

    // Tüm satır boşsa atla
    const allEmpty = headers.every((_, c) => get(c) === "")
    if (allEmpty) continue

    // Proje
    const projectCode = get(idx.project_code)
    display.project_code = projectCode
    if (!projectCode) {
      errors.push("Proje Kodu zorunlu")
    } else {
      const proj = projectByCode.get(normalize(projectCode))
      if (!proj) errors.push(`Proje '${projectCode}' bulunamadı`)
      else fields.project_id = proj.id
    }

    // İş Tipi
    const jobTypeName = get(idx.job_type)
    display.job_type_name = jobTypeName
    let jobType: { id: string; subs: Map<string, string> } | undefined
    if (!jobTypeName) {
      errors.push("İş Tipi zorunlu")
    } else {
      jobType = jobTypeByName.get(normalize(jobTypeName))
      if (!jobType) errors.push(`İş Tipi '${jobTypeName}' bulunamadı`)
      else fields.job_type_id = jobType.id
    }

    // İş Alt Tipi (job_type'a bağlı)
    const jobSubTypeName = get(idx.job_sub_type)
    display.job_sub_type_name = jobSubTypeName
    if (!jobSubTypeName) {
      errors.push("İş Alt Tipi zorunlu")
    } else if (jobType) {
      const subId = jobType.subs.get(normalize(jobSubTypeName))
      if (!subId) errors.push(`İş Alt Tipi '${jobSubTypeName}' bu iş tipinde yok`)
      else fields.job_sub_type_id = subId
    }

    // Zone (opsiyonel, project'e bağlı)
    const zoneName = get(idx.zone)
    display.zone_name = zoneName
    if (zoneName && fields.project_id) {
      const projZones = zonesByProject.get(fields.project_id)
      const zoneId = projZones?.get(normalize(zoneName))
      if (!zoneId) errors.push(`Zone '${zoneName}' bu projede tanımlı değil`)
      else fields.zone_id = zoneId
    }

    // Mahal (opsiyonel)
    const location = get(idx.location)
    display.location = location
    if (location) fields.location = location

    // Resim No
    const drawingNo = get(idx.drawing_no)
    display.drawing_no = drawingNo
    if (!drawingNo) errors.push("Resim No zorunlu")
    else fields.drawing_no = drawingNo

    // Açıklama
    const description = get(idx.description)
    display.description = description
    if (!description) errors.push("Yapılacak İş zorunlu")
    else fields.description = description

    // Tarihler
    const startRaw = idx.planned_start >= 0 ? row[idx.planned_start] : null
    const startRes = toIsoDate(startRaw)
    if (!startRes.ok) errors.push(`Başlama Tarihi: ${startRes.error}`)
    else if (startRes.iso) {
      fields.planned_start = startRes.iso
      display.planned_start = startRes.iso
    }

    const endRaw = idx.planned_end >= 0 ? row[idx.planned_end] : null
    const endRes = toIsoDate(endRaw)
    if (!endRes.ok) errors.push(`Hedef Bitiş Tarihi: ${endRes.error}`)
    else if (endRes.iso) {
      fields.planned_end = endRes.iso
      display.planned_end = endRes.iso
    }

    // Öncelik
    const priorityRaw = get(idx.priority)
    display.priority = priorityRaw
    if (priorityRaw) {
      const p = PRIORITY_MAP[normalize(priorityRaw)]
      if (!p) errors.push(`Öncelik '${priorityRaw}' tanınmadı (Düşük/Orta/Yüksek/Acil)`)
      else fields.priority = p
    }

    // Notlar
    const notes = get(idx.admin_notes)
    if (notes) fields.admin_notes = notes

    // Status hesapla
    let status: RowStatus = "valid"
    if (errors.length > 0) {
      status = "error"
    } else if (fields.project_id && fields.drawing_no && fields.job_sub_type_id) {
      const key = dupKey(fields.project_id, fields.drawing_no, fields.location ?? null, fields.job_sub_type_id)
      if (dbKeys.has(key)) {
        status = "duplicate-db"
      } else {
        const count = fileKeyCount.get(key) ?? 0
        if (count > 0) status = "duplicate-file"
        fileKeyCount.set(key, count + 1)
      }
    }

    parsed.push({
      rowNumber,
      status,
      selected: status === "valid",
      errors,
      fields,
      display,
    })
  }

  return { rows: parsed }
}
