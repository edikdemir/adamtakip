"use client"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserReport, getAdamSaat } from "@/lib/reports/report-utils"
import { ADMIN_STATUS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"

interface ReportUserBreakdownProps {
  reports: UserReport[]
}

function getReportStatusClass(adminStatus: string) {
  if (adminStatus === ADMIN_STATUS.ONAYLANDI) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (adminStatus === ADMIN_STATUS.TAMAMLANDI) {
    return "border-orange-200 bg-orange-50 text-orange-700"
  }

  return "border-zinc-200 text-zinc-600"
}

function getReportStatusLabel(adminStatus: string) {
  if (adminStatus === ADMIN_STATUS.ONAYLANDI) {
    return "Onaylandı"
  }

  if (adminStatus === ADMIN_STATUS.TAMAMLANDI) {
    return "Onay Bekliyor"
  }

  return "Devam Ediyor"
}

export function ReportUserBreakdown({ reports }: ReportUserBreakdownProps) {
  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div key={report.user.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm [contain-intrinsic-size:360px] [content-visibility:auto]">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                {report.user.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{report.user.display_name}</p>
                <p className="text-xs text-zinc-400">{report.user.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-zinc-900">{report.totalHours.toFixed(2)} sa</p>
              <p className="text-xs text-zinc-400">{report.tasks.length} görev</p>
            </div>
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="w-20">Proje</TableHead>
                  <TableHead>Resim No</TableHead>
                  <TableHead>İş Tipi</TableHead>
                  <TableHead>Alt Tip</TableHead>
                  <TableHead className="w-24 text-right">AdamxSaat (sa)</TableHead>
                  <TableHead className="w-28">Tamamlanma</TableHead>
                  <TableHead className="w-24">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.tasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-zinc-50/50">
                    <TableCell className="font-mono text-xs font-medium">{task.project?.code}</TableCell>
                    <TableCell className="font-mono text-sm">{task.drawing_no || "—"}</TableCell>
                    <TableCell className="text-sm text-zinc-600">{task.job_type?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-zinc-500">{task.job_sub_type?.name || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{getAdamSaat(task).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {task.completion_date ? formatDate(task.completion_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getReportStatusClass(task.admin_status)}>
                        {getReportStatusLabel(task.admin_status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-zinc-100 md:hidden">
            {report.tasks.map((task) => (
              <div key={task.id} className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-zinc-500">{task.project?.code || "—"}</p>
                    <p className="truncate font-mono text-sm font-semibold text-zinc-900">{task.drawing_no || "Resim no yok"}</p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-bold text-zinc-900">{getAdamSaat(task).toFixed(2)} sa</p>
                </div>
                <p className="text-sm text-zinc-600">
                  {task.job_type?.name || "İş tipi yok"} / {task.job_sub_type?.name || "Alt tip yok"}
                </p>
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>{task.completion_date ? formatDate(task.completion_date) : "Tamamlanma yok"}</span>
                  <Badge variant="outline" className={getReportStatusClass(task.admin_status)}>
                    {getReportStatusLabel(task.admin_status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
