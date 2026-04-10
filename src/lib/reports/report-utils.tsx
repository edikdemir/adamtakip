"use client"

import type { JobType, Project } from "@/types/task"
import type { ReferenceUser } from "@/hooks/use-reference-data"
import { ReportPdf, registerReportPdfAssets, type ReportTask } from "@/lib/pdf/report-pdf"
import { ADMIN_STATUS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"

export type { ReportTask }

export interface ReportFilters {
  from: string
  to: string
  project_id: string
  user_id: string
  job_type_id: string
  admin_status: string
}

export interface UserReport {
  user: { id: string; display_name: string; email: string }
  tasks: ReportTask[]
  totalHours: number
}

export interface MonthlyReportRow {
  month: string
  label: string
  hours: number
}

export interface NamedHoursDatum {
  name: string
  hours: number
}

export const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"]

export const REPORT_STATUS_OPTIONS = [
  { value: "onaylandi", label: "Hazır" },
  { value: "tamamlandi", label: "Onay Bekliyor" },
  { value: "devam_ediyor", label: "Devam Ediyor" },
  { value: "atandi", label: "Atandı" },
  { value: "havuzda", label: "Havuzda" },
  { value: "all", label: "Tümü" },
]

export const reportTooltipStyle = {
  contentStyle: {
    borderRadius: "8px",
    border: "1px solid #e4e4e7",
    fontSize: "12px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
  labelStyle: { fontWeight: 600, color: "#18181b" },
}

export function getAdamSaat(task: ReportTask) {
  return task.total_elapsed_seconds / 3600 + (task.manual_hours ?? 0)
}

export function buildMonthlyData(tasks: ReportTask[]) {
  const monthlyHours: Record<string, number> = {}

  for (const task of tasks) {
    const date = task.completion_date ?? task.planned_end
    if (!date) continue

    const month = date.slice(0, 7)
    monthlyHours[month] = (monthlyHours[month] ?? 0) + getAdamSaat(task)
  }

  return Object.entries(monthlyHours)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([month, hours]) => ({
      month,
      label: new Date(`${month}-01T00:00:00`).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "short",
      }),
      hours: Number(hours.toFixed(2)),
    }))
}

export function buildJobTypePieData(tasks: ReportTask[]) {
  const jobTypeHours: Record<string, { name: string; hours: number }> = {}

  for (const task of tasks) {
    const key = task.job_type?.id ?? "unknown"
    const name = task.job_type?.name ?? "Bilinmiyor"

    if (!jobTypeHours[key]) {
      jobTypeHours[key] = { name, hours: 0 }
    }

    jobTypeHours[key].hours += getAdamSaat(task)
  }

  return Object.values(jobTypeHours)
    .sort((first, second) => second.hours - first.hours)
    .map((entry) => ({ ...entry, hours: Number(entry.hours.toFixed(2)) }))
}

export function buildWorkerData(tasks: ReportTask[]) {
  const workerHours: Record<string, { name: string; hours: number }> = {}

  for (const task of tasks) {
    const user = task.assigned_user
    if (!user) continue

    if (!workerHours[user.id]) {
      workerHours[user.id] = { name: user.display_name, hours: 0 }
    }

    workerHours[user.id].hours += getAdamSaat(task)
  }

  return Object.values(workerHours)
    .sort((first, second) => second.hours - first.hours)
    .map((entry) => ({ ...entry, hours: Number(entry.hours.toFixed(2)) }))
}

export function buildSubTypeData(tasks: ReportTask[]) {
  const subTypeHours: Record<string, { name: string; hours: number }> = {}

  for (const task of tasks) {
    const key = task.job_sub_type?.name ?? "Bilinmiyor"

    if (!subTypeHours[key]) {
      subTypeHours[key] = { name: key, hours: 0 }
    }

    subTypeHours[key].hours += getAdamSaat(task)
  }

  return Object.values(subTypeHours)
    .sort((first, second) => second.hours - first.hours)
    .map((entry) => ({ ...entry, hours: Number(entry.hours.toFixed(2)) }))
}

export function buildUserReports(tasks: ReportTask[]): UserReport[] {
  const reportsByUser: Record<string, UserReport> = {}

  for (const task of tasks) {
    const user = task.assigned_user
    if (!user) continue

    if (!reportsByUser[user.id]) {
      reportsByUser[user.id] = { user, tasks: [], totalHours: 0 }
    }

    reportsByUser[user.id].tasks.push(task)
    reportsByUser[user.id].totalHours += getAdamSaat(task)
  }

  return Object.values(reportsByUser).sort((first, second) => second.totalHours - first.totalHours)
}

export function downloadCSV(tasks: ReportTask[]) {
  const rows = [
    ["Çalışan", "E-posta", "Proje", "Resim No", "İş Tipi", "Alt Tip", "Kronometrik (sa)", "Manuel (sa)", "Toplam AdamxSaat (sa)", "Durum", "Tamamlanma"].join(","),
  ]

  for (const task of tasks) {
    const user = task.assigned_user

    rows.push(
      [
        `"${user?.display_name ?? ""}"`,
        user?.email ?? "",
        task.project?.code ?? "",
        `"${task.drawing_no}"`,
        `"${task.job_type?.name ?? ""}"`,
        `"${task.job_sub_type?.name ?? ""}"`,
        (task.total_elapsed_seconds / 3600).toFixed(2),
        (task.manual_hours ?? 0).toFixed(2),
        getAdamSaat(task).toFixed(2),
        task.admin_status,
        task.completion_date ? formatDate(task.completion_date) : "",
      ].join(",")
    )
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `adamsaat-rapor-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadPdf(
  tasks: ReportTask[],
  filters: ReportFilters,
  labels: {
    adminStatusLabel: string
    projectLabel: string
    userLabel: string
    jobTypeLabel: string
  },
  monthlyData: MonthlyReportRow[],
  jobTypePieData: NamedHoursDatum[],
  workerData: NamedHoursDatum[],
  subTypeData: NamedHoursDatum[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { pdf } = (await import("@react-pdf/renderer")) as any

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  registerReportPdfAssets(baseUrl)

  const pdfDocument = (
    <ReportPdf
      tasks={tasks}
      filters={{ from: filters.from, to: filters.to, ...labels }}
      monthlyData={monthlyData}
      jobTypePieData={jobTypePieData}
      workerData={workerData}
      subTypeData={subTypeData}
      logoUrl={typeof window !== "undefined" ? `${window.location.origin}/logo_cemre.png` : undefined}
    />
  )

  const blob = await pdf(pdfDocument).toBlob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `adamsaat-rapor-${new Date().toISOString().slice(0, 10)}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function resolveReportFilterLabels(
  filters: ReportFilters,
  projects: Project[],
  users: ReferenceUser[],
  jobTypes: JobType[]
) {
  const adminStatusLabel =
    REPORT_STATUS_OPTIONS.find((option) => option.value === filters.admin_status)?.label ?? filters.admin_status
  const projectLabel =
    filters.project_id !== "all"
      ? (projects.find((project) => project.id === filters.project_id)?.code ?? "Seçili Proje")
      : "Tüm Projeler"
  const userLabel =
    filters.user_id !== "all"
      ? (users.find((user) => user.id === filters.user_id)?.display_name ?? "Seçili Çalışan")
      : "Tüm Çalışanlar"
  const jobTypeLabel =
    filters.job_type_id !== "all"
      ? (jobTypes.find((jobType) => jobType.id === filters.job_type_id)?.name ?? "Seçili İş Tipi")
      : "Tüm İş Tipleri"

  return {
    adminStatusLabel,
    projectLabel,
    userLabel,
    jobTypeLabel,
  }
}

export function getReportSummary(tasks: ReportTask[]) {
  const totalHours = tasks.reduce((total, task) => total + getAdamSaat(task), 0)
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.admin_status === ADMIN_STATUS.ONAYLANDI).length

  return {
    totalHours,
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : null,
  }
}
