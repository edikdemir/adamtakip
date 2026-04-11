export type RowStatus = "valid" | "error" | "duplicate-db" | "duplicate-file"

export interface LookupProject {
  id: string
  code: string
  name: string
}

export interface LookupJobSubType {
  id: string
  name: string
}

export interface LookupJobType {
  id: string
  name: string
  job_sub_types: LookupJobSubType[]
}

export interface LookupZone {
  id: string
  project_id: string
  name: string
}

export interface ExistingTaskKey {
  project_id: string
  drawing_no: string
  location: string | null
  job_sub_type_id: string
  description?: string | null
}

export interface Lookups {
  projects: LookupProject[]
  jobTypes: LookupJobType[]
  zones: LookupZone[]
  existing?: ExistingTaskKey[]
}

export interface ParsedRowFields extends Record<string, unknown> {
  project_id?: string
  job_type_id?: string
  job_sub_type_id?: string
  zone_id?: string
  location?: string
  drawing_no?: string
  description?: string
  planned_start?: string
  planned_end?: string
  priority?: "low" | "medium" | "high" | "urgent"
  admin_notes?: string
}

export interface ParsedRowDisplay {
  project_code?: string
  project_name?: string
  job_type_name?: string
  job_sub_type_name?: string
  zone_name?: string
  location?: string
  drawing_no?: string
  description?: string
  planned_start?: string
  planned_end?: string
  priority?: string
}

export interface ParsedRow {
  rowNumber: number // 1-indexed (Excel'deki satır numarası, header hariç)
  status: RowStatus
  selected: boolean
  errors: string[]
  fields: ParsedRowFields
  display: ParsedRowDisplay
}

export interface ParseResult {
  rows: ParsedRow[]
  fileError?: string
}
