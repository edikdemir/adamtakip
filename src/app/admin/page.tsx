"use client"

import { useMemo } from "react"
import { BadgeCheck, CheckSquare, ClipboardList, Layers, Timer, UserCheck } from "lucide-react"
import { AdminJobPoolSection } from "@/components/admin/job-pool-section"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { PageHeader } from "@/components/layout/page-header"
import { CompactTaskTable } from "@/components/tasks/compact-task-table"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useTasks } from "@/hooks/use-tasks"
import { useSharedSecond } from "@/hooks/use-shared-second"
import { ADMIN_STATUS } from "@/lib/constants"
import { getEffectiveElapsedSeconds } from "@/lib/timer-utils"
import { cn, formatDuration } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

function LiveElapsed({ totalElapsedSeconds, startedAt }: { totalElapsedSeconds: number; startedAt: string | null }) {
  useSharedSecond()

  return (
    <span className="font-mono text-sm font-semibold text-indigo-700 tabular-nums">
      {formatDuration(getEffectiveElapsedSeconds(totalElapsedSeconds, startedAt))}
    </span>
  )
}

export default function AdminDashboardPage() {
  const { data: tasks = [], isLoading } = useTasks({ include_links: true })

  const stats = useMemo(
    () => ({
      havuzda: tasks.filter((task) => task.admin_status === ADMIN_STATUS.HAVUZDA).length,
      atandi: tasks.filter((task) => task.admin_status === ADMIN_STATUS.ATANDI).length,
      devamEdiyor: tasks.filter((task) => task.admin_status === ADMIN_STATUS.DEVAM_EDIYOR).length,
      tamamlandi: tasks.filter((task) => task.admin_status === ADMIN_STATUS.TAMAMLANDI).length,
      onaylandi: tasks.filter((task) => task.admin_status === ADMIN_STATUS.ONAYLANDI).length,
      aktifTimer: tasks.filter((task) => task.timer_started_at !== null).length,
    }),
    [tasks]
  )

  const activeTimerTasks = useMemo(() => tasks.filter((task) => task.timer_started_at !== null), [tasks])
  const pendingApprovalTasks = useMemo(
    () => tasks.filter((task) => task.admin_status === ADMIN_STATUS.TAMAMLANDI),
    [tasks]
  )

  return (
    <div className="space-y-5">
      {activeTimerTasks.length > 0 && (
        <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-3 overflow-x-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
              <Timer className="h-4 w-4" />
              <span>{activeTimerTasks.length} aktif</span>
            </div>
            <div className="h-4 w-px bg-indigo-200" />
            <div className="flex gap-2">
              {activeTimerTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 rounded-xl bg-white/80 px-2.5 py-1.5">
                  {task.assigned_user && (
                    <UserAvatar displayName={task.assigned_user.display_name} photoUrl={task.assigned_user.photo_url} size="sm" />
                  )}
                  <div className="text-xs">
                    <span className="font-medium text-zinc-700">{task.drawing_no}</span>
                    <span className="ml-1.5 font-mono font-semibold text-indigo-700">
                      <LiveElapsed totalElapsedSeconds={task.total_elapsed_seconds} startedAt={task.timer_started_at} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Operasyon Merkezi"
        title="Admin Genel Bakış"
        description="İş havuzu odaklı yeni görünümde filtreleme, onay ve aktif kronometre takibini aynı shell üzerinde yönetin."
        actions={
          <Button asChild size="sm" className="rounded-full">
            <a href="/admin/reports">Raporlara Git</a>
          </Button>
        }
      />

      <MetricCardStrip
        items={[
          { label: "İş havuzunda", value: isLoading ? "-" : stats.havuzda, icon: ClipboardList, tone: "slate" },
          { label: "Atandı", value: isLoading ? "-" : stats.atandi, icon: UserCheck, tone: "blue" },
          { label: "Devam ediyor", value: isLoading ? "-" : stats.devamEdiyor, icon: Layers, tone: "blue" },
          { label: "Onay bekleyen", value: isLoading ? "-" : stats.tamamlandi, icon: CheckSquare, tone: "amber" },
          { label: "Hazır", value: isLoading ? "-" : stats.onaylandi, icon: BadgeCheck, tone: "green" },
          { label: "Aktif kronometre", value: isLoading ? "-" : stats.aktifTimer, icon: Timer, tone: "rose" },
        ]}
      />

      <Tabs defaultValue="job-pool" className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="job-pool" className="rounded-full px-4 py-2">
              İş Havuzu
            </TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-full px-4 py-2">
              Onay Bekleyenler ({pendingApprovalTasks.length})
            </TabsTrigger>
            <TabsTrigger value="timers" className="rounded-full px-4 py-2">
              Aktif Kronometreler ({activeTimerTasks.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="job-pool" className="space-y-4">
          <AdminJobPoolSection />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <CompactTaskTable
            tasks={pendingApprovalTasks}
            isLoading={isLoading}
            rowClassName={() => "bg-amber-50/40"}
            emptyTitle="Onay bekleyen görev yok"
            emptyDescription="Tamamlanan görevler burada görünecek."
            renderActions={(task) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                İncele
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="timers" className="space-y-4">
          <CompactTaskTable
            tasks={activeTimerTasks}
            isLoading={isLoading}
            rowClassName={() => "bg-indigo-50/30"}
            emptyTitle="Aktif kronometre bulunmuyor"
            emptyDescription="Çalışanlar bir görev üzerinde süre başlattığında burada görünür."
            renderDuration={(task) => (
              <LiveElapsed totalElapsedSeconds={task.total_elapsed_seconds} startedAt={task.timer_started_at} />
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
