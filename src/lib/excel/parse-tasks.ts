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
  project_name: ["proje adi", "proje adı", "project name"],
  job_type: ["is tipi", "iş tipi", "job type"],
  job_sub_type: ["is alt tipi", "iş alt tipi", "alt tip", "job sub type"],
  zone: ["zone", "bolge", "bölge"],
  location: ["mahal", "yapilacak alan", "yapılacak alan", "lokasyon", "location"],
  drawing_no: ["resim no", "cizim no", "çizim no", "drawing no", "drawing number"],
  description: ["yapilacak is", "yapılacak iş", "aciklama", "açıklama", "description"],
  planned_start: ["baslama tarihi", "başlama tarihi", "baslangic", "başlangıç", "planlanan baslangic", "start date"],
  planned_end: ["termin", "hedef bitis tarihi", "hedef bitiş tarihi", "bitis tarihi", "bitiş tarihi", "end date", "due date"],
  priority: ["oncelik", "öncelik", "priority"],
  admin_notes: ["notlar", "not", "notes", "aciklama notu"],
}

const PRIORITY_MAP: Record<string, "low" | "medium" | "high" | "urgent"> = {
  dusuk: "low",
  düşük: "low",
  low: "low",
  orta: "medium",
  normal: "medium",
  medium: "medium",
  yuksek: "high",
  yüksek: "high",
  high: "high",
  acil: "urgent",
  urgent: "urgent",
}

function normalize(value: unknown): string {
  if (value == null) return ""
  return String(value).trim().toLocaleLowerCase("tr-TR")
}

function findHeaderIndex(headers: string[], key: keyof typeof HEADER_ALIASES): number {
  const aliases = HEADER_ALIASES[key]
  return headers.findIndex((header) => aliases.includes(normalize(header)))
}

function toIsoDate(value: unknown): { ok: true; iso?: string } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true, iso: undefined }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { ok: false, error: "geçersiz tarih" }
    return { ok: true, iso: value.toISOString().split("T")[0] }
  }

  const stringValue = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) return { ok: true, iso: stringValue }

  const match = stringValue.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return {
      ok: true,
      iso: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    }
  }

  const numericValue = Number(stringValue)
  if (!Number.isNaN(numericValue) && numericValue > 25569 && numericValue < 2958465) {
    const date = new Date(Math.round((numericValue - 25569) * 86400 * 1000))
    return { ok: true, iso: date.toISOString().split("T")[0] }
  }

  return { ok: false, error: "tarih formatı tanınmadı (YYYY-MM-DD veya DD.MM.YYYY)" }
}

function dupKey(
  project_id: string,
  drawing_no: string,
  location: string | null | undefined,
  job_sub_type_id: string,
  description?: string | null | undefined
): string {
  const normalizedDrawingNo = normalize(drawing_no)
  const normalizedDescription = normalize(description ?? "")
  const identity = normalizedDrawingNo || `desc:${normalizedDescription}`

  return `${project_id}|${identity}|${normalize(location ?? "")}|${job_sub_type_id}`
}

export async function parseTasksXlsx(file: File, lookups: Lookups): Promise<ParseResult> {
  if (file.size > 5 * 1024 * 1024) {
    return { rows: [], fileError: "Dosya 5MB'tan büyük olamaz" }
  }

  const XLSX = await import("xlsx")

  const buffer = await file.arrayBuffer()
  let workbook: import("xlsx").WorkBook
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  } catch (error) {
    return { rows: [], fileError: `Dosya okunamadı: ${(error as Error).message}` }
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { rows: [], fileError: "Excel dosyasında sayfa bulunamadı" }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" })

  if (rows.length < 2) {
    return { rows: [], fileError: "Dosyada veri yok (en az 1 başlık + 1 satır gerekli)" }
  }

  const headers = (rows[0] as unknown[]).map((cell) => String(cell ?? ""))
  const idx = {
    project_code: findHeaderIndex(headers, "project_code"),
    project_name: findHeaderIndex(headers, "project_name"),
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
  if (idx.project_name < 0) missing.push("Proje Adı")
  if (idx.job_type < 0) missing.push("İş Tipi")
  if (idx.job_sub_type < 0) missing.push("İş Alt Tipi")
  if (idx.description < 0) missing.push("Yapılacak İş")

  if (missing.length > 0) {
    return { rows: [], fileError: `Eksik zorunlu kolon başlıkları: ${missing.join(", ")}` }
  }

  const dataRows = rows.slice(1)
  if (dataRows.length > 1000) {
    return { rows: [], fileError: `1000 satır limiti aşıldı (${dataRows.length} satır bulundu)` }
  }

  const projectByCode = new Map<string, { id: string; code: string; name: string }>()
  for (const project of lookups.projects) {
    projectByCode.set(normalize(project.code), {
      id: project.id,
      code: project.code,
      name: project.name ?? "",
    })
  }

  const jobTypeByName = new Map<string, { id: string; subs: Map<string, string> }>()
  for (const jobType of lookups.jobTypes) {
    const subTypes = new Map<string, string>()
    for (const subType of jobType.job_sub_types || []) {
      subTypes.set(normalize(subType.name), subType.id)
    }
    jobTypeByName.set(normalize(jobType.name), { id: jobType.id, subs: subTypes })
  }

  const zonesByProject = new Map<string, Map<string, string>>()
  for (const zone of lookups.zones) {
    let inner = zonesByProject.get(zone.project_id)
    if (!inner) {
      inner = new Map()
      zonesByProject.set(zone.project_id, inner)
    }
    inner.set(normalize(zone.name), zone.id)
  }

  const dbKeys = new Set<string>()
  for (const task of lookups.existing) {
    dbKeys.add(dupKey(task.project_id, task.drawing_no, task.location, task.job_sub_type_id, task.description))
  }

  const fileKeyCount = new Map<string, number>()
  const parsedRows: ParsedRow[] = []

  for (let index = 0; index < dataRows.length; index++) {
    const row = dataRows[index] as unknown[]
    const rowNumber = index + 2
    const errors: string[] = []
    const fields: ParsedRowFields = {}
    const display: ParsedRowDisplay = {}

    const get = (columnIndex: number): string => {
      if (columnIndex < 0) return ""
      const value = row[columnIndex]
      return value == null ? "" : String(value).trim()
    }

    const allEmpty = headers.every((_, columnIndex) => get(columnIndex) === "")
    if (allEmpty) continue

    const projectCode = get(idx.project_code)
    const projectName = get(idx.project_name)
    display.project_code = projectCode
    display.project_name = projectName

    let project: { id: string; code: string; name: string } | undefined
    if (!projectCode) {
      errors.push("Proje Kodu zorunlu")
    } else {
      project = projectByCode.get(normalize(projectCode))
      if (!project) errors.push(`Proje Kodu '${projectCode}' bulunamadı`)
      else fields.project_id = project.id
    }

    if (!projectName) {
      errors.push("Proje Adı zorunlu")
    } else if (project && normalize(project.name) !== normalize(projectName)) {
      errors.push(`Proje Adı '${projectName}' Proje Kodu ile eşleşmiyor`)
    }

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

    const jobSubTypeName = get(idx.job_sub_type)
    display.job_sub_type_name = jobSubTypeName
    if (!jobSubTypeName) {
      errors.push("İş Alt Tipi zorunlu")
    } else if (jobType) {
      const subTypeId = jobType.subs.get(normalize(jobSubTypeName))
      if (!subTypeId) errors.push(`İş Alt Tipi '${jobSubTypeName}' bu iş tipinde yok`)
      else fields.job_sub_type_id = subTypeId
    }

    const zoneName = get(idx.zone)
    display.zone_name = zoneName
    if (zoneName && fields.project_id) {
      const projectZones = zonesByProject.get(fields.project_id)
      const zoneId = projectZones?.get(normalize(zoneName))
      if (!zoneId) errors.push(`Zone '${zoneName}' bu projede tanımlı değil`)
      else fields.zone_id = zoneId
    }

    const location = get(idx.location)
    display.location = location
    if (location) fields.location = location

    const drawingNo = get(idx.drawing_no)
    display.drawing_no = drawingNo
    fields.drawing_no = drawingNo

    const description = get(idx.description)
    display.description = description
    if (!description) errors.push("Yapılacak İş zorunlu")
    else fields.description = description

    const startRaw = idx.planned_start >= 0 ? row[idx.planned_start] : null
    const startResult = toIsoDate(startRaw)
    if (!startResult.ok) errors.push(`Başlama Tarihi: ${startResult.error}`)
    else if (startResult.iso) {
      fields.planned_start = startResult.iso
      display.planned_start = startResult.iso
    }

    const endRaw = idx.planned_end >= 0 ? row[idx.planned_end] : null
    const endResult = toIsoDate(endRaw)
    if (!endResult.ok) errors.push(`Termin: ${endResult.error}`)
    else if (endResult.iso) {
      fields.planned_end = endResult.iso
      display.planned_end = endResult.iso
    }

    const priorityRaw = get(idx.priority)
    display.priority = priorityRaw
    if (priorityRaw) {
      const priority = PRIORITY_MAP[normalize(priorityRaw)]
      if (!priority) errors.push(`Öncelik '${priorityRaw}' tanınmadı (Düşük/Orta/Yüksek/Acil)`)
      else fields.priority = priority
    }

    const notes = get(idx.admin_notes)
    if (notes) fields.admin_notes = notes

    let status: RowStatus = "valid"
    if (errors.length > 0) {
      status = "error"
    } else if (fields.project_id && fields.job_sub_type_id) {
      const key = dupKey(
        fields.project_id,
        fields.drawing_no ?? "",
        fields.location,
        fields.job_sub_type_id,
        fields.description
      )

      if (dbKeys.has(key)) {
        status = "duplicate-db"
      } else {
        const count = fileKeyCount.get(key) ?? 0
        if (count > 0) status = "duplicate-file"
        fileKeyCount.set(key, count + 1)
      }
    }

    parsedRows.push({
      rowNumber,
      status,
      selected: status === "valid",
      errors,
      fields,
      display,
    })
  }

  return { rows: parsedRows }
}
