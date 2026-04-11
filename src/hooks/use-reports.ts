"use client"

import { useQuery } from "@tanstack/react-query"
import type { ReportTask } from "@/lib/reports/report-utils"
import type { ReportFilters } from "@/lib/reports/report-utils"
import { readApiArray } from "@/lib/api-client"

function buildReportSearchParams(filters: ReportFilters) {
  const params = new URLSearchParams()

  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  if (filters.project_id !== "all") params.set("project_id", filters.project_id)
  if (filters.user_id !== "all") params.set("user_id", filters.user_id)
  if (filters.job_type_id !== "all") params.set("job_type_id", filters.job_type_id)
  if (filters.admin_status !== "all") params.set("admin_status", filters.admin_status)

  return params
}

export function useReports(filters: ReportFilters) {
  const params = buildReportSearchParams(filters)

  return useQuery<ReportTask[]>({
    queryKey: ["reports", filters],
    queryFn: async () => {
      const response = await fetch(`/api/reports?${params.toString()}`)
      return readApiArray<ReportTask>(response, "Rapor verileri yüklenemedi")
    },
  })
}
