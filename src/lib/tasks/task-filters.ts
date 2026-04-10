"use client"

import { ADMIN_STATUS, ADMIN_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants"
import { JobType, Project, Location, Zone } from "@/types/task"
import { ReferenceUser } from "@/hooks/use-reference-data"

export interface TaskFilterState {
  search: string
  status: string
  project_id: string
  assigned_to: string
  job_type_id: string
  job_sub_type_id: string
  zone_id: string
  location: string
  priority: string
  assignment_state: string
  timer_state: string
  link_state: string
  deadline_state: string
  planned_start_from: string
  planned_start_to: string
  planned_end_from: string
  planned_end_to: string
  sort: string
}

export interface TaskFilterChip {
  key: keyof TaskFilterState | "planned_start_range" | "planned_end_range"
  label: string
  value: string
}

export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  search: "",
  status: "all",
  project_id: "all",
  assigned_to: "all",
  job_type_id: "all",
  job_sub_type_id: "all",
  zone_id: "all",
  location: "all",
  priority: "all",
  assignment_state: "all",
  timer_state: "all",
  link_state: "all",
  deadline_state: "all",
  planned_start_from: "",
  planned_start_to: "",
  planned_end_from: "",
  planned_end_to: "",
  sort: "created_desc",
}

export const ASSIGNMENT_STATE_OPTIONS = [
  { value: "all", label: "Atanma durumu" },
  { value: "assigned", label: "Atanmış" },
  { value: "unassigned", label: "Atanmamış" },
]

export const TIMER_STATE_OPTIONS = [
  { value: "all", label: "Kronometre durumu" },
  { value: "running", label: "Aktif kronometre" },
  { value: "stopped", label: "Kronometre pasif" },
]

export const LINK_STATE_OPTIONS = [
  { value: "all", label: "Bağlı görev durumu" },
  { value: "linked", label: "Bağlantılı" },
  { value: "unlinked", label: "Bağlantısız" },
]

export const DEADLINE_STATE_OPTIONS = [
  { value: "all", label: "Termin durumu" },
  { value: "overdue", label: "Gecikmiş" },
  { value: "warning", label: "Yakın termin" },
  { value: "ok", label: "Planlı" },
  { value: "none", label: "Termin yok" },
]

export const SORT_OPTIONS = [
  { value: "created_desc", label: "En yeni kayıt" },
  { value: "deadline_asc", label: "Termin yaklaşan" },
  { value: "deadline_desc", label: "Termin en geç" },
  { value: "priority_desc", label: "Öncelik yüksek" },
  { value: "duration_desc", label: "Süre yüksek" },
  { value: "drawing_asc", label: "Çizim no A-Z" },
]

export function createTaskFilters(initial?: Partial<TaskFilterState>): TaskFilterState {
  return {
    ...DEFAULT_TASK_FILTERS,
    ...initial,
  }
}

function optionLabel(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

function jobSubTypeLabel(jobTypes: JobType[], jobSubTypeId: string) {
  for (const jobType of jobTypes) {
    const subType = jobType.job_sub_types?.find((item) => item.id === jobSubTypeId)
    if (subType) {
      return subType.name
    }
  }

  return jobSubTypeId
}

export function buildTaskFilterChips(
  filters: TaskFilterState,
  projects: Project[],
  users: ReferenceUser[],
  jobTypes: JobType[],
  zones: Zone[],
  locations: Location[]
): TaskFilterChip[] {
  const chips: TaskFilterChip[] = []

  if (filters.search.trim()) {
    chips.push({ key: "search", label: "Arama", value: filters.search.trim() })
  }

  if (filters.status !== "all") {
    chips.push({
      key: "status",
      label: "Durum",
      value: ADMIN_STATUS_LABELS[filters.status as keyof typeof ADMIN_STATUS_LABELS] ?? filters.status,
    })
  }

  if (filters.project_id !== "all") {
    chips.push({
      key: "project_id",
      label: "Proje",
      value: projects.find((project) => project.id === filters.project_id)?.code ?? filters.project_id,
    })
  }

  if (filters.assigned_to !== "all") {
    chips.push({
      key: "assigned_to",
      label: "Çalışan",
      value: users.find((user) => user.id === filters.assigned_to)?.display_name ?? filters.assigned_to,
    })
  }

  if (filters.job_type_id !== "all") {
    chips.push({
      key: "job_type_id",
      label: "İş tipi",
      value: jobTypes.find((jobType) => jobType.id === filters.job_type_id)?.name ?? filters.job_type_id,
    })
  }

  if (filters.job_sub_type_id !== "all") {
    chips.push({
      key: "job_sub_type_id",
      label: "Alt tip",
      value: jobSubTypeLabel(jobTypes, filters.job_sub_type_id),
    })
  }

  if (filters.zone_id !== "all") {
    chips.push({
      key: "zone_id",
      label: "Zone",
      value: zones.find((zone) => zone.id === filters.zone_id)?.name ?? filters.zone_id,
    })
  }

  if (filters.location !== "all") {
    chips.push({
      key: "location",
      label: "Mahal",
      value: locations.find((location) => location.name === filters.location)?.name ?? filters.location,
    })
  }

  if (filters.priority !== "all") {
    chips.push({
      key: "priority",
      label: "Öncelik",
      value: PRIORITY_LABELS[filters.priority as keyof typeof PRIORITY_LABELS] ?? filters.priority,
    })
  }

  if (filters.assignment_state !== "all") {
    chips.push({
      key: "assignment_state",
      label: "Atanma",
      value: optionLabel(ASSIGNMENT_STATE_OPTIONS, filters.assignment_state),
    })
  }

  if (filters.timer_state !== "all") {
    chips.push({
      key: "timer_state",
      label: "Kronometre",
      value: optionLabel(TIMER_STATE_OPTIONS, filters.timer_state),
    })
  }

  if (filters.link_state !== "all") {
    chips.push({
      key: "link_state",
      label: "Bağlı görev",
      value: optionLabel(LINK_STATE_OPTIONS, filters.link_state),
    })
  }

  if (filters.deadline_state !== "all") {
    chips.push({
      key: "deadline_state",
      label: "Termin",
      value: optionLabel(DEADLINE_STATE_OPTIONS, filters.deadline_state),
    })
  }

  if (filters.planned_start_from || filters.planned_start_to) {
    chips.push({
      key: "planned_start_range",
      label: "Başlangıç",
      value: `${filters.planned_start_from || "?"} - ${filters.planned_start_to || "?"}`,
    })
  }

  if (filters.planned_end_from || filters.planned_end_to) {
    chips.push({
      key: "planned_end_range",
      label: "Hedef bitiş",
      value: `${filters.planned_end_from || "?"} - ${filters.planned_end_to || "?"}`,
    })
  }

  if (filters.sort !== DEFAULT_TASK_FILTERS.sort) {
    chips.push({
      key: "sort",
      label: "Sıralama",
      value: optionLabel(SORT_OPTIONS, filters.sort),
    })
  }

  return chips
}

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: ADMIN_STATUS.HAVUZDA, label: ADMIN_STATUS_LABELS[ADMIN_STATUS.HAVUZDA] },
  { value: ADMIN_STATUS.ATANDI, label: ADMIN_STATUS_LABELS[ADMIN_STATUS.ATANDI] },
  { value: ADMIN_STATUS.DEVAM_EDIYOR, label: ADMIN_STATUS_LABELS[ADMIN_STATUS.DEVAM_EDIYOR] },
  { value: ADMIN_STATUS.TAMAMLANDI, label: ADMIN_STATUS_LABELS[ADMIN_STATUS.TAMAMLANDI] },
  { value: ADMIN_STATUS.ONAYLANDI, label: ADMIN_STATUS_LABELS[ADMIN_STATUS.ONAYLANDI] },
  { value: ADMIN_STATUS.IPTAL, label: ADMIN_STATUS_LABELS[ADMIN_STATUS.IPTAL] },
]
