"use client"

import { AdminJobPoolState } from "@/components/admin/job-pool/use-admin-job-pool"
import { ImportTasksDialog } from "@/components/tasks/import-tasks-dialog"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/ui/user-avatar"
import { cn } from "@/lib/utils"

interface JobPoolDialogsProps {
  state: AdminJobPoolState
}

export function JobPoolDialogs({ state }: JobPoolDialogsProps) {
  const assignableUsers = state.users.filter((user) => user.is_active)

  return (
    <>
      <Dialog open={state.createOpen} onOpenChange={state.setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Görev Oluştur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Proje *</Label>
                <Select
                  value={state.form.project_id}
                  onValueChange={(value) =>
                    state.setForm((current) => ({ ...current, project_id: value, zone_id: "", location: "" }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Proje seç" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.code}
                        {project.name ? ` - ${project.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>İş Tipi *</Label>
                <Select
                  value={state.form.job_type_id}
                  onValueChange={(value) =>
                    state.setForm((current) => ({
                      ...current,
                      job_type_id: value,
                      job_sub_type_id: "",
                      description: "",
                    }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="İş tipi seç" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.jobTypes.map((jobType) => (
                      <SelectItem key={jobType.id} value={jobType.id}>
                        {jobType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>İş Alt Tipi *</Label>
                <Select
                  value={state.form.job_sub_type_id}
                  onValueChange={(value) =>
                    state.setForm((current) => ({ ...current, job_sub_type_id: value, description: "" }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Alt tip seç" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.subTypes.map((subType) => (
                      <SelectItem key={subType.id} value={subType.id}>
                        {subType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Öncelik</Label>
                <Select
                  value={state.form.priority}
                  onValueChange={(value) =>
                    state.setForm((current) => ({
                      ...current,
                      priority: value as AdminJobPoolState["form"]["priority"],
                    }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
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
                  value={state.form.zone_id}
                  onValueChange={(value) =>
                    state.setForm((current) => ({ ...current, zone_id: value, location: "" }))
                  }
                  disabled={!state.form.project_id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={state.form.project_id ? "Zone seç (opsiyonel)" : "Önce proje seçin"} />
                  </SelectTrigger>
                  <SelectContent>
                    {state.zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                    {state.zones.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-zinc-400">Bu projede zone tanımlı değil</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Mahal <span className="text-zinc-400">(opsiyonel)</span>
                </Label>
                <Select
                  value={state.form.location}
                  onValueChange={(value) =>
                    state.setForm((current) => ({ ...current, location: value }))
                  }
                  disabled={!state.form.project_id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={state.form.project_id ? "Mahal seç" : "Önce proje seçin"} />
                  </SelectTrigger>
                  <SelectContent>
                    {state.locations.map((location) => (
                      <SelectItem key={location.id} value={location.name}>
                        {location.name}
                      </SelectItem>
                    ))}
                    {state.locations.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-zinc-400">Bu projede mahal tanımlı değil</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Resim No <span className="text-zinc-400">(opsiyonel)</span>
              </Label>
              <Input
                value={state.form.drawing_no}
                onChange={(event) =>
                  state.setForm((current) => ({ ...current, drawing_no: event.target.value }))
                }
                placeholder="Örn: R-202"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Yapılacak İş *</Label>
              {state.workItemOptions.length > 0 ? (
                <Combobox
                  value={state.form.description}
                  onChange={(value) => state.setForm((current) => ({ ...current, description: value }))}
                  options={state.workItemOptions}
                  placeholder="Seç veya yaz..."
                />
              ) : (
                <Input
                  value={state.form.description}
                  onChange={(event) =>
                    state.setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Yapılacak işi açıklayın"
                  className="h-9"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Başlama Tarihi</Label>
                <Input
                  type="date"
                  value={state.form.planned_start}
                  onChange={(event) =>
                    state.setForm((current) => ({ ...current, planned_start: event.target.value }))
                  }
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Termin</Label>
                <Input
                  type="date"
                  value={state.form.planned_end}
                  onChange={(event) =>
                    state.setForm((current) => ({ ...current, planned_end: event.target.value }))
                  }
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <Textarea
                value={state.form.admin_notes}
                onChange={(event) =>
                  state.setForm((current) => ({ ...current, admin_notes: event.target.value }))
                }
                placeholder="Opsiyonel notlar..."
                className="h-20 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => state.setCreateOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={state.handleCreate}
              disabled={
                state.createTask.isPending ||
                !state.form.project_id ||
                !state.form.job_type_id ||
                !state.form.job_sub_type_id ||
                !state.form.description.trim()
              }
            >
              {state.createTask.isPending ? "Kaydediliyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!state.assignTask} onOpenChange={(open) => !open && state.setAssignTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Görev Ata</DialogTitle>
            <DialogDescription>
              Atama yapılacak görev özetini kontrol edip aktif kullanıcı seçin.
            </DialogDescription>
            {state.assignTask ? (
              <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-600">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-900 px-2 py-0.5 font-mono font-semibold text-white">
                    #{state.assignTask.id}
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {state.assignTask.project?.code || "Proje yok"}
                    {state.assignTask.project?.name ? ` - ${state.assignTask.project.name}` : ""}
                  </span>
                </div>
                <div className="grid gap-1.5">
                  <p>
                    <span className="font-semibold text-zinc-700">Resim No:</span>{" "}
                    {state.assignTask.drawing_no || "Yok"}
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-700">Yapılacak İş:</span>{" "}
                    {state.assignTask.description || "İş açıklaması yok"}
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-700">İş Tipi:</span>{" "}
                    {[state.assignTask.job_type?.name, state.assignTask.job_sub_type?.name].filter(Boolean).join(" / ") || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-700">Termin:</span>{" "}
                    {state.assignTask.planned_end || "-"}
                  </p>
                </div>
              </div>
            ) : null}
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">Kullanıcı Seç</Label>
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {assignableUsers.map((user) => {
                const isSelected = state.selectedUserId === user.id

                return (
                  <button
                    key={user.id}
                    onClick={() => state.setSelectedUserId(isSelected ? "" : user.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                      isSelected
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    <UserAvatar displayName={user.display_name} photoUrl={user.photo_url} size="sm" />
                    <div className="min-w-0">
                      <p className={cn("truncate text-xs font-semibold", isSelected ? "text-indigo-700" : "text-zinc-800")}>
                        {user.display_name}
                      </p>
                      {user.job_title && <p className="truncate text-[10px] text-zinc-500">{user.job_title}</p>}
                    </div>
                  </button>
                )
              })}
              {assignableUsers.length === 0 ? (
                <div className="col-span-2 rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
                  Atanabilir aktif kullanıcı bulunamadı.
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => state.setAssignTask(null)}>
              İptal
            </Button>
            <Button onClick={state.handleAssign} disabled={!state.selectedUserId || state.assignTaskMutation.isPending}>
              Ata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportTasksDialog open={state.importOpen} onOpenChange={state.setImportOpen} />

      <Dialog open={!!state.cancelTask} onOpenChange={(open) => !open && state.setCancelTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi İptal Et</DialogTitle>
            <DialogDescription>
              #{state.cancelTask?.id} - {state.cancelTask?.drawing_no || "Resim No yok"} görevi iptal edilecek. Timer çalışıyorsa durdurulur. Daha sonra tekrar açılabilir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>
              İptal Sebebi <span className="text-zinc-400">(opsiyonel)</span>
            </Label>
            <Textarea
              value={state.cancelReason}
              onChange={(event) => state.setCancelReason(event.target.value)}
              placeholder="İptal gerekçesi..."
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => state.setCancelTask(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive" onClick={state.handleCancel} disabled={state.cancelTaskMutation.isPending}>
              İptal Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!state.rejectTask} onOpenChange={(open) => !open && state.setRejectTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revizeye Gönder</DialogTitle>
            <DialogDescription>
              #{state.rejectTask?.id} - {state.rejectTask?.drawing_no || "Resim No yok"} görevi revizeye gönderilecek. Çalışana e-posta bildirimi gönderilecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>
              Revize Sebebi <span className="text-zinc-400">(opsiyonel)</span>
            </Label>
            <Textarea
              value={state.rejectReason}
              onChange={(event) => state.setRejectReason(event.target.value)}
              placeholder="Düzeltilmesi gereken..."
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => state.setRejectTask(null)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={state.handleReject} disabled={state.rejectTaskMutation.isPending}>
              Revizeye Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

