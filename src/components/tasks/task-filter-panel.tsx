"use client"

import { useMemo, useState } from "react"
import { Filter, RotateCcw, Search, SlidersHorizontal } from "lucide-react"
import { JobType, Location, Project, Zone } from "@/types/task"
import { ReferenceUser } from "@/hooks/use-reference-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserAvatar } from "@/components/ui/user-avatar"
import { ActiveFilterChips } from "@/components/tasks/active-filter-chips"
import {
  ASSIGNMENT_STATE_OPTIONS,
  buildTaskFilterChips,
  createTaskFilters,
  DEADLINE_STATE_OPTIONS,
  DEFAULT_TASK_FILTERS,
  LINK_STATE_OPTIONS,
  SORT_OPTIONS,
  STATUS_FILTER_OPTIONS,
  TaskFilterState,
  TIMER_STATE_OPTIONS,
} from "@/lib/tasks/task-filters"
import { cn } from "@/lib/utils"

interface WorkerHighlight {
  id: string
  display_name: string
  photo_url?: string | null
  job_title?: string | null
  count: number
}

interface TaskFilterPanelProps {
  filters: TaskFilterState
  onChange: (key: keyof TaskFilterState, value: string) => void
  onReset: () => void
  projects: Project[]
  users: ReferenceUser[]
  jobTypes: JobType[]
  zones: Zone[]
  locations: Location[]
  resultCount?: number
  statusOptions?: Array<{ value: string; label: string }>
  hideAssignedFilter?: boolean
  workerHighlights?: WorkerHighlight[]
}

function allSubTypes(jobTypes: JobType[]) {
  return jobTypes.flatMap((jobType) => jobType.job_sub_types ?? [])
}

export function TaskFilterPanel({
  filters,
  onChange,
  onReset,
  projects,
  users,
  jobTypes,
  zones,
  locations,
  resultCount,
  statusOptions = STATUS_FILTER_OPTIONS,
  hideAssignedFilter = false,
  workerHighlights = [],
}: TaskFilterPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const availableSubTypes = useMemo(() => {
    if (filters.job_type_id === "all") {
      return allSubTypes(jobTypes)
    }

    return jobTypes.find((jobType) => jobType.id === filters.job_type_id)?.job_sub_types ?? []
  }, [filters.job_type_id, jobTypes])

  const chips = useMemo(
    () => buildTaskFilterChips(filters, projects, users, jobTypes, zones, locations),
    [filters, jobTypes, locations, projects, users, zones]
  )

  const removeChip = (key: string) => {
    if (key === "planned_start_range") {
      onChange("planned_start_from", "")
      onChange("planned_start_to", "")
      return
    }

    if (key === "planned_end_range") {
      onChange("planned_end_from", "")
      onChange("planned_end_to", "")
      return
    }

    if (key in DEFAULT_TASK_FILTERS) {
      const filterKey = key as keyof TaskFilterState
      onChange(filterKey, createTaskFilters()[filterKey])
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Filter className="h-4 w-4" />
              </div>
              Filtreler
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Hızlı filtrelerle alanı daraltın, gelişmiş filtrelerle operasyon görünümünü keskinleştirin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {typeof resultCount === "number" ? (
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                {resultCount} kayıt
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => setAdvancedOpen((current) => !current)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {advancedOpen ? "Gelişmiş filtreleri gizle" : "Gelişmiş filtreler"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="gap-2 rounded-full" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
              Sıfırla
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1.4fr)_200px_200px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={filters.search}
              onChange={(event) => onChange("search", event.target.value)}
              placeholder="Çizim no, açıklama, proje, mahal veya çalışan ara"
              className="h-11 rounded-2xl border-zinc-200 bg-zinc-50 pl-10"
            />
          </div>

          <Select value={filters.status} onValueChange={(value) => onChange("status", value)}>
            <SelectTrigger className="h-11 rounded-2xl border-zinc-200 bg-zinc-50">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.project_id} onValueChange={(value) => onChange("project_id", value)}>
            <SelectTrigger className="h-11 rounded-2xl border-zinc-200 bg-zinc-50">
              <SelectValue placeholder="Proje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm projeler</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.code}
                  {project.name ? ` · ${project.name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!hideAssignedFilter && workerHighlights.length === 0 ? (
            <Select value={filters.assigned_to} onValueChange={(value) => onChange("assigned_to", value)}>
              <SelectTrigger className="h-11 rounded-2xl border-zinc-200 bg-zinc-50">
                <SelectValue placeholder="Çalışan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm çalışanlar</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {workerHighlights.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {workerHighlights.map((worker) => {
              const active = filters.assigned_to === worker.id

              return (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => onChange("assigned_to", active ? "all" : worker.id)}
                  className={cn(
                    "flex min-w-[180px] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors",
                    active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                  )}
                >
                  <div className="relative">
                    <UserAvatar
                      displayName={worker.display_name}
                      photoUrl={worker.photo_url}
                      size="md"
                      className={active ? "ring-2 ring-white" : "ring-2 ring-zinc-100"}
                    />
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                        active ? "bg-white text-zinc-900" : "bg-zinc-900 text-white"
                      )}
                    >
                      {worker.count}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className={cn("truncate text-xs font-semibold", active ? "text-white" : "text-zinc-800")}>
                      {worker.display_name}
                    </p>
                    {worker.job_title ? (
                      <p className={cn("truncate text-[11px]", active ? "text-zinc-300" : "text-zinc-500")}>
                        {worker.job_title}
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}

        <ActiveFilterChips chips={chips} onRemove={removeChip} onClear={onReset} />

        {advancedOpen ? (
          <div className="grid gap-3 rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-4 xl:grid-cols-4">
            <Select value={filters.job_type_id} onValueChange={(value) => onChange("job_type_id", value)}>
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder="İş tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm iş tipleri</SelectItem>
                {jobTypes.map((jobType) => (
                  <SelectItem key={jobType.id} value={jobType.id}>
                    {jobType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.job_sub_type_id} onValueChange={(value) => onChange("job_sub_type_id", value)}>
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder="Alt tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm alt tipler</SelectItem>
                {availableSubTypes.map((subType) => (
                  <SelectItem key={subType.id} value={subType.id}>
                    {subType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(value) => onChange("priority", value)}>
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder="Öncelik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm öncelikler</SelectItem>
                <SelectItem value="low">Düşük</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="high">Yüksek</SelectItem>
                <SelectItem value="urgent">Acil</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.assignment_state} onValueChange={(value) => onChange("assignment_state", value)}>
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder="Atanma durumu" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_STATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.timer_state} onValueChange={(value) => onChange("timer_state", value)}>
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder="Kronometre durumu" />
              </SelectTrigger>
              <SelectContent>
                {TIMER_STATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.link_state} onValueChange={(value) => onChange("link_state", value)}>
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder="Bağlı görev durumu" />
              </SelectTrigger>
              <SelectContent>
                {LINK_STATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.deadline_state} onValueChange={(value) => onChange("deadline_state", value)}>
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder="Termin durumu" />
              </SelectTrigger>
              <SelectContent>
                {DEADLINE_STATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.sort} onValueChange={(value) => onChange("sort", value)}>
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder="Sıralama" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.project_id === "all" ? "all" : filters.zone_id}
              onValueChange={(value) => onChange("zone_id", value)}
              disabled={filters.project_id === "all"}
            >
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder={filters.project_id === "all" ? "Önce proje seçin" : "Zone"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm zone'lar</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.project_id === "all" ? "all" : filters.location}
              onValueChange={(value) => onChange("location", value)}
              disabled={filters.project_id === "all"}
            >
              <SelectTrigger className="h-10 rounded-2xl border-zinc-200 bg-white">
                <SelectValue placeholder={filters.project_id === "all" ? "Önce proje seçin" : "Mahal"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm mahaller</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.name}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">Başlangıç</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.planned_start_from}
                  onChange={(event) => onChange("planned_start_from", event.target.value)}
                  className="h-10 rounded-2xl border-zinc-200 bg-white"
                />
                <Input
                  type="date"
                  value={filters.planned_start_to}
                  onChange={(event) => onChange("planned_start_to", event.target.value)}
                  className="h-10 rounded-2xl border-zinc-200 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">Hedef bitiş</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.planned_end_from}
                  onChange={(event) => onChange("planned_end_from", event.target.value)}
                  className="h-10 rounded-2xl border-zinc-200 bg-white"
                />
                <Input
                  type="date"
                  value={filters.planned_end_to}
                  onChange={(event) => onChange("planned_end_to", event.target.value)}
                  className="h-10 rounded-2xl border-zinc-200 bg-white"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
