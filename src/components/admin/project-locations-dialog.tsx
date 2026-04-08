"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Project } from "@/types/task"
import {
  useLocations,
  useCreateLocation,
  useDeleteLocation,
  useZonesByProject,
  useCreateZone,
  useDeleteZone,
} from "@/hooks/use-locations"
import { Plus, X, MapPin, LayoutGrid } from "lucide-react"

interface Props {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectLocationsDialog({ project, open, onOpenChange }: Props) {
  const [zoneInput, setZoneInput] = useState("")
  const [mahalInput, setMahalInput] = useState("")

  const { data: zones = [], isLoading: zonesLoading } = useZonesByProject(project?.id)
  const { data: locations = [], isLoading: locsLoading } = useLocations(project?.id)

  const createZone = useCreateZone()
  const deleteZone = useDeleteZone()
  const createLocation = useCreateLocation()
  const deleteLocation = useDeleteLocation()

  if (!project) return null

  const handleAddZone = async () => {
    const name = zoneInput.trim()
    if (!name) return
    try {
      await createZone.mutateAsync({ project_id: project.id, name })
      setZoneInput("")
    } catch {
      /* toast handled in hook */
    }
  }

  const handleAddMahal = async () => {
    const name = mahalInput.trim()
    if (!name) return
    try {
      await createLocation.mutateAsync({ project_id: project.id, name })
      setMahalInput("")
    } catch {
      /* toast handled in hook */
    }
  }

  const handleDeleteZone = (id: string, name: string) => {
    if (!confirm(`"${name}" zone'unu silmek istediğinize emin misiniz?`)) return
    deleteZone.mutate({ id, project_id: project.id })
  }

  const handleDeleteMahal = (id: string, name: string) => {
    if (!confirm(`"${name}" mahalini silmek istediğinize emin misiniz?`)) return
    deleteLocation.mutate({ id, project_id: project.id })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{project.code}</span>
            <span className="text-zinc-400">—</span>
            <span>Zone &amp; Mahal</span>
          </DialogTitle>
          <DialogDescription>
            Bu projeye ait zone ve mahal listelerini yönetin. Bir öğe silinemiyorsa görevlerde kullanılıyor demektir.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          {/* Zones column */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" /> Zone'lar
                <Badge variant="secondary">{zones.length}</Badge>
              </h3>
            </div>
            <div className="flex gap-2">
              <Input
                value={zoneInput}
                onChange={(e) => setZoneInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddZone()}
                placeholder="Örn: Zone-15"
                className="h-9"
                disabled={createZone.isPending}
              />
              <Button
                size="sm"
                onClick={handleAddZone}
                disabled={!zoneInput.trim() || createZone.isPending}
                className="gap-1"
              >
                <Plus className="h-4 w-4" /> Ekle
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/40 p-2 space-y-1">
              {zonesLoading ? (
                <p className="text-sm text-zinc-400 text-center py-4">Yükleniyor...</p>
              ) : zones.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">Henüz zone yok</p>
              ) : (
                zones.map((z) => (
                  <div
                    key={z.id}
                    className="flex items-center justify-between bg-white rounded-md border border-zinc-200 px-3 py-1.5 text-sm"
                  >
                    <span className="text-zinc-800">{z.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteZone(z.id, z.name)}
                      disabled={deleteZone.isPending}
                      className="text-zinc-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      aria-label={`${z.name} sil`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Mahaller column */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Mahaller
                <Badge variant="secondary">{locations.length}</Badge>
              </h3>
            </div>
            <div className="flex gap-2">
              <Input
                value={mahalInput}
                onChange={(e) => setMahalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMahal()}
                placeholder="Örn: Engine Room"
                className="h-9"
                disabled={createLocation.isPending}
              />
              <Button
                size="sm"
                onClick={handleAddMahal}
                disabled={!mahalInput.trim() || createLocation.isPending}
                className="gap-1"
              >
                <Plus className="h-4 w-4" /> Ekle
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/40 p-2 space-y-1">
              {locsLoading ? (
                <p className="text-sm text-zinc-400 text-center py-4">Yükleniyor...</p>
              ) : locations.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">Henüz mahal yok</p>
              ) : (
                locations.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-white rounded-md border border-zinc-200 px-3 py-1.5 text-sm"
                  >
                    <span className="text-zinc-800">{m.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMahal(m.id, m.name)}
                      disabled={deleteLocation.isPending}
                      className="text-zinc-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      aria-label={`${m.name} sil`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
