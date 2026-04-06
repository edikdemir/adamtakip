"use client"
import { useState } from "react"
import { useTasks, useApproveTask, useRejectTask } from "@/hooks/use-tasks"
import { Task } from "@/types/task"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatHours } from "@/lib/utils"
import { ADMIN_STATUS } from "@/lib/constants"
import { Check, RotateCcw, Clock, CheckCircle2 } from "lucide-react"
import { TaskLinkBadge } from "@/components/tasks/task-link-badge"

export default function ApprovalsPage() {
  const [rejectTask, setRejectTask] = useState<Task | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data: tasks = [], isLoading } = useTasks({ status: ADMIN_STATUS.TAMAMLANDI })
  const approveTask = useApproveTask()
  const rejectTaskMutation = useRejectTask()

  const handleReject = async () => {
    if (!rejectTask) return
    await rejectTaskMutation.mutateAsync({ taskId: rejectTask.id, reason: rejectReason })
    setRejectTask(null)
    setRejectReason("")
  }

  const totalPendingHours = tasks.reduce(
    (acc: number, t: Task) => acc + t.total_elapsed_seconds / 3600,
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Onay Kuyruğu</h1>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 text-sm py-1 px-3">
            <Clock className="h-3.5 w-3.5" />
            {tasks.length} görev bekliyor
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3">
            {totalPendingHours.toFixed(1)} sa toplam
          </Badge>
        </div>
      </div>

      {tasks.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <CheckCircle2 className="h-10 w-10 mb-3" />
          <p className="font-medium">Onay bekleyen görev yok</p>
          <p className="text-sm mt-1">Tüm görevler işlendi.</p>
        </div>
      )}

      {(isLoading || tasks.length > 0) && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/80">
                <TableHead className="w-24">Proje</TableHead>
                <TableHead>Çizim No</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Çalışan</TableHead>
                <TableHead>Atayan</TableHead>
                <TableHead>Kesin Bitiş Tarihi</TableHead>
                <TableHead>Süre (sa)</TableHead>
                <TableHead className="w-32">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-zinc-400">Yükleniyor...</TableCell>
                </TableRow>
              ) : (
                tasks.map((task: Task) => (
                  <TableRow key={task.id} className="hover:bg-zinc-50/50">
                    <TableCell className="font-medium">{task.project?.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{task.drawing_no}</span>
                        <TaskLinkBadge parent={task.linked_to_task} dependents={task.linked_tasks} />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div>
                        <p className="text-sm text-zinc-700 truncate" title={task.description}>{task.description}</p>
                        <p className="text-xs text-zinc-400">{task.job_sub_type?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-zinc-700">{task.assigned_user?.display_name || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-zinc-500">{task.assigned_by_user?.display_name || "-"}</span>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {formatDate(task.completion_date)}
                    </TableCell>
                    <TableCell className="font-semibold text-zinc-900">
                      {formatHours(task.total_elapsed_seconds)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => approveTask.mutate(task.id)}
                          disabled={approveTask.isPending}
                        >
                          <Check className="h-3 w-3" /> Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => { setRejectTask(task); setRejectReason("") }}
                        >
                          <RotateCcw className="h-3 w-3" /> İade
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTask} onOpenChange={(open) => !open && setRejectTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi İade Et</DialogTitle>
            <DialogDescription>
              <strong>{rejectTask?.drawing_no}</strong> görevi tekrar işleme alınmak üzere iade edilecek.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-zinc-700">İade Sebebi (zorunlu)</label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="İade gerekçesini belirtin..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTask(null)}>İptal</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectTaskMutation.isPending}
            >
              {rejectTaskMutation.isPending ? "İade ediliyor..." : "İade Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
