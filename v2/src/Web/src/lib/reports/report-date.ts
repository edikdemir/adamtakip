export interface ReportDateFields {
  admin_status?: string
  completion_date: string | null
  approved_at?: string | null
  planned_end?: string | null
  planned_start?: string | null
}

const ACTIVE_REPORT_STATUSES = new Set(["atandi", "devam_ediyor"])

function isActiveReportStatus(status?: string) {
  return status ? ACTIVE_REPORT_STATUSES.has(status) : false
}

function isBetween(value: string, from?: string | null, to?: string | null) {
  return (!from || value >= from) && (!to || value <= to)
}

export function getReportDate(task: ReportDateFields) {
  if (isActiveReportStatus(task.admin_status)) {
    return task.planned_start ?? task.planned_end ?? task.completion_date ?? task.approved_at ?? null
  }

  return task.completion_date ?? task.approved_at ?? task.planned_end ?? task.planned_start ?? null
}

export function isReportDateInRange(task: ReportDateFields, from?: string | null, to?: string | null) {
  if (isActiveReportStatus(task.admin_status)) {
    const start = task.planned_start
    const end = task.planned_end

    if (!from && !to) {
      return true
    }

    if (!start && !end) {
      return true
    }

    if (start && isBetween(start, from, to)) {
      return true
    }

    if (end && isBetween(end, from, to)) {
      return true
    }

    if (from && to && start && end) {
      return start <= to && end >= from
    }

    return false
  }

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
