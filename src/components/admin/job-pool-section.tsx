"use client"

import { Ban, Check, FileSpreadsheet, Plus, RotateCcw, Undo2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { JobPoolDialogs } from "@/components/admin/job-pool/job-pool-dialogs"
import { useAdminJobPool } from "@/components/admin/job-pool/use-admin-job-pool"
import { CompactTaskTable } from "@/components/tasks/compact-task-table"
import { TaskFilterPanel } from "@/components/tasks/task-filter-panel"
import { ADMIN_STATUS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function AdminJobPoolSection() {
  const state = useAdminJobPool()

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">Ana Operasyon Alanı</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">İş Havuzu</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
              Gelişmiş filtrelerle görevleri daraltın, satıra tıklayarak detay panelini açın ve işlemleri aynı akıştan yönetin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => state.setImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel İçe Aktar
            </Button>
            <Button size="sm" className="gap-2 rounded-full" onClick={() => state.setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Yeni Görev
            </Button>
          </div>
        </div>
      </div>

      <TaskFilterPanel
        filters={state.filters}
        onChange={state.setFilter}
        onReset={state.resetFilters}
        projects={state.projects}
        users={state.users}
        jobTypes={state.jobTypes}
        zones={state.zones}
        locations={state.locations}
        resultCount={state.tasks.length}
        workerHighlights={state.workerHighlights}
      />

      <CompactTaskTable
        tasks={state.tasks}
        isLoading={state.isLoading}
        rowClassName={(task) =>
          cn(
            task.admin_status === ADMIN_STATUS.TAMAMLANDI && "bg-amber-50/50",
            task.timer_started_at && task.admin_status !== ADMIN_STATUS.TAMAMLANDI && "bg-indigo-50/30"
          )
        }
        renderActions={(task) => (
          <div className="flex items-center gap-1">
            {task.admin_status === ADMIN_STATUS.HAVUZDA || task.admin_status === ADMIN_STATUS.ATANDI ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => {
                  state.setAssignTask(task)
                  state.setSelectedUserId(task.assigned_to || "")
                }}
              >
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                Ata
              </Button>
            ) : null}

            {task.admin_status === ADMIN_STATUS.TAMAMLANDI ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() => state.approveTask.mutate(task.id)}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Onayla
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  onClick={() => state.setRejectTask(task)}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Revize
                </Button>
              </>
            ) : null}

            {task.admin_status !== ADMIN_STATUS.IPTAL && task.admin_status !== ADMIN_STATUS.ONAYLANDI ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-xs text-zinc-500 hover:bg-red-50 hover:text-red-700"
                onClick={() => state.setCancelTask(task)}
              >
                <Ban className="mr-1 h-3.5 w-3.5" />
                İptal
              </Button>
            ) : null}

            {task.admin_status === ADMIN_STATUS.IPTAL ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                onClick={() => state.reopenTaskMutation.mutate(task.id)}
              >
                <Undo2 className="mr-1 h-3.5 w-3.5" />
                Aç
              </Button>
            ) : null}
          </div>
        )}
      />

      <JobPoolDialogs state={state} />
    </section>
  )
}
