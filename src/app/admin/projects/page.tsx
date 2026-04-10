"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FolderKanban, Layers3, Plus, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectLocationsDialog } from "@/components/admin/project-locations-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAllZones, useProjects } from "@/hooks/use-reference-data"
import { formatDate } from "@/lib/utils"
import { Location, Project } from "@/types/task"

function useAllLocations() {
  return useQuery<Location[]>({
    queryKey: ["locations-all"],
    queryFn: () => fetch("/api/locations").then((response) => response.json()).then((payload) => payload.data || []),
  })
}

function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { code: string; name?: string }) => {
      const response = await fetch("/api/projects", {
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
      queryClient.invalidateQueries({ queryKey: ["projects-all"] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Proje oluşturuldu")
    },
    onError: (error: Error) => toast.error(error.message || "Proje oluşturulamadı"),
  })
}

function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        throw new Error("Güncelleme başarısız")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-all"] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Proje güncellendi")
    },
    onError: () => toast.error("Güncelleme başarısız"),
  })
}

export default function ProjectsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [form, setForm] = useState({ code: "", name: "" })

  const { data: projects = [], isLoading } = useProjects({ includeArchived: true })
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const handleCreate = async () => {
    if (!form.code.trim()) {
      return
    }

    await createProject.mutateAsync({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim() || undefined,
    })
    setCreateOpen(false)
    setForm({ code: "", name: "" })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Referans Yönetimi"
        title="Projeler"
        description="Proje kartelasını yönetin, aktif/pasif durumlarını kontrol edin ve zone-mahal yapısını proje bazında düzenleyin."
        actions={
          <Button size="sm" className="gap-2 rounded-full" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Yeni Proje
          </Button>
        }
      />

      <MetricCardStrip
        items={[
          { label: "Toplam proje", value: projects.length, icon: FolderKanban, tone: "slate" },
          { label: "Aktif proje", value: projects.filter((project) => !project.is_archived).length, icon: FolderKanban, tone: "green" },
          { label: "Arşiv proje", value: projects.filter((project) => project.is_archived).length, icon: FolderKanban, tone: "amber" },
        ]}
      />

      <Tabs defaultValue="projects" className="space-y-4">
        <div className="rounded-[28px] border border-white/80 bg-white/90 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
            <TabsTrigger value="projects" className="rounded-full px-4 py-2">
              Projeler
            </TabsTrigger>
            <TabsTrigger value="zones-mahal" className="rounded-full px-4 py-2">
              Zone & Mahal
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="projects">
          <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/90 hover:bg-zinc-50/90">
                  <TableHead className="w-32">Proje kodu</TableHead>
                  <TableHead>Proje adı</TableHead>
                  <TableHead className="w-32">Oluşturulma</TableHead>
                  <TableHead className="w-24">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-zinc-400">
                      Yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-zinc-400">
                      Henüz proje yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-zinc-50/70">
                      <TableCell className="font-mono text-sm font-semibold text-zinc-950">{project.code}</TableCell>
                      <TableCell className="text-zinc-700">{project.name || "-"}</TableCell>
                      <TableCell className="text-sm text-zinc-400">{formatDate(project.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Badge variant={project.is_archived ? "outline" : "secondary"} className="rounded-full px-2 py-1 text-[11px]">
                            {project.is_archived ? "Arşiv" : "Aktif"}
                          </Badge>
                          <Switch
                            checked={!project.is_archived}
                            onCheckedChange={(active) =>
                              updateProject.mutate({ id: project.id, updates: { is_archived: !active } })
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="zones-mahal">
          <ZonesMahalTab projects={projects} onEdit={setEditProject} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Proje Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-code">Proje kodu *</Label>
              <Input
                id="project-code"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                placeholder="Örn: NB43"
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Proje adı</Label>
              <Input
                id="project-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Örn: NB43 - Bulk Carrier"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreate} disabled={!form.code.trim() || createProject.isPending}>
              {createProject.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectLocationsDialog
        project={editProject}
        open={editProject !== null}
        onOpenChange={(open) => !open && setEditProject(null)}
      />
    </div>
  )
}

function ZonesMahalTab({
  projects,
  onEdit,
  isLoading,
}: {
  projects: Project[]
  onEdit: (project: Project) => void
  isLoading: boolean
}) {
  const { data: zones = [] } = useAllZones()
  const { data: locations = [] } = useAllLocations()

  const counts = useMemo(() => {
    const zoneByProject = new Map<string, number>()
    const locationByProject = new Map<string, number>()

    for (const zone of zones) {
      zoneByProject.set(zone.project_id, (zoneByProject.get(zone.project_id) ?? 0) + 1)
    }

    for (const location of locations) {
      locationByProject.set(location.project_id, (locationByProject.get(location.project_id) ?? 0) + 1)
    }

    return { zoneByProject, locationByProject }
  }, [locations, zones])

  const activeProjects = projects.filter((project) => !project.is_archived)

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50/90 hover:bg-zinc-50/90">
            <TableHead className="w-32">Proje kodu</TableHead>
            <TableHead>Proje adı</TableHead>
            <TableHead className="w-28 text-center">Zone</TableHead>
            <TableHead className="w-28 text-center">Mahal</TableHead>
            <TableHead className="w-32 text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-zinc-400">
                Yükleniyor...
              </TableCell>
            </TableRow>
          ) : activeProjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-zinc-400">
                Aktif proje yok.
              </TableCell>
            </TableRow>
          ) : (
            activeProjects.map((project) => (
              <TableRow key={project.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => onEdit(project)}>
                <TableCell className="font-mono text-sm font-semibold text-zinc-950">{project.code}</TableCell>
                <TableCell className="text-zinc-700">{project.name || "-"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{counts.zoneByProject.get(project.id) ?? 0}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{counts.locationByProject.get(project.id) ?? 0}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 rounded-full"
                    onClick={(event) => {
                      event.stopPropagation()
                      onEdit(project)
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Düzenle
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
