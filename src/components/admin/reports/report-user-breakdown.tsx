"use client"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserReport, getAdamSaat } from "@/lib/reports/report-utils"
import { ADMIN_STATUS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"

interface ReportUserBreakdownProps {
  reports: UserReport[]
}

export function ReportUserBreakdown({ reports }: ReportUserBreakdownProps) {
  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div key={report.user.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
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
                    <Badge
                      variant="outline"
                      className={
                        task.admin_status === ADMIN_STATUS.ONAYLANDI
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : task.admin_status === ADMIN_STATUS.TAMAMLANDI
                            ? "border-orange-200 bg-orange-50 text-orange-700"
                            : "border-zinc-200 text-zinc-600"
                      }
                    >
                      {task.admin_status === ADMIN_STATUS.ONAYLANDI
                        ? "Onaylandı"
                        : task.admin_status === ADMIN_STATUS.TAMAMLANDI
                          ? "Onay Bekliyor"
                          : "Devam Ediyor"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  )
}
