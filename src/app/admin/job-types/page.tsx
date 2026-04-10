"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, List, Plus, Tag, Wrench, X } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useJobTypes } from "@/hooks/use-reference-data"
import { JobWorkItem } from "@/types/task"

function useCreateJobType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await fetch("/api/job-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error)
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-types"] })
      toast.success("İş tipi oluşturuldu")
    },
    onError: (error: Error) => toast.error(error.message || "Oluşturulamadı"),
  })
}

function useCreateSubType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { job_type_id: string; name: string }) => {
      const response = await fetch("/api/job-sub-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error)
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-types"] })
      toast.success("Alt tip oluşturuldu")
    },
    onError: (error: Error) => toast.error(error.message || "Oluşturulamadı"),
  })
}

function useCreateWorkItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { job_sub_type_id: string; name: string }) => {
      const response = await fetch("/api/job-work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error)
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-types"] })
      toast.success("İş kalemi eklendi")
    },
    onError: (error: Error) => toast.error(error.message || "Eklenemedi"),
  })
}

function useDeleteWorkItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/job-work-items/${id}`, { method: "DELETE" })
      if (!response.ok) {
        throw new Error("Silinemedi")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-types"] })
      toast.success("İş kalemi silindi")
    },
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
    if (!typeForm.name.trim()) {
      return
    }

    await createJobType.mutateAsync({ name: typeForm.name.trim() })
    setCreateTypeOpen(false)
    setTypeForm({ name: "" })
  }

  const handleCreateSub = async () => {
    if (!createSubOpen || !subForm.name.trim()) {
      return
    }

    await createSubType.mutateAsync({ job_type_id: createSubOpen, name: subForm.name.trim() })
    setCreateSubOpen(null)
    setSubForm({ name: "" })
  }

  const handleAddWorkItem = async (subTypeId: string) => {
    const name = (workItemInputs[subTypeId] || "").trim()
    if (!name) {
      return
    }

    await createWorkItem.mutateAsync({ job_sub_type_id: subTypeId, name })
    setWorkItemInputs((current) => ({ ...current, [subTypeId]: "" }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Referans Yönetimi"
        title="İş Tipleri"
        description="İş tipi, alt tip ve iş kalemi yapısını aynı ekrandan yönetin. Operasyonda kullanılan görev sınıflandırmasını buradan düzenleyin."
        actions={
          <Button size="sm" onClick={() => setCreateTypeOpen(true)} className="gap-2 rounded-full">
            <Plus className="h-4 w-4" />
            Yeni İş Tipi
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-zinc-400">Yükleniyor...</p>
      ) : jobTypes.length === 0 ? (
        <div className="py-12 text-center text-zinc-400">
          <Wrench className="mx-auto mb-2 h-8 w-8" />
          <p>Henüz iş tipi yok. İlk iş tipini ekleyin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobTypes.map((jobType) => (
            <div key={jobType.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <Wrench className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-zinc-900">{jobType.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {jobType.job_sub_types?.length || 0} alt tip
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    setCreateSubOpen(jobType.id)
                    setSubForm({ name: "" })
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Alt Tip Ekle
                </Button>
              </div>

              <div className="divide-y divide-zinc-50">
                {(jobType.job_sub_types || []).length === 0 ? (
                  <p className="px-5 py-3 text-xs text-zinc-400">Henüz alt tip yok</p>
                ) : (
                  (jobType.job_sub_types || []).map((subType) => {
                    const isExpanded = expandedSubType === subType.id
                    const workItems = subType.job_work_items || []
                    const inputValue = workItemInputs[subType.id] || ""

                    return (
                      <div key={subType.id}>
                        <div className="flex items-center gap-2 px-5 py-2.5 hover:bg-zinc-50/60">
                          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-zinc-300" />
                          <Tag className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
                          <span className="flex-1 text-sm text-zinc-700">{subType.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-xs text-zinc-500 hover:text-zinc-900"
                            onClick={() => setExpandedSubType(isExpanded ? null : subType.id)}
                          >
                            <List className="h-3 w-3" />
                            İş Kalemleri
                            {workItems.length > 0 ? (
                              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-xs">
                                {workItems.length}
                              </Badge>
                            ) : null}
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </Button>
                        </div>

                        {isExpanded ? (
                          <div className="space-y-1 border-t border-zinc-100 bg-zinc-50/40 px-12 pb-3 pt-1">
                            {workItems.length === 0 ? (
                              <p className="py-1 text-xs text-zinc-400">Henüz iş kalemi yok</p>
                            ) : (
                              workItems
                                .slice()
                                .sort((first, second) => first.sort_order - second.sort_order)
                                .map((workItem: JobWorkItem) => (
                                  <div key={workItem.id} className="group flex items-center gap-2 py-0.5">
                                    <span className="text-xs text-zinc-300">•</span>
                                    <span className="flex-1 text-xs text-zinc-600">{workItem.name}</span>
                                    <button
                                      onClick={() => setDeleteConfirmId(workItem.id)}
                                      className="text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                                      title="Sil"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))
                            )}

                            <div className="flex items-center gap-2 pt-1.5">
                              <Input
                                value={inputValue}
                                onChange={(event) =>
                                  setWorkItemInputs((current) => ({ ...current, [subType.id]: event.target.value }))
                                }
                                onKeyDown={(event) => event.key === "Enter" && handleAddWorkItem(subType.id)}
                                placeholder="Yeni iş kalemi..."
                                className="h-7 text-xs"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 flex-shrink-0 gap-1 px-2 text-xs"
                                onClick={() => handleAddWorkItem(subType.id)}
                                disabled={!inputValue.trim() || createWorkItem.isPending}
                              >
                                <Plus className="h-3 w-3" />
                                Ekle
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createTypeOpen} onOpenChange={setCreateTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni İş Tipi</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>İş Tipi Adı *</Label>
            <Input
              placeholder="Örn: Steel, Outfitting..."
              value={typeForm.name}
              onChange={(event) => setTypeForm({ name: event.target.value })}
              onKeyDown={(event) => event.key === "Enter" && handleCreateType()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTypeOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreateType} disabled={!typeForm.name.trim() || createJobType.isPending}>
              {createJobType.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createSubOpen} onOpenChange={(open) => !open && setCreateSubOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Alt Tip</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Alt Tip Adı *</Label>
            <Input
              placeholder="Örn: 3D Model, Arr, Axo..."
              value={subForm.name}
              onChange={(event) => setSubForm({ name: event.target.value })}
              onKeyDown={(event) => event.key === "Enter" && handleCreateSub()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateSubOpen(null)}>
              İptal
            </Button>
            <Button onClick={handleCreateSub} disabled={!subForm.name.trim() || createSubType.isPending}>
              {createSubType.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İş Kalemini Sil</DialogTitle>
            <DialogDescription>Bu iş kalemi kalıcı olarak silinecek. Emin misiniz?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              İptal
            </Button>
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
