"use client"
import { useState } from "react"
import { useTasks, useCreateTask, useApproveTask, useRejectTask, useAssignTask } from "@/hooks/use-tasks"
import { useQuery } from "@tanstack/react-query"
import { Task } from "@/types/task"
import { AdminStatusBadge, PriorityBadge } from "@/components/tasks/task-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, formatHours } from "@/lib/utils"
import { ADMIN_STATUS, ADMIN_STATUS_LABELS } from "@/lib/constants"
import { Plus, Check, RotateCcw, UserPlus, Search } from "lucide-react"
import { TaskLinkBadge } from "@/components/tasks/task-link-badge"

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
    queryFn: () => fetch(`/api/zones?project_id=${projectId}`).then(r => r.json()).then(r => r.data || []),
    enabled: !!projectId,
  })
}

export default function JobPoolPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [assignTask, setAssignTask] = useState<Task | null>(null)
  const [rejectTask, setRejectTask] = useState<Task | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")

  const { data: tasks = [], isLoading } = useTasks(activeTab !== "all" ? { status: activeTab } : undefined)
  const createTask = useCreateTask()
  const approveTask = useApproveTask()
  const rejectTaskMutation = useRejectTask()
  const assignTaskMutation = useAssignTask()

  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] } = useJobTypes()
  const { data: users = [] } = useUsers()

  const [form, setForm] = useState({
    project_id: "", job_type_id: "", job_sub_type_id: "", zone_id: "",
    drawing_no: "", description: "", planned_start: "", planned_end: "",
    priority: "medium", location: "", admin_notes: "",
  })

  const { data: zones = [] } = useZones(form.project_id)
  const selectedJobType = jobTypes.find((jt: { id: string }) => jt.id === form.job_type_id)
  const subTypes = selectedJobType?.job_sub_types || []

  const filtered = tasks.filter((t: Task) => {
    return !search ||
      t.drawing_no.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.project?.code?.toLowerCase().includes(search.toLowerCase()) ||
      (t.zone?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.location ?? "").toLowerCase().includes(search.toLowerCase()) ||
      t.assigned_user?.display_name?.toLowerCase().includes(search.toLowerCase())
  })

  const handleCreate = async () => {
    await createTask.mutateAsync(form as Parameters<typeof createTask.mutateAsync>[0])
    setCreateOpen(false)
    setForm({ project_id: "", job_type_id: "", job_sub_type_id: "", zone_id: "", drawing_no: "", description: "", planned_start: "", planned_end: "", priority: "medium", location: "", admin_notes: "" })
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

  const colSpan = 15

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">İş Havuzu</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Yeni Görev
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Tümü</TabsTrigger>
            {Object.entries(ADMIN_STATUS_LABELS).map(([val, label]) => (
              <TabsTrigger key={val} value={val}>{label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
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
              <TableHead className="w-24">Başlama</TableHead>
              <TableHead className="w-24">Bitiş</TableHead>
              <TableHead className="w-32">Atanan</TableHead>
              <TableHead className="w-20">Süre (sa)</TableHead>
              <TableHead className="w-28">Durum</TableHead>
              <TableHead className="w-20">Öncelik</TableHead>
              <TableHead className="w-28 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={colSpan} className="text-center py-12 text-zinc-400">Yükleniyor...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={colSpan} className="text-center py-12 text-zinc-400">Görev bulunamadı</TableCell></TableRow>
            ) : filtered.map((task: Task) => (
              <TableRow key={task.id} className="hover:bg-zinc-50/50">
                <TableCell className="font-mono text-xs text-zinc-400">#{task.id}</TableCell>
                <TableCell className="font-medium text-zinc-800">{task.project?.code}</TableCell>
                <TableCell className="text-sm text-zinc-700">{task.job_type?.name}</TableCell>
                <TableCell className="text-sm text-zinc-500">{task.job_sub_type?.name}</TableCell>
                <TableCell className="text-sm text-zinc-600">{task.zone?.name || <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell className="text-sm text-zinc-600">{task.location || <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-medium">{task.drawing_no}</span>
                    <TaskLinkBadge parent={task.linked_to_task} dependents={task.linked_tasks} />
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <p className="text-sm truncate" title={task.description}>{task.description}</p>
                </TableCell>
                <TableCell className="text-sm text-zinc-500">{formatDate(task.planned_start)}</TableCell>
                <TableCell className="text-sm text-zinc-500">{formatDate(task.planned_end)}</TableCell>
                <TableCell className="text-sm">{task.assigned_user?.display_name || <span className="text-zinc-400">—</span>}</TableCell>
                <TableCell className="text-sm font-medium">{formatHours(task.total_elapsed_seconds)}</TableCell>
                <TableCell><AdminStatusBadge status={task.admin_status} /></TableCell>
                <TableCell><PriorityBadge priority={task.priority} /></TableCell>
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
                          <RotateCcw className="h-3.5 w-3.5" /> İade
                        </Button>
                      </>
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
                <Select value={form.project_id} onValueChange={(v) => setForm((f) => ({ ...f, project_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Proje seç" /></SelectTrigger>
                  <SelectContent>{projects.map((p: { id: string; code: string; name: string }) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>İş Tipi</Label>
                <Select value={form.job_type_id} onValueChange={(v) => setForm((f) => ({ ...f, job_type_id: v, job_sub_type_id: "" }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="İş tipi seç" /></SelectTrigger>
                  <SelectContent>{jobTypes.map((jt: { id: string; name: string }) => <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>İş Alt Tipi</Label>
                <Select value={form.job_sub_type_id} onValueChange={(v) => setForm((f) => ({ ...f, job_sub_type_id: v }))}>
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
                  onValueChange={(v) => setForm((f) => ({ ...f, zone_id: v }))}
                  disabled={!form.project_id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={form.project_id ? "Zone seç (opsiyonel)" : "Önce proje seçin"} />
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
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Örn: Makine Dairesi" className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Resim No</Label>
              <Input value={form.drawing_no} onChange={(e) => setForm((f) => ({ ...f, drawing_no: e.target.value }))} placeholder="Örn: R-202" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>Yapılacak İş</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Yapılacak işi açıklayın" className="h-9" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görev Ata</DialogTitle>
            <DialogDescription>#{assignTask?.id} — {assignTask?.drawing_no} — {assignTask?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Kullanıcı Seç</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger><SelectValue placeholder="Kullanıcı seç" /></SelectTrigger>
              <SelectContent>
                {users.map((u: { id: string; display_name: string; job_title?: string | null; email: string }) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex flex-col">
                      <span>{u.display_name}</span>
                      {u.job_title && <span className="text-xs text-zinc-500">{u.job_title}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTask(null)}>İptal</Button>
            <Button onClick={handleAssign} disabled={!selectedUserId || assignTaskMutation.isPending}>Ata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTask} onOpenChange={(open) => !open && setRejectTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi İade Et</DialogTitle>
            <DialogDescription>#{rejectTask?.id} — {rejectTask?.drawing_no} görevi kullanıcıya iade edilecek.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>İade Sebebi <span className="text-zinc-400">(opsiyonel)</span></Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Düzeltilmesi gereken..." className="resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTask(null)}>İptal</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectTaskMutation.isPending}>İade Et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
