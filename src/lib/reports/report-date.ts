export interface ReportDateFields {
  admin_status?: string
  completion_date: string | null
  approved_at?: string | null
  planned_end?: string | null
  planned_start?: string | null
}

export function getReportDate(task: ReportDateFields) {
  if (task.admin_status === "atandi" || task.admin_status === "devam_ediyor" || task.admin_status === "havuzda") {
    return task.planned_end ?? task.planned_start ?? task.completion_date ?? task.approved_at ?? null
  }

  return task.completion_date ?? task.approved_at ?? task.planned_end ?? task.planned_start ?? null
}

export function isReportDateInRange(task: ReportDateFields, from?: string | null, to?: string | null) {
  const reportDate = getReportDate(task)

  if ((from || to) && !reportDate) {
    return false
  }

  if (from && reportDate && reportDate < from) {
    return false
  }

  if (to && reportDate && reportDate > to) {
    return false
  }

  return true
}
