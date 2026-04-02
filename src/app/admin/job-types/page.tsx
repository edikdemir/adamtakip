"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { JobType, JobSubType } from "@/types/task"
import { toast } from "sonner"
import { Plus, ChevronRight, Wrench, Tag } from "lucide-react"

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
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-types"] })
      toast.success("İş tipi oluşturuldu")
    },
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
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-types"] })
      toast.success("Alt tip oluşturuldu")
    },
    onError: (err: Error) => toast.error(err.message || "Oluşturulamadı"),
  })
}

export default function JobTypesPage() {
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [createSubOpen, setCreateSubOpen] = useState<string | null>(null) // job_type_id
  const [typeForm, setTypeForm] = useState({ name: "" })
  const [subForm, setSubForm] = useState({ name: "" })

  const { data: jobTypes = [], isLoading } = useJobTypes()
  const createJobType = useCreateJobType()
  const createSubType = useCreateSubType()

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
                  (jt.job_sub_types || []).map((st) => (
                    <div key={st.id} className="flex items-center gap-3 px-5 py-2.5">
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-300 flex-shrink-0" />
                      <Tag className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                      <span className="text-sm text-zinc-700">{st.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create job type dialog */}
      <Dialog open={createTypeOpen} onOpenChange={setCreateTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni İş Tipi</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>İş Tipi Adı *</Label>
            <Input
              placeholder="Örn: Çelik, Techiz, Boru, Elektrik..."
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
          <DialogHeader>
            <DialogTitle>Yeni Alt Tip</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Alt Tip Adı *</Label>
            <Input
              placeholder="Örn: Blok Model, Blok Kontrol..."
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
    </div>
  )
}
