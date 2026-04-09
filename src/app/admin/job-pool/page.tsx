"use client"
import { useState } from "react"
import { useTasks, useCreateTask, useApproveTask, useRejectTask, useAssignTask, useCancelTask, useReopenTask } from "@/hooks/use-tasks"
import { useQuery } from "@tanstack/react-query"
import { Task } from "@/types/task"
import { AdminStatusBadge, PriorityBadge } from "@/components/tasks/task-status-badge"
import { TimeDurationCell } from "@/components/tasks/time-duration-cell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { formatDate, cn } from "@/lib/utils"
import { ADMIN_STATUS, ADMIN_STATUS_LABELS } from "@/lib/constants"
import { Plus, Check, RotateCcw, UserPlus, Search, Ban, Undo2, FileSpreadsheet, Bell } from "lucide-react"
import { useLocations } from "@/hooks/use-locations"
import { TaskLinkBadge } from "@/components/tasks/task-link-badge"
import { ImportTasksDialog } from "@/components/tasks/import-tasks-dialog"
import { TaskNoteButton } from "@/components/tasks/task-note-button"
import { UserAvatar } from "@/components/ui/user-avatar"
import Link from "next/link"

function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: () => fetch("/api/projects").then(r => r.json()).then(r => r.data || []) })
}
function useJobTypes() {
  return useQuery({ queryKey: ["job-types"], queryFn: () => fetch("/api/job-types").then(r => r.json()).then(r => r.data || []) })
}
function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => fetch("/api/users").then(r => r.json()).then(r => r.data || []) })
}
function useZones(projectId: string) {
  return useQuery({
    queryKey: ["zones", projectId],
    queryFn: () =>
      fetch(`/api/zones?project_id=${projectId}`)
        .then(r => r.json())
        .then(r => {
          const data: { id: string; name: string }[] = r.data || []
          // Numerik sıralama: "Zone 1" < "Zone 2" < "Zone 10"
          return [...data].sort((a, b) => {
            const numA = parseInt(a.name.replace(/\D+/g, "") || "0", 10)
            const numB = parseInt(b.name.replace(/\D+/g, "") || "0", 10)
            if (numA !== numB) return numA - numB
            return a.name.localeCompare(b.name, "tr")
          })
        }),
    enabled: !!projectId,
  })
}

export default function JobPoolPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [workerFilter, setWorkerFilter] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [assignTask, setAssignTask] = useState<Task | null>(null)
  const [rejectTask, setRejectTask] = useState<Task | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [cancelTask, setCancelTask] = useState<Task | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const today = new Date().toISOString().slice(0, 10)

  const { data: tasks = [], isLoading } = useTasks(activeTab !== "all" ? { status: activeTab } : undefined)
  const createTask = useCreateTask()
  const approveTask = useApproveTask()
  const rejectTaskMutation = useRejectTask()
  const assignTaskMutation = useAssignTask()
  const cancelTaskMutation = useCancelTask()
  const reopenTaskMutation = useReopenTask()

  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] } = useJobTypes()
  const { data: users = [] } = useUsers()

  const [form, setForm] = useState({
    project_id: "", job_type_id: "", job_sub_type_id: "", zone_id: "",
    drawing_no: "", description: "", planned_start: today, planned_end: "",
    priority: "medium", location: "", admin_notes: "",
  })

  const { data: zones = [] } = useZones(form.project_id)
  const { data: locations = [] } = useLocations(form.project_id)
  const selectedJobType = jobTypes.find((jt: { id: string }) => jt.id === form.job_type_id)
  const subTypes = selectedJobType?.job_sub_types || []
  const selectedSubType = subTypes.find((st: { id: string }) => st.id === form.job_sub_type_id)
  const workItemOptions = (selectedSubType?.job_work_items || [])
    .slice().sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((wi: { name: string }) => wi.name)

  const filtered = tasks.filter((t: Task) => {
    const matchSearch = !search ||
      t.drawing_no.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.project?.code?.toLowerCase().includes(search.toLowerCase()) ||
      (t.zone?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.location ?? "").toLowerCase().includes(search.toLowerCase()) ||
      t.assigned_user?.display_name?.toLowerCase().includes(search.toLowerCase())
    const matchWorker = !workerFilter || t.assigned_to === workerFilter
    return matchSearch && matchWorker
  })

  const pendingCount = tasks.filter((t: Task) => t.admin_status === ADMIN_STATUS.TAMAMLANDI).length

  const handleCreate = async () => {
    const payload = {
      ...form,
      zone_id:       form.zone_id       || undefined,
      planned_start: form.planned_start || undefined,
      planned_end:   form.planned_end   || undefined,
      location:      form.location      || undefined,
      admin_notes:   form.admin_notes   || undefined,
    }
    const created = await createTask.mutateAsync(payload as Parameters<typeof createTask.mutateAsync>[0])
    if (form.admin_notes && created?.id) {
      await fetch(`/api/tasks/${created.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `📋 Admin Notu: ${form.admin_notes}` }),
      })
    }
    setCreateOpen(false)
    setForm({ project_id: "", job_type_id: "", job_sub_type_id: "", zone_id: "", drawing_no: "", description: "", planned_start: today, planned_end: "", priority: "medium", location: "", admin_notes: "" })
  }

  const handleAssign = async () => {
    if (!assignTask || !selectedUserId) return
    await assignTaskMutation.mutateAsync({ taskId: assignTask.id, userId: selectedUserId })
    setAssignTask(null)
    setSelectedUserId("")
  }

  const handleReject = async () => {
    if (!rejectTask) return
    await rejectTaskMutation.mutateAsync({ taskId: rejectTask.id, reason: rejectReason })
    setRejectTask(null)
    setRejectReason("")
  }

  const handleCancel = async () => {
    if (!cancelTask) return
    await cancelTaskMutation.mutateAsync({ taskId: cancelTask.id, reason: cancelReason })
    setCancelTask(null)
    setCancelReason("")
  }

  const colSpan = 18

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">İş Havuzu</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel İçe Aktar
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Yeni Görev
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setWorkerFilter(null) }}>
          <TabsList>
            <TabsTrigger value="all">Tümü</TabsTrigger>
            {Object.entries(ADMIN_STATUS_LABELS).map(([val, label]) => (
              <TabsTrigger key={val} value={val}>{label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {pendingCount > 0 && (
          <Button
            size="sm"
            variant={activeTab === ADMIN_STATUS.TAMAMLANDI ? "default" : "outline"}
            className="gap-2 h-9"
            onClick={() => { setActiveTab(ADMIN_STATUS.TAMAMLANDI); setWorkerFilter(null) }}
          >
            <Bell className="h-4 w-4" />
            Onay Bekleyen
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold ml-0.5">
              {pendingCount}
            </span>
          </Button>
        )}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      {/* Worker cards */}
      {(() => {
        const activeStatuses = [ADMIN_STATUS.ATANDI, ADMIN_STATUS.DEVAM_EDIYOR, ADMIN_STATUS.TAMAMLANDI]
        const workerMap = new Map<string, { id: string; display_name: string; photo_url?: string | null; count: number }>()
        for (const t of tasks) {
          if (!t.assigned_to || !t.assigned_user) continue
          if (!activeStatuses.includes(t.admin_status as typeof activeStatuses[number])) continue
          const u = t.assigned_user as { id: string; display_name: string; email: string; photo_url?: string | null }
          const userInfo = users.find((usr: { id: string; photo_url?: string | null }) => usr.id === u.id)
          const entry = workerMap.get(u.id) ?? { id: u.id, display_name: u.display_name, photo_url: userInfo?.photo_url ?? null, count: 0 }
          entry.count += 1
          workerMap.set(u.id, entry)
        }
        const workers = [...workerMap.values()].sort((a, b) => b.count - a.count)
        if (workers.length === 0) return null
        return (
          <div className="flex flex-wrap gap-3">
            {workerFilter && (
              <button
                onClick={() => setWorkerFilter(null)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-zinc-400 bg-zinc-50 min-w-[72px] hover:bg-zinc-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-semibold text-zinc-600">
                  ✕
                </div>
                <span className="text-xs font-medium text-zinc-600">Tümü</span>
              </button>
            )}
            {workers.map((w) => {
              const isSelected = workerFilter === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => setWorkerFilter(isSelected ? null : w.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl border-2 min-w-[72px] transition-colors",
                    isSelected
                      ? "border-zinc-900 bg-zinc-900"
                      : "border-zinc-200 bg-white hover:border-zinc-400"
                  )}
                >
                  <div className="relative">
                    <UserAvatar
                      displayName={w.display_name}
                      photoUrl={w.photo_url}
                      size="md"
                      className={isSelected ? "ring-2 ring-white" : ""}
                    />
                    <span className={cn(
                      "absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                      isSelected ? "bg-white text-zinc-900" : "bg-zinc-900 text-white"
                    )}>
                      {w.count}
                    </span>
                  </div>
                  <span className={cn("text-xs font-medium text-center leading-tight max-w-[64px] truncate", isSelected ? "text-white" : "text-zinc-700")}>
                    {w.display_name.split(" ")[0]}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })()}

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
              <TableHead className="w-24">Başlama</TableHead>
              <TableHead className="w-24">Hedef Bitiş</TableHead>
              <TableHead className="w-24">Kesin Bitiş</TableHead>
              <TableHead className="w-32">Atanan</TableHead>
              <TableHead className="w-20">Süre (sa)</TableHead>
              <TableHead className="w-28">Durum</TableHead>
              <TableHead className="w-20">Öncelik</TableHead>
              <TableHead className="w-28">Bağlı Görevler</TableHead>
              <TableHead className="w-10">Not</TableHead>
              <TableHead className="w-28 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={colSpan} className="text-center py-12 text-zinc-400">Yükleniyor...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={colSpan} className="text-center py-12 text-zinc-400">Görev bulunamadı</TableCell></TableRow>
            ) : filtered.map((task: Task) => (
              <TableRow key={task.id} className={cn(
                "hover:bg-zinc-50/50",
                task.admin_status === ADMIN_STATUS.TAMAMLANDI && "bg-amber-50/70 border-l-2 border-amber-400 animate-pulse"
              )}>
                <TableCell className="font-mono text-xs text-zinc-400">#{task.id}</TableCell>
                <TableCell className="font-medium text-zinc-800">{task.project?.code}</TableCell>
                <TableCell className="text-sm text-zinc-700">{task.job_type?.name}</TableCell>
                <TableCell className="text-sm text-zinc-500">{task.job_sub_type?.name}</TableCell>
                <TableCell className="text-sm text-zinc-600">{task.zone?.name || <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell className="text-sm text-zinc-600">{task.location || <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell>
                  <span className="font-mono text-sm font-medium">{task.drawing_no}</span>
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <p className="text-sm truncate" title={task.description}>{task.description}</p>
                </TableCell>
                <TableCell className="text-sm text-zinc-500">{formatDate(task.planned_start)}</TableCell>
                <TableCell className="text-sm text-zinc-500">{formatDate(task.planned_end)}</TableCell>
                <TableCell className="text-sm text-zinc-500">{task.approved_at ? formatDate(task.approved_at) : <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell>
                  {task.assigned_user ? (
                    <Link href={`/admin/users/${task.assigned_user.id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <UserAvatar displayName={task.assigned_user.display_name} photoUrl={(task.assigned_user as { photo_url?: string | null }).photo_url} size="sm" />
                      <span className="text-xs font-medium text-indigo-700 hover:underline truncate max-w-[80px]">{task.assigned_user.display_name}</span>
                    </Link>
                  ) : <span className="text-zinc-400 text-xs">—</span>}
                </TableCell>
                <TableCell><TimeDurationCell task={task} /></TableCell>
                <TableCell><AdminStatusBadge status={task.admin_status} /></TableCell>
                <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                <TableCell>
                  <TaskLinkBadge parent={task.linked_to_task} dependents={task.linked_tasks} />
                </TableCell>
                <TableCell>
                  <TaskNoteButton taskId={task.id} drawingNo={task.drawing_no} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {(task.admin_status === "havuzda" || task.admin_status === "atandi") && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setAssignTask(task); setSelectedUserId(task.assigned_to || "") }}>
                        <UserPlus className="h-3.5 w-3.5" /> Ata
                      </Button>
                    )}
                    {task.admin_status === "tamamlandi" && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700 gap-1" onClick={() => approveTask.mutate(task.id)}>
                          <Check className="h-3.5 w-3.5" /> Onayla
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600 gap-1" onClick={() => setRejectTask(task)}>
                          <RotateCcw className="h-3.5 w-3.5" /> Revizeye Gönder
                        </Button>
                      </>
                    )}
                    {task.admin_status !== "iptal" && task.admin_status !== "onaylandi" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-red-600 gap-1" onClick={() => setCancelTask(task)}>
                        <Ban className="h-3.5 w-3.5" /> İptal
                      </Button>
                    )}
                    {task.admin_status === "iptal" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 gap-1" onClick={() => reopenTaskMutation.mutate(task.id)} disabled={reopenTaskMutation.isPending}>
                        <Undo2 className="h-3.5 w-3.5" /> Tekrar Aç
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Yeni Görev Oluştur</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Proje</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm((f) => ({ ...f, project_id: v, zone_id: "", location: "" }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Proje seç" /></SelectTrigger>
                  <SelectContent>{projects.map((p: { id: string; code: string; name: string }) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>İş Tipi</Label>
                <Select value={form.job_type_id} onValueChange={(v) => setForm((f) => ({ ...f, job_type_id: v, job_sub_type_id: "", description: "" }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="İş tipi seç" /></SelectTrigger>
                  <SelectContent>{jobTypes.map((jt: { id: string; name: string }) => <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>İş Alt Tipi</Label>
                <Select value={form.job_sub_type_id} onValueChange={(v) => setForm((f) => ({ ...f, job_sub_type_id: v, description: "" }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Alt tip seç" /></SelectTrigger>
                  <SelectContent>{subTypes.map((st: { id: string; name: string }) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Öncelik</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Düşük</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="high">Yüksek</SelectItem>
                    <SelectItem value="urgent">Acil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Zone</Label>
                <Select
                  value={form.zone_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, zone_id: v, location: "" }))}
                  disabled={!form.project_id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={form.project_id ? "Zone seç ((opsiyonel))" : "Önce proje seçin"} />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z: { id: string; name: string }) => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                    {zones.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-zinc-400">Bu projede zone tanımlı değil</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mahal</Label>
                <Select
                  value={form.location || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, location: v === "none" ? "" : v }))}
                  disabled={!form.project_id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={form.project_id ? "Mahal seç (opsiyonel)" : "Önce proje seçin"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Seçilmedi —</SelectItem>
                    {locations.map((loc: { id: string; name: string }) => (
                      <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                    ))}
                    {locations.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-zinc-400">Bu projede mahal tanımlı değil</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Resim No</Label>
              <Input value={form.drawing_no} onChange={(e) => setForm((f) => ({ ...f, drawing_no: e.target.value }))} placeholder="Örn: R-202" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>Yapılacak İş</Label>
              {workItemOptions.length > 0 ? (
                <Combobox
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                  options={workItemOptions}
                  placeholder="Seç veya yaz..."
                />
              ) : (
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Yapılacak işi açıklayın" className="h-9" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Başlama Tarihi</Label>
                <Input type="date" value={form.planned_start} onChange={(e) => setForm((f) => ({ ...f, planned_start: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label>Hedef Bitiş Tarihi</Label>
                <Input type="date" value={form.planned_end} onChange={(e) => setForm((f) => ({ ...f, planned_end: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <Textarea value={form.admin_notes} onChange={(e) => setForm((f) => ({ ...f, admin_notes: e.target.value }))} placeholder="Opsiyonel notlar..." className="h-20 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
            <Button onClick={handleCreate} disabled={createTask.isPending || !form.project_id || !form.job_type_id || !form.job_sub_type_id || !form.drawing_no || !form.description}>
              {createTask.isPending ? "Kaydediliyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assignTask} onOpenChange={(open) => !open && setAssignTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Görev Ata</DialogTitle>
            <DialogDescription>#{assignTask?.id} — {assignTask?.drawing_no} — {assignTask?.description}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">Kullanıcı Seç</Label>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {users.map((u: { id: string; display_name: string; job_title?: string | null; photo_url?: string | null }) => {
                const isSelected = selectedUserId === u.id
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(isSelected ? "" : u.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                      isSelected ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    <UserAvatar displayName={u.display_name} photoUrl={u.photo_url} size="sm" />
                    <div className="min-w-0">
                      <p className={cn("text-xs font-semibold truncate", isSelected ? "text-indigo-700" : "text-zinc-800")}>{u.display_name}</p>
                      {u.job_title && <p className="text-[10px] text-zinc-500 truncate">{u.job_title}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTask(null)}>İptal</Button>
            <Button onClick={handleAssign} disabled={!selectedUserId || assignTaskMutation.isPending}>Ata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportTasksDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Cancel Dialog */}
      <Dialog open={!!cancelTask} onOpenChange={(open) => !open && setCancelTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi İptal Et</DialogTitle>
            <DialogDescription>#{cancelTask?.id} — {cancelTask?.drawing_no} görevi iptal edilecek. Timer çalışıyorsa durdurulur. Daha sonra tekrar açılabilir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>İptal Sebebi <span className="text-zinc-400">((opsiyonel))</span></Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="İptal gerekçesi..." className="resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTask(null)}>Vazgeç</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelTaskMutation.isPending}>İptal Et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTask} onOpenChange={(open) => !open && setRejectTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revizeye Gönder</DialogTitle>
            <DialogDescription>#{rejectTask?.id} — {rejectTask?.drawing_no} görevi revizeye gönderilecek. Çalışana e-posta bildirimi gönderilecektir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Revize Sebebi <span className="text-zinc-400">(opsiyonel)</span></Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Düzeltilmesi gereken..." className="resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTask(null)}>İptal</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectTaskMutation.isPending}>Revizeye Gönder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
