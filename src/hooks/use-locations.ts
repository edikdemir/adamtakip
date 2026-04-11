"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Location, Zone } from "@/types/task"
import { toast } from "sonner"
import { ApiSessionExpiredError, readApiArray, readApiData } from "@/lib/api-client"

export function useLocations(projectId: string | undefined) {
  return useQuery<Location[]>({
    queryKey: ["locations", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/locations?project_id=${projectId}`)
      return readApiArray<Location>(res, "Mahaller yüklenemedi")
    },
    enabled: !!projectId,
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ project_id, name }: { project_id: string; name: string }) => {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id, name }),
      })
      return readApiData<Location>(res, "Mahal eklenemedi")
    },
    onSuccess: (loc) => {
      queryClient.invalidateQueries({ queryKey: ["locations", loc.project_id] })
      queryClient.invalidateQueries({ queryKey: ["locations-all"] })
      toast.success("Mahal eklendi")
    },
    onError: (err: Error) => {
      if (!(err instanceof ApiSessionExpiredError)) toast.error(err.message)
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const res = await fetch(`/api/locations/${id}`, { method: "DELETE" })
      return readApiData(res, "Mahal silinemedi")
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["locations", vars.project_id] })
      queryClient.invalidateQueries({ queryKey: ["locations-all"] })
      toast.success("Mahal silindi")
    },
    onError: (err: Error) => {
      if (!(err instanceof ApiSessionExpiredError)) toast.error(err.message)
    },
  })
}

export function useZonesByProject(projectId: string | undefined) {
  return useQuery<Zone[]>({
    queryKey: ["zones", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/zones?project_id=${projectId}`)
      return readApiArray<Zone>(res, "Zone'lar yüklenemedi")
    },
    enabled: !!projectId,
  })
}

export function useCreateZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ project_id, name }: { project_id: string; name: string }) => {
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id, name }),
      })
      return readApiData<Zone>(res, "Zone eklenemedi")
    },
    onSuccess: (zone) => {
      queryClient.invalidateQueries({ queryKey: ["zones", zone.project_id] })
      queryClient.invalidateQueries({ queryKey: ["zones-all"] })
      toast.success("Zone eklendi")
    },
    onError: (err: Error) => {
      if (!(err instanceof ApiSessionExpiredError)) toast.error(err.message)
    },
  })
}

export function useDeleteZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const res = await fetch(`/api/zones/${id}`, { method: "DELETE" })
      return readApiData(res, "Zone silinemedi")
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["zones", vars.project_id] })
      queryClient.invalidateQueries({ queryKey: ["zones-all"] })
      toast.success("Zone silindi")
    },
    onError: (err: Error) => {
      if (!(err instanceof ApiSessionExpiredError)) toast.error(err.message)
    },
  })
}
