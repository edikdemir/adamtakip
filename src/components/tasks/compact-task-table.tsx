"use client"

import { useState } from "react"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { Task } from "@/types/task"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminStatusBadge, PriorityBadge } from "@/components/tasks/task-status-badge"
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer"
import { TaskLinkBadge } from "@/components/tasks/task-link-badge"
import { TaskNoteButton } from "@/components/tasks/task-note-button"
import { TimeDurationCell } from "@/components/tasks/time-duration-cell"
import { UserAvatar } from "@/components/ui/user-avatar"
import { cn, formatDate, getDeadlineStatus } from "@/lib/utils"

interface CompactTaskTableProps {
  tasks: Task[]
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  showAssignedUser?: boolean
  renderActions?: (task: Task) => React.ReactNode
  renderDuration?: (task: Task) => React.ReactNode
  rowClassName?: (task: Task) => string | undefined
}

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] ?? displayName,
    lastName: parts.slice(1).join(" "),
  }
}

function AssigneeCell({ task }: { task: Task }) {
  if (!task.assigned_user) {
    return <span className="block text-center text-xs text-zinc-400">-</span>
  }

  const { firstName, lastName } = splitDisplayName(task.assigned_user.display_name)

  return (
    <div className="mx-auto flex w-full max-w-[7rem] flex-col items-center justify-center gap-2 text-center">
      <UserAvatar displayName={task.assigned_user.display_name} photoUrl={task.assigned_user.photo_url} size="md" />
      <div className="min-w-0 space-y-0.5 leading-tight">
        <span className="block text-[11px] font-semibold text-zinc-700">{firstName}</span>
        <span className="block text-[11px] text-zinc-500">{lastName || "\u00A0"}</span>
      </div>
    </div>
  )
}

export function CompactTaskTable({
  tasks,
  isLoading = false,
  emptyTitle = "Görev bulunamadı",
  emptyDescription = "Filtreleri değiştirerek farklı görevleri görebilirsiniz.",
  showAssignedUser = true,
  renderActions,
  renderDuration,
  rowClassName,
}: CompactTaskTableProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/90 hover:bg-zinc-50/90">
              <TableHead className="hidden w-16 xl:table-cell">ID</TableHead>
              <TableHead className="hidden w-24 lg:table-cell">Proje</TableHead>
              <TableHead>Resim No / İş</TableHead>
              {showAssignedUser ? <TableHead className="hidden w-40 text-center xl:table-cell">Atanan</TableHead> : null}
              <TableHead className="hidden w-28 lg:table-cell">Durum</TableHead>
              <TableHead className="hidden w-24 lg:table-cell">Öncelik</TableHead>
              <TableHead className="hidden w-28 md:table-cell">Termin</TableHead>
              <TableHead className="w-40">Süre / Kronometre</TableHead>
              <TableHead className="w-36 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={showAssignedUser ? 9 : 8} className="py-14 text-center text-zinc-400">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showAssignedUser ? 9 : 8} className="py-14">
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-600">{emptyTitle}</p>
                    <p className="mt-1 text-sm text-zinc-400">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const deadlineStatus = getDeadlineStatus(task.planned_end)

                return (
                  <TableRow
                    key={task.id}
                    className={cn("cursor-pointer hover:bg-zinc-50/80", rowClassName?.(task))}
                    onClick={() => setSelectedTask(task)}
                  >
                    <TableCell className="hidden xl:table-cell">
                      <span className="font-mono text-xs text-zinc-400">#{task.id}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="font-medium text-zinc-900">{task.project?.code || "-"}</span>
                    </TableCell>
                    <TableCell className="min-w-0">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-zinc-950">{task.drawing_no || "-"}</span>
                          <TaskLinkBadge parent={task.linked_to_task} dependents={task.linked_tasks} />
                        </div>
                        <p className="max-w-[560px] truncate text-sm text-zinc-700" title={task.description}>
                          {task.description || "Yapılacak iş girilmedi"}
                        </p>
                        <div className="flex flex-wrap gap-1.5 text-[11px] text-zinc-500">
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5">{task.job_type?.name || "İş tipi yok"}</span>
                          {task.job_sub_type?.name ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5">{task.job_sub_type.name}</span>
                          ) : null}
                          {task.zone?.name ? <span className="rounded-full bg-zinc-100 px-2 py-0.5">{task.zone.name}</span> : null}
                          {task.location ? <span className="rounded-full bg-zinc-100 px-2 py-0.5">{task.location}</span> : null}
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 lg:hidden">
                            {task.project?.code || "Proje yok"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    {showAssignedUser ? (
                      <TableCell className="hidden text-center align-middle xl:table-cell">
                        <AssigneeCell task={task} />
                      </TableCell>
                    ) : null}
                    <TableCell className="hidden lg:table-cell">
                      <AdminStatusBadge status={task.admin_status} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <PriorityBadge priority={task.priority} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center text-sm",
                          deadlineStatus === "overdue" && "font-medium text-red-600",
                          deadlineStatus === "warning" && "font-medium text-amber-600",
                          deadlineStatus === "ok" && "text-zinc-500",
                          deadlineStatus === "none" && "text-zinc-400"
                        )}
                      >
                        {formatDate(task.planned_end)}
                        {deadlineStatus === "overdue" ? <AlertTriangle className="ml-1 h-3.5 w-3.5" /> : null}
                      </span>
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      {renderDuration ? renderDuration(task) : <TimeDurationCell task={task} />}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                        <TaskNoteButton taskId={task.id} drawingNo={task.drawing_no} />
                        {renderActions ? renderActions(task) : null}
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                          onClick={() => setSelectedTask(task)}
                          aria-label="Görev detayını aç"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        open={selectedTask !== null}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </>
  )
}
