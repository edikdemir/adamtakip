"use client"

import { useEffect, useMemo, useState } from "react"
import { Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLinkTasks } from "@/hooks/use-tasks"
import { Task } from "@/types/task"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  primary: Task | null
  allUserTasks: Task[]
}

export function LinkTasksDialog({ open, onOpenChange, primary, allUserTasks }: Props) {
  const linkTasks = useLinkTasks()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (primary && open) {
      const current = new Set<number>(
        allUserTasks.filter((task) => task.linked_to_task_id === primary.id).map((task) => task.id)
      )
      setSelected(current)
    }
  }, [primary, allUserTasks, open])

  const candidates = useMemo(() => {
    if (!primary) {
      return []
    }

    return allUserTasks.filter((task) => {
      if (task.id === primary.id) return false
      if (task.linked_to_task_id !== null && task.linked_to_task_id !== primary.id) return false
      if (task.linked_tasks && task.linked_tasks.length > 0) return false
      return true
    })
  }, [primary, allUserTasks])

  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!primary) {
      return
    }

    await linkTasks.mutateAsync({
      primaryId: primary.id,
      dependentIds: Array.from(selected),
    })

    onOpenChange(false)
  }

  const primaryIsDependent = primary?.linked_to_task_id != null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Bağlı Görevleri Yönet
          </DialogTitle>
          {primary ? (
            <DialogDescription>
              <span className="font-mono">#{primary.id}</span> - {primary.drawing_no || "Resim No yok"}
              <br />
              <span className="text-xs text-zinc-500">
                Aynı resmi veya aynı işi paylaşan diğer görevleri seçin.
              </span>
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {primaryIsDependent ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Bu görev için önce mevcut bağlı görev ilişkisini kaldırmanız gerekiyor.
          </div>
        ) : (
          <ScrollArea className="h-72 rounded-md border border-zinc-200">
            {candidates.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-400">Bağlanabilecek başka görev yok.</div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {candidates.map((task) => (
                  <li key={task.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={selected.has(task.id)}
                        onChange={() => toggle(task.id)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs text-zinc-400">#{task.id}</span>
                          <span className="font-medium text-zinc-800">{task.drawing_no || "Resim No yok"}</span>
                          {task.project?.code ? <span className="text-xs text-zinc-500">- {task.project.code}</span> : null}
                        </div>
                        <p className="truncate text-xs text-zinc-500">{task.description || "Yapılacak iş girilmedi"}</p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={primaryIsDependent || linkTasks.isPending}>
            {linkTasks.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
