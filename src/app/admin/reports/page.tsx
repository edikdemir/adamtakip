"use client"

import { useMemo, useState } from "react"
import { Download, FileDown } from "lucide-react"
import { ReportChartsGrid } from "@/components/admin/reports/report-charts-grid"
import { ReportFilterBar } from "@/components/admin/reports/report-filter-bar"
import { ReportSummaryCards } from "@/components/admin/reports/report-summary-cards"
import { ReportUserBreakdown } from "@/components/admin/reports/report-user-breakdown"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { useJobTypes, useProjects, useUsers } from "@/hooks/use-reference-data"
import { useReports } from "@/hooks/use-reports"
import {
  type NamedHoursDatum,
  ReportFilters,
  buildJobTypePieData,
  buildMonthlyData,
  buildSubTypeData,
  buildUserReports,
  buildWorkerData,
  downloadCSV,
  downloadPdf,
  getReportSummary,
  resolveReportFilterLabels,
} from "@/lib/reports/report-utils"

const REPORT_CHART_LIMIT = 12

function limitChartData(data: NamedHoursDatum[], limit = REPORT_CHART_LIMIT): NamedHoursDatum[] {
  if (data.length <= limit) {
    return data
  }

  const visible = data.slice(0, limit)
  const otherHours = data.slice(limit).reduce((sum, item) => sum + item.hours, 0)

  return otherHours > 0 ? [...visible, { name: "Diğer", hours: Number(otherHours.toFixed(2)) }] : visible
}

function getInitialFilters(): ReportFilters {
  const today = new Date().toISOString().slice(0, 10)
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  return {
    from: firstDay,
    to: today,
    project_id: "all",
    user_id: "all",
    job_type_id: "all",
    admin_status: "onaylandi",
  }
}

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(getInitialFilters)
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(filters)

  const { data: tasks = [], isLoading } = useReports(appliedFilters)
  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] } = useJobTypes()
  const { data: users = [] } = useUsers()

  const monthlyData = useMemo(() => buildMonthlyData(tasks), [tasks])
  const jobTypePieData = useMemo(() => buildJobTypePieData(tasks), [tasks])
  const workerData = useMemo(() => buildWorkerData(tasks), [tasks])
  const subTypeData = useMemo(() => buildSubTypeData(tasks), [tasks])
  const workerChartData = useMemo(() => limitChartData(workerData), [workerData])
  const subTypeChartData = useMemo(() => limitChartData(subTypeData), [subTypeData])
  const userReports = useMemo(() => buildUserReports(tasks), [tasks])
  const summary = useMemo(() => getReportSummary(tasks), [tasks])

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const handleDownloadPdf = () => {
    const labels = resolveReportFilterLabels(appliedFilters, projects, users, jobTypes)
    downloadPdf(tasks, appliedFilters, labels, monthlyData, jobTypePieData, workerData, subTypeData)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Raporlama"
        title="Aylık Adam/Saat Raporu"
        description="Filtrelenmiş çalışma verisini grafikler, kullanıcı kırılımları ve PDF/CSV çıktılarıyla birlikte yönetin."
        actions={
          tasks.length > 0 ? (
            <>
              <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => downloadCSV(tasks)}>
                <Download className="h-4 w-4" />
                CSV İndir
              </Button>
              <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={handleDownloadPdf}>
                <FileDown className="h-4 w-4" />
                PDF İndir
              </Button>
            </>
          ) : undefined
        }
      />

      <ReportFilterBar
        filters={filters}
        projects={projects}
        users={users}
        jobTypes={jobTypes}
        onChange={handleFilterChange}
        onApply={() => setAppliedFilters(filters)}
      />

      <ReportSummaryCards
        isLoading={isLoading}
        totalHours={summary.totalHours}
        totalTasks={summary.totalTasks}
        completedTasks={summary.completedTasks}
        completionRate={summary.completionRate}
      />

      {isLoading ? (
        <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/70 px-6 py-14 text-center text-sm text-zinc-400">
          Yükleniyor...
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/70 px-6 py-14 text-center text-sm text-zinc-400">
          Bu filtrede veri bulunamadı.
        </div>
      ) : (
        <>
          <ReportChartsGrid
            monthlyData={monthlyData}
            jobTypePieData={jobTypePieData}
            workerData={workerChartData}
            subTypeData={subTypeChartData}
          />
          <ReportUserBreakdown reports={userReports} />
        </>
      )}
    </div>
  )
}
