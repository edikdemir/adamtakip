"use client"

import { ReportFilters, REPORT_STATUS_OPTIONS } from "@/lib/reports/report-utils"
import { JobType, Project } from "@/types/task"
import { ReferenceUser } from "@/hooks/use-reference-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ReportFilterBarProps {
  filters: ReportFilters
  projects: Project[]
  users: ReferenceUser[]
  jobTypes: JobType[]
  onChange: (key: keyof ReportFilters, value: string) => void
  onApply: () => void
}

export function ReportFilterBar({
  filters,
  projects,
  users,
  jobTypes,
  onChange,
  onApply,
}: ReportFilterBarProps) {
  return (
    <div className="flex items-end gap-3 flex-wrap bg-zinc-50 border border-zinc-200 rounded-xl p-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Başlangıç</Label>
        <Input
          type="date"
          value={filters.from}
          onChange={(event) => onChange("from", event.target.value)}
          className="h-8 w-36 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Bitiş</Label>
        <Input
          type="date"
          value={filters.to}
          onChange={(event) => onChange("to", event.target.value)}
          className="h-8 w-36 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Proje</Label>
        <Select value={filters.project_id} onValueChange={(value) => onChange("project_id", value)}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Tümü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Projeler</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.code} — {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Çalışan</Label>
        <Select value={filters.user_id} onValueChange={(value) => onChange("user_id", value)}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Tümü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Çalışanlar</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">İşin Tipi</Label>
        <Select value={filters.job_type_id} onValueChange={(value) => onChange("job_type_id", value)}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Tümü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm İş Tipleri</SelectItem>
            {jobTypes.map((jobType) => (
              <SelectItem key={jobType.id} value={jobType.id}>
                {jobType.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Onay Durumu</Label>
        <Select value={filters.admin_status} onValueChange={(value) => onChange("admin_status", value)}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button size="sm" className="h-8" onClick={onApply}>
        Uygula
      </Button>
    </div>
  )
}
