"use client"

import { useState } from "react"
import { BadgeCheck, Ban, Check, CheckSquare, ClipboardList, Layers, RotateCcw, Timer, UserCheck } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AdminJobPoolSection } from "@/components/admin/job-pool-section"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { CompactTaskTable } from "@/components/tasks/compact-task-table"
import { useApproveTask, useCancelTask, useRejectTask, useTaskList, useTaskSummary } from "@/hooks/use-tasks"
import { useSharedSecond } from "@/hooks/use-shared-second"
import { ADMIN_STATUS } from "@/lib/constants"
import { getEffectiveElapsedSeconds } from "@/lib/timer-utils"
import { formatDuration } from "@/lib/utils"
import { Task } from "@/types/task"

const TASK_PAGE_SIZE = 100

function LiveElapsed({ totalElapsedSeconds, startedAt }: { totalElapsedSeconds: number; startedAt: string | null }) {
  useSharedSecond()

  return (
    <span className="font-mono text-sm font-semibold tabular-nums text-indigo-700">
      {formatDuration(getEffectiveElapsedSeconds(totalElapsedSeconds, startedAt))}
    </span>
  )
}

export default function AdminDashboardPage() {
  const [approvalsOffset, setApprovalsOffset] = useState(0)
  const [timersOffset, setTimersOffset] = useState(0)
  const { data: summary, isLoading: isSummaryLoading } = useTaskSummary()
  const { data: approvalsList, isLoading: isApprovalsLoading } = useTaskList({
    status: ADMIN_STATUS.TAMAMLANDI,
    include_links: true,
    limit: TASK_PAGE_SIZE,
    offset: approvalsOffset,
  })
  const { data: timersList, isLoading: isTimersLoading } = useTaskList({
    timer_state: "running",
    include_links: true,
    limit: TASK_PAGE_SIZE,
    offset: timersOffset,
  })
  const approveTask = useApproveTask()
  const rejectTaskMutation = useRejectTask()
  const cancelTaskMutation = useCancelTask()

  const [rejectTask, setRejectTask] = useState<Task | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [cancelTask, setCancelTask] = useState<Task | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  const stats = {
    havuzda: summary?.by_status?.[ADMIN_STATUS.HAVUZDA] ?? 0,
    atandi: summary?.by_status?.[ADMIN_STATUS.ATANDI] ?? 0,
    devamEdiyor: summary?.by_status?.[ADMIN_STATUS.DEVAM_EDIYOR] ?? 0,
    tamamlandi: summary?.by_status?.[ADMIN_STATUS.TAMAMLANDI] ?? 0,
    onaylandi: summary?.by_status?.[ADMIN_STATUS.ONAYLANDI] ?? 0,
    aktifTimer: summary?.active_timer_count ?? 0,
  }
  const activeTimerTasks = timersList?.data ?? []
  const pendingApprovalTasks = approvalsList?.data ?? []

  const handleReject = async () => {
    if (!rejectTask) {
      return
    }

    await rejectTaskMutation.mutateAsync({ taskId: rejectTask.id, reason: rejectReason })
    setRejectTask(null)
    setRejectReason("")
  }

  const handleCancel = async () => {
    if (!cancelTask) {
      return
    }

    await cancelTaskMutation.mutateAsync({ taskId: cancelTask.id, reason: cancelReason })
    setCancelTask(null)
    setCancelReason("")
  }

  return (
    <div className="space-y-5">
      <MetricCardStrip
        items={[
          { label: "İş havuzunda", value: isSummaryLoading ? "-" : stats.havuzda, icon: ClipboardList, tone: "slate" },
          { label: "Atandı", value: isSummaryLoading ? "-" : stats.atandi, icon: UserCheck, tone: "blue" },
          { label: "Devam ediyor", value: isSummaryLoading ? "-" : stats.devamEdiyor, icon: Layers, tone: "blue" },
          { label: "Onay bekleyen", value: isSummaryLoading ? "-" : stats.tamamlandi, icon: CheckSquare, tone: "amber" },
          { label: "Hazır", value: isSummaryLoading ? "-" : stats.onaylandi, icon: BadgeCheck, tone: "green" },
          { label: "Aktif kronometre", value: isSummaryLoading ? "-" : stats.aktifTimer, icon: Timer, tone: "rose" },
        ]}
      />

      <Tabs defaultValue="job-pool" className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="job-pool" className="rounded-full px-4 py-2">
              İş Havuzu
            </TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-full px-4 py-2">
              Onay Bekleyenler ({stats.tamamlandi})
            </TabsTrigger>
            <TabsTrigger value="timers" className="rounded-full px-4 py-2">
              Aktif Kronometreler ({stats.aktifTimer})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="job-pool" className="space-y-4">
          <AdminJobPoolSection />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <CompactTaskTable
            tasks={pendingApprovalTasks}
            isLoading={isApprovalsLoading}
            pagination={{
              total: approvalsList?.meta.total ?? 0,
              offset: approvalsList?.meta.offset ?? approvalsOffset,
              limit: approvalsList?.meta.limit ?? TASK_PAGE_SIZE,
              hasMore: approvalsList?.meta.has_more ?? false,
              onOffsetChange: setApprovalsOffset,
            }}
            rowClassName={() => "bg-amber-50/40"}
            emptyTitle="Onay bekleyen görev yok"
            emptyDescription="Tamamlanan görevler burada görünecek."
            renderActions={(task) => (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() => approveTask.mutate(task.id)}
                  disabled={approveTask.isPending}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Onayla
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  onClick={() => {
                    setRejectTask(task)
                    setRejectReason("")
                  }}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Revize
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs text-zinc-500 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    setCancelTask(task)
                    setCancelReason("")
                  }}
                >
                  <Ban className="mr-1 h-3.5 w-3.5" />
                  İptal
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="timers" className="space-y-4">
          <CompactTaskTable
            tasks={activeTimerTasks}
            isLoading={isTimersLoading}
            pagination={{
              total: timersList?.meta.total ?? 0,
              offset: timersList?.meta.offset ?? timersOffset,
              limit: timersList?.meta.limit ?? TASK_PAGE_SIZE,
              hasMore: timersList?.meta.has_more ?? false,
              onOffsetChange: setTimersOffset,
            }}
            rowClassName={() => "bg-indigo-50/30"}
            emptyTitle="Aktif kronometre bulunmuyor"
            emptyDescription="Çalışanlar bir görev üzerinde süre başlattığında burada görünür."
            renderDuration={(task) => (
              <LiveElapsed totalElapsedSeconds={task.total_elapsed_seconds} startedAt={task.timer_started_at} />
            )}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectTask} onOpenChange={(open) => !open && setRejectTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revizeye Gönder</DialogTitle>
            <DialogDescription>
              <strong>{rejectTask?.drawing_no}</strong> görevi revizeye gönderilecek. Çalışana e-posta bildirimi
              iletilecek.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-zinc-700">Revize Sebebi</label>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Düzeltilmesi gereken noktaları yazın..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTask(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectTaskMutation.isPending}
            >
              {rejectTaskMutation.isPending ? "Gönderiliyor..." : "Revizeye Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTask} onOpenChange={(open) => !open && setCancelTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi İptal Et</DialogTitle>
            <DialogDescription>
              <strong>{cancelTask?.drawing_no}</strong> görevi iptal edilecek. Timer çalışıyorsa durdurulur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-zinc-700">İptal Sebebi</label>
            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="İptal gerekçesini yazın..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTask(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelTaskMutation.isPending}>
              {cancelTaskMutation.isPending ? "İptal Ediliyor..." : "İptal Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
