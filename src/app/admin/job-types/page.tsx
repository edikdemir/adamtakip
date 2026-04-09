"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { JobType, JobWorkItem } from "@/types/task"
import { toast } from "sonner"
import { Plus, ChevronRight, ChevronDown, Wrench, Tag, List, X } from "lucide-react"

function useJobTypes() {
  return useQuery<JobType[]>({
    queryKey: ["job-types"],
    queryFn: () => fetch("/api/job-types").then(r => r.json()).then(r => r.data || []),
  })
}

function useCreateJobType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch("/api/job-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const { error } = await res.json(); throw new Error(error) }
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job-types"] }); toast.success("İş tipi oluşturuldu") },
    onError: (err: Error) => toast.error(err.message || "Oluşturulamadı"),
  })
}

function useCreateSubType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { job_type_id: string; name: string }) => {
      const res = await fetch("/api/job-sub-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const { error } = await res.json(); throw new Error(error) }
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job-types"] }); toast.success("Alt tip oluşturuldu") },
    onError: (err: Error) => toast.error(err.message || "Oluşturulamadı"),
  })
}

function useCreateWorkItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { job_sub_type_id: string; name: string }) => {
      const res = await fetch("/api/job-work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const { error } = await res.json(); throw new Error(error) }
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job-types"] }); toast.success("İş kalemi eklendi") },
    onError: (err: Error) => toast.error(err.message || "Eklenemedi"),
  })
}

function useDeleteWorkItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/job-work-items/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Silinemedi")
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job-types"] }); toast.success("İş kalemi silindi") },
    onError: () => toast.error("Silinemedi"),
  })
}

export default function JobTypesPage() {
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [createSubOpen, setCreateSubOpen] = useState<string | null>(null)
  const [typeForm, setTypeForm] = useState({ name: "" })
  const [subForm, setSubForm] = useState({ name: "" })
  const [expandedSubType, setExpandedSubType] = useState<string | null>(null)
  const [workItemInputs, setWorkItemInputs] = useState<Record<string, string>>({})
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: jobTypes = [], isLoading } = useJobTypes()
  const createJobType = useCreateJobType()
  const createSubType = useCreateSubType()
  const createWorkItem = useCreateWorkItem()
  const deleteWorkItem = useDeleteWorkItem()

  const handleCreateType = async () => {
    if (!typeForm.name.trim()) return
    await createJobType.mutateAsync({ name: typeForm.name.trim() })
    setCreateTypeOpen(false)
    setTypeForm({ name: "" })
  }

  const handleCreateSub = async () => {
    if (!createSubOpen || !subForm.name.trim()) return
    await createSubType.mutateAsync({ job_type_id: createSubOpen, name: subForm.name.trim() })
    setCreateSubOpen(null)
    setSubForm({ name: "" })
  }

  const handleAddWorkItem = async (subTypeId: string) => {
    const name = (workItemInputs[subTypeId] || "").trim()
    if (!name) return
    await createWorkItem.mutateAsync({ job_sub_type_id: subTypeId, name })
    setWorkItemInputs(prev => ({ ...prev, [subTypeId]: "" }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Wrench className="h-5 w-5" /> İş Tipleri
        </h1>
        <Button size="sm" onClick={() => setCreateTypeOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Yeni İş Tipi
        </Button>
      </div>

      {isLoading ? (
        <p className="text-zinc-400 text-sm">Yükleniyor...</p>
      ) : jobTypes.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <Wrench className="h-8 w-8 mx-auto mb-2" />
          <p>Henüz iş tipi yok. İlk iş tipini ekleyin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobTypes.map((jt) => (
            <div key={jt.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              {/* Job type header */}
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50/60 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 text-white">
                    <Wrench className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-zinc-900">{jt.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {jt.job_sub_types?.length || 0} alt tip
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => { setCreateSubOpen(jt.id); setSubForm({ name: "" }) }}
                >
                  <Plus className="h-3 w-3" /> Alt Tip Ekle
                </Button>
              </div>

              {/* Sub types */}
              <div className="divide-y divide-zinc-50">
                {(jt.job_sub_types || []).length === 0 ? (
                  <p className="px-5 py-3 text-xs text-zinc-400">Henüz alt tip yok</p>
                ) : (
                  (jt.job_sub_types || []).map((st) => {
                    const isExpanded = expandedSubType === st.id
                    const workItems = st.job_work_items || []
                    const inputVal = workItemInputs[st.id] || ""

                    return (
                      <div key={st.id}>
                        {/* Sub type row */}
                        <div className="flex items-center gap-2 px-5 py-2.5 hover:bg-zinc-50/60">
                          <ChevronRight className="h-3.5 w-3.5 text-zinc-300 flex-shrink-0" />
                          <Tag className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                          <span className="text-sm text-zinc-700 flex-1">{st.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs gap-1 text-zinc-500 hover:text-zinc-900"
                            onClick={() => setExpandedSubType(isExpanded ? null : st.id)}
                          >
                            <List className="h-3 w-3" />
                            İş Kalemleri
                            {workItems.length > 0 && (
                              <Badge variant="secondary" className="text-xs h-4 px-1 ml-0.5">
                                {workItems.length}
                              </Badge>
                            )}
                            {isExpanded
                              ? <ChevronDown className="h-3 w-3" />
                              : <ChevronRight className="h-3 w-3" />}
                          </Button>
                        </div>

                        {/* Work items panel (inline expand) */}
                        {isExpanded && (
                          <div className="px-12 pb-3 pt-1 bg-zinc-50/40 border-t border-zinc-100 space-y-1">
                            {workItems.length === 0 ? (
                              <p className="text-xs text-zinc-400 py-1">Henüz iş kalemi yok</p>
                            ) : (
                              workItems
                                .slice()
                                .sort((a, b) => a.sort_order - b.sort_order)
                                .map((wi: JobWorkItem) => (
                                  <div key={wi.id} className="flex items-center gap-2 group py-0.5">
                                    <span className="text-xs text-zinc-300">•</span>
                                    <span className="text-xs text-zinc-600 flex-1">{wi.name}</span>
                                    <button
                                      onClick={() => setDeleteConfirmId(wi.id)}
                                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                                      title="Sil"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))
                            )}
                            {/* Add work item */}
                            <div className="flex items-center gap-2 pt-1.5">
                              <Input
                                value={inputVal}
                                onChange={(e) => setWorkItemInputs(prev => ({ ...prev, [st.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && handleAddWorkItem(st.id)}
                                placeholder="Yeni iş kalemi..."
                                className="h-7 text-xs"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 flex-shrink-0"
                                onClick={() => handleAddWorkItem(st.id)}
                                disabled={!inputVal.trim() || createWorkItem.isPending}
                              >
                                <Plus className="h-3 w-3" /> Ekle
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create job type dialog */}
      <Dialog open={createTypeOpen} onOpenChange={setCreateTypeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni İş Tipi</DialogTitle></DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>İş Tipi Adı *</Label>
            <Input
              placeholder="Örn: Steel, Outfitting..."
              value={typeForm.name}
              onChange={(e) => setTypeForm({ name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleCreateType()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTypeOpen(false)}>İptal</Button>
            <Button onClick={handleCreateType} disabled={!typeForm.name.trim() || createJobType.isPending}>
              {createJobType.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create sub type dialog */}
      <Dialog open={!!createSubOpen} onOpenChange={(open) => !open && setCreateSubOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Alt Tip</DialogTitle></DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Alt Tip Adı *</Label>
            <Input
              placeholder="Örn: 3D Model, Arr, Axo..."
              value={subForm.name}
              onChange={(e) => setSubForm({ name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSub()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateSubOpen(null)}>İptal</Button>
            <Button onClick={handleCreateSub} disabled={!subForm.name.trim() || createSubType.isPending}>
              {createSubType.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete work item confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İş Kalemini Sil</DialogTitle>
            <DialogDescription>Bu iş kalemi kalıcı olarak silinecek. Emin misiniz?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>İptal</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteWorkItem.mutate(deleteConfirmId)
                  setDeleteConfirmId(null)
                }
              }}
              disabled={deleteWorkItem.isPending}
            >
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
