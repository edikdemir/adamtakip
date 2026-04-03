"use client"
import { useState } from "react"
import { useTasks, useAssignTask } from "@/hooks/use-tasks"
import { useQuery } from "@tanstack/react-query"
import { Task } from "@/types/task"
import { AdminStatusBadge, PriorityBadge } from "@/components/tasks/task-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatHours } from "@/lib/utils"
import { ADMIN_STATUS } from "@/lib/constants"
import { UserPlus, Search, Users } from "lucide-react"

function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then(r => r.json()).then(r => r.data || []),
  })
}

export default function AssignmentsPage() {
  const [search, setSearch] = useState("")
  const [assignTask, setAssignTask] = useState<Task | null>(null)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])

  const { data: tasks = [], isLoading } = useTasks()
  const { data: users = [] } = useUsers()
  const assignTaskMutation = useAssignTask()

  // Show unassigned (havuzda) + already assigned for reassignment
  const assignable = tasks.filter((t: Task) => {
    const matchSearch = !search ||
      t.drawing_no.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.project?.code?.toLowerCase().includes(search.toLowerCase())
    return matchSearch && [ADMIN_STATUS.HAVUZDA, ADMIN_STATUS.ATANDI].includes(t.admin_status as "havuzda" | "atandi")
  })

  const handleAssign = async (taskId: number, userId: string) => {
    await assignTaskMutation.mutateAsync({ taskId, userId })
    setAssignTask(null)
    setSelectedUserId("")
  }

  // Workload summary per user
  const workload = users.map((u: { id: string; display_name: string; job_title?: string | null; email: string }) => ({
    ...u,
    activeTasks: tasks.filter((t: Task) => t.assigned_to === u.id && t.admin_status !== ADMIN_STATUS.ONAYLANDI).length,
    totalHours: tasks
      .filter((t: Task) => t.assigned_to === u.id && t.admin_status !== ADMIN_STATUS.ONAYLANDI)
      .reduce((acc: number, t: Task) => acc + t.total_elapsed_seconds / 3600, 0),
  })).sort((a: { activeTasks: number }, b: { activeTasks: number }) => b.activeTasks - a.activeTasks)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Atamalar</h1>
      </div>

      {/* Workload summary */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/60">
          <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Users className="h-4 w-4" /> Çalışan İş Yükü
          </h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {workload.map((u: { id: string; display_name: string; job_title?: string | null; email: string; activeTasks: number; totalHours: number }) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">{u.display_name}</p>
                {u.job_title && <p className="text-xs text-zinc-500">{u.job_title}</p>}
                <p className="text-xs text-zinc-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="font-semibold text-zinc-900">{u.activeTasks}</p>
                  <p className="text-xs text-zinc-400">aktif görev</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-900">{u.totalHours.toFixed(1)} sa</p>
                  <p className="text-xs text-zinc-400">toplam süre</p>
                </div>
              </div>
            </div>
          ))}
          {workload.length === 0 && (
            <p className="px-5 py-4 text-sm text-zinc-400">Henüz kullanıcı yok</p>
          )}
        </div>
      </div>

      {/* Assignable tasks */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Çizim no, açıklama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <span className="text-sm text-zinc-500">{assignable.length} atanabilir görev</span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/80">
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="w-20">Proje</TableHead>
                <TableHead className="w-28">İş Tipi</TableHead>
                <TableHead className="w-28">İş Alt Tipi</TableHead>
                <TableHead className="w-24">Zone</TableHead>
                <TableHead className="w-24">Mahal</TableHead>
                <TableHead className="w-28">Resim No</TableHead>
                <TableHead>Yapılacak İş</TableHead>
                <TableHead className="w-24">Bitiş</TableHead>
                <TableHead className="w-20">Öncelik</TableHead>
                <TableHead className="w-28">Durum</TableHead>
                <TableHead className="w-32">Atanan</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-10 text-zinc-400">Yükleniyor...</TableCell>
                </TableRow>
              ) : assignable.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-10 text-zinc-400">Atanabilir görev yok</TableCell>
                </TableRow>
              ) : assignable.map((task: Task) => (
                <TableRow key={task.id} className="hover:bg-zinc-50/50">
                  <TableCell className="font-mono text-xs text-zinc-400">#{task.id}</TableCell>
                  <TableCell className="font-medium text-zinc-800">{task.project?.code}</TableCell>
                  <TableCell className="text-sm text-zinc-700">{task.job_type?.name}</TableCell>
                  <TableCell className="text-sm text-zinc-500">{task.job_sub_type?.name}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{task.zone?.name || <span className="text-zinc-300">—</span>}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{task.location || <span className="text-zinc-300">—</span>}</TableCell>
                  <TableCell className="font-mono text-sm font-medium">{task.drawing_no}</TableCell>
                  <TableCell className="max-w-[160px]">
                    <p className="text-sm truncate" title={task.description}>{task.description}</p>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">{formatDate(task.planned_end)}</TableCell>
                  <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                  <TableCell><AdminStatusBadge status={task.admin_status} /></TableCell>
                  <TableCell>
                    {task.assigned_user ? (
                      <span className="text-sm text-zinc-700">{task.assigned_user.display_name}</span>
                    ) : (
                      <span className="text-xs text-zinc-400">Atanmamış</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => { setAssignTask(task); setSelectedUserId(task.assigned_to || "") }}
                    >
                      <UserPlus className="h-3 w-3" />
                      {task.assigned_to ? "Yeniden Ata" : "Ata"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Assign dialog */}
      <Dialog open={!!assignTask} onOpenChange={(open) => !open && setAssignTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görev Ata</DialogTitle>
            <DialogDescription>
              <strong>{assignTask?.drawing_no}</strong> ({assignTask?.project?.code}) görevini bir çalışana atayın.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium text-zinc-700">Çalışan Seçin</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Çalışan seçin..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u: { id: string; display_name: string; job_title?: string | null; email: string }) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex flex-col">
                      <span>{u.display_name}</span>
                      {u.job_title && <span className="text-xs text-zinc-500">{u.job_title}</span>}
                      <span className="text-xs text-zinc-400">{u.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTask(null)}>İptal</Button>
            <Button
              onClick={() => assignTask && handleAssign(assignTask.id, selectedUserId)}
              disabled={!selectedUserId || assignTaskMutation.isPending}
            >
              {assignTaskMutation.isPending ? "Atanıyor..." : "Ata"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
