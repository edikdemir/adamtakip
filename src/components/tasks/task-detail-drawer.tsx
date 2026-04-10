"use client"

import { Clock3, Link2, MapPin, Timer, User2 } from "lucide-react"
import { Task } from "@/types/task"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PriorityBadge, AdminStatusBadge } from "@/components/tasks/task-status-badge"
import { TaskNoteButton } from "@/components/tasks/task-note-button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { getEffectiveElapsedSeconds } from "@/lib/timer-utils"
import { formatDate, formatDateTime, formatDuration, formatHours } from "@/lib/utils"

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-2 last:border-b-0">
      <span className="min-w-[104px] text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <div className="min-w-0 flex-1 text-right text-sm text-zinc-700">{value}</div>
    </div>
  )
}

export function TaskDetailDrawer({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!task) {
    return null
  }

  const liveSeconds = getEffectiveElapsedSeconds(task.total_elapsed_seconds, task.timer_started_at)
  const totalHours = formatHours(task.total_elapsed_seconds + (task.manual_hours ?? 0) * 3600)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 h-screen max-w-[560px] translate-x-0 translate-y-0 rounded-none border-l border-zinc-200 p-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
        <div className="flex h-full flex-col bg-white">
          <DialogHeader className="border-b border-zinc-100 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                  {task.project?.code || "Projelendirilmemiş"}
                </p>
                <DialogTitle className="mt-2 truncate text-2xl font-semibold text-zinc-950">{task.drawing_no}</DialogTitle>
                <DialogDescription className="mt-2 text-sm text-zinc-500">{task.description}</DialogDescription>
              </div>
              <TaskNoteButton taskId={task.id} drawingNo={task.drawing_no} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <AdminStatusBadge status={task.admin_status} />
              <PriorityBadge priority={task.priority} />
              {task.timer_started_at ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Aktif kronometre
                </span>
              ) : null}
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <section className="rounded-[24px] border border-zinc-200 bg-zinc-50/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Timer className="h-4 w-4 text-blue-700" />
                Süre Özeti
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-zinc-400">Canlı süre</p>
                  <p className="mt-1 font-mono text-base font-semibold text-zinc-950">{formatDuration(liveSeconds)}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-zinc-400">Timer saati</p>
                  <p className="mt-1 text-base font-semibold text-zinc-950">{formatHours(task.total_elapsed_seconds)} sa</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-zinc-400">Toplam saat</p>
                  <p className="mt-1 text-base font-semibold text-zinc-950">{totalHours} sa</p>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-zinc-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <User2 className="h-4 w-4 text-blue-700" />
                Operasyon Bilgileri
              </div>
              <InfoRow
                label="Atanan"
                value={
                  task.assigned_user ? (
                    <span className="inline-flex items-center gap-2">
                      <UserAvatar
                        displayName={task.assigned_user.display_name}
                        photoUrl={task.assigned_user.photo_url}
                        size="sm"
                      />
                      {task.assigned_user.display_name}
                    </span>
                  ) : (
                    "Atanmamış"
                  )
                }
              />
              <InfoRow label="İş tipi" value={task.job_type?.name || "-"} />
              <InfoRow label="Alt tip" value={task.job_sub_type?.name || "-"} />
              <InfoRow label="Zone" value={task.zone?.name || "-"} />
              <InfoRow label="Mahal" value={task.location || "-"} />
              <InfoRow label="Manuel süre" value={`${(task.manual_hours ?? 0).toFixed(2)} sa`} />
              <InfoRow label="Admin notu" value={task.admin_notes || "-"} />
            </section>

            <section className="rounded-[24px] border border-zinc-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Clock3 className="h-4 w-4 text-blue-700" />
                Takvim
              </div>
              <InfoRow label="Başlangıç" value={formatDate(task.planned_start)} />
              <InfoRow label="Hedef bitiş" value={formatDate(task.planned_end)} />
              <InfoRow label="Tamamlanma" value={formatDate(task.completion_date)} />
              <InfoRow label="Onay" value={formatDate(task.approved_at)} />
              <InfoRow label="Oluşturulma" value={formatDateTime(task.created_at)} />
              <InfoRow label="Güncelleme" value={formatDateTime(task.updated_at)} />
            </section>

            <section className="rounded-[24px] border border-zinc-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <MapPin className="h-4 w-4 text-blue-700" />
                İş Özeti
              </div>
              <p className="text-sm leading-6 text-zinc-600">{task.description}</p>
            </section>

            <section className="rounded-[24px] border border-zinc-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Link2 className="h-4 w-4 text-blue-700" />
                Bağlı Görevler
              </div>
              {task.linked_to_task || (task.linked_tasks && task.linked_tasks.length > 0) ? (
                <div className="space-y-2">
                  {task.linked_to_task ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Bağımlı olduğu ana görev</p>
                      <p className="mt-1 font-medium">
                        #{task.linked_to_task.id} · {task.linked_to_task.drawing_no}
                      </p>
                      <p className="mt-1 text-xs">{task.linked_to_task.description}</p>
                    </div>
                  ) : null}

                  {task.linked_tasks && task.linked_tasks.length > 0 ? (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Bağımlı alt görevler</p>
                      <div className="mt-2 space-y-2">
                        {task.linked_tasks.map((linkedTask) => (
                          <div key={linkedTask.id} className="rounded-xl bg-white/80 px-3 py-2">
                            <p className="font-medium">
                              #{linkedTask.id} · {linkedTask.drawing_no}
                            </p>
                            <p className="mt-1 text-xs text-violet-700">{linkedTask.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">Bu görev için bağlı görev tanımı bulunmuyor.</p>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
