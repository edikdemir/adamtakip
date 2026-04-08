"use client"
import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Project, Zone, Location } from "@/types/task"
import { toast } from "sonner"
import { Plus, FolderKanban, Settings2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { ProjectLocationsDialog } from "@/components/admin/project-locations-dialog"

function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects-all"],
    queryFn: () =>
      fetch("/api/projects?include_archived=true").then(r => r.json()).then(r => r.data || []),
  })
}

function useAllZones() {
  return useQuery<Zone[]>({
    queryKey: ["zones-all"],
    queryFn: () => fetch("/api/zones").then(r => r.json()).then(r => r.data || []),
  })
}

function useAllLocations() {
  return useQuery<Location[]>({
    queryKey: ["locations-all"],
    queryFn: () => fetch("/api/locations").then(r => r.json()).then(r => r.data || []),
  })
}

function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { code: string; name?: string }) => {
      const res = await fetch("/api/projects", {
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
      queryClient.invalidateQueries({ queryKey: ["projects-all"] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Proje oluşturuldu")
    },
    onError: (err: Error) => toast.error(err.message || "Proje oluşturulamadı"),
  })
}

function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Güncelleme başarısız")
      return res.json()
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
  const [form, setForm] = useState({ code: "", name: "" })
  const [editProject, setEditProject] = useState<Project | null>(null)

  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const handleCreate = async () => {
    if (!form.code.trim()) return
    await createProject.mutateAsync({ code: form.code.trim().toUpperCase(), name: form.name || undefined })
    setCreateOpen(false)
    setForm({ code: "", name: "" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <FolderKanban className="h-5 w-5" /> Proje Yönetimi
        </h1>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Yeni Proje
        </Button>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projeler</TabsTrigger>
          <TabsTrigger value="zones-mahal">Zone &amp; Mahal</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/80">
                  <TableHead className="w-32">Proje Kodu</TableHead>
                  <TableHead>Proje Adı</TableHead>
                  <TableHead className="w-28">Oluşturulma</TableHead>
                  <TableHead className="w-24">Aktif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-zinc-400">Yükleniyor...</TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-zinc-400">Henüz proje yok</TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-zinc-50/50">
                      <TableCell>
                        <span className="font-mono font-bold text-zinc-900">{project.code}</span>
                      </TableCell>
                      <TableCell className="text-zinc-700">{project.name || "-"}</TableCell>
                      <TableCell className="text-sm text-zinc-400">{formatDate(project.created_at)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={!project.is_archived}
                          onCheckedChange={(active) =>
                            updateProject.mutate({ id: project.id, updates: { is_archived: !active } })
                          }
                        />
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
              <Label htmlFor="code">Proje Kodu *</Label>
              <Input
                id="code"
                placeholder="Örn: NB43"
                value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Proje Adı</Label>
              <Input
                id="name"
                placeholder="Örn: NB43 - Bulk Carrier"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.code.trim() || createProject.isPending}
            >
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
    const zoneByProj = new Map<string, number>()
    const locByProj = new Map<string, number>()
    for (const z of zones) zoneByProj.set(z.project_id, (zoneByProj.get(z.project_id) ?? 0) + 1)
    for (const l of locations) locByProj.set(l.project_id, (locByProj.get(l.project_id) ?? 0) + 1)
    return { zoneByProj, locByProj }
  }, [zones, locations])

  const activeProjects = projects.filter((p) => !p.is_archived)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50/80">
            <TableHead className="w-32">Proje Kodu</TableHead>
            <TableHead>Proje Adı</TableHead>
            <TableHead className="w-28 text-center">Zone</TableHead>
            <TableHead className="w-28 text-center">Mahal</TableHead>
            <TableHead className="w-32 text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-zinc-400">Yükleniyor...</TableCell>
            </TableRow>
          ) : activeProjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-zinc-400">Aktif proje yok</TableCell>
            </TableRow>
          ) : (
            activeProjects.map((project) => (
              <TableRow
                key={project.id}
                className="hover:bg-zinc-50/50 cursor-pointer"
                onClick={() => onEdit(project)}
              >
                <TableCell>
                  <span className="font-mono font-bold text-zinc-900">{project.code}</span>
                </TableCell>
                <TableCell className="text-zinc-700">{project.name || "-"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{counts.zoneByProj.get(project.id) ?? 0}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{counts.locByProj.get(project.id) ?? 0}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(project)
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" /> Düzenle
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
