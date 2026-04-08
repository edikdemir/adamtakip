"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Location, Zone } from "@/types/task"
import { toast } from "sonner"

export function useLocations(projectId: string | undefined) {
  return useQuery<Location[]>({
    queryKey: ["locations", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/locations?project_id=${projectId}`)
      if (!res.ok) throw new Error("Mahaller yüklenemedi")
      const { data } = await res.json()
      return data
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
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "Mahal eklenemedi")
      }
      const { data } = await res.json()
      return data as Location
    },
    onSuccess: (loc) => {
      queryClient.invalidateQueries({ queryKey: ["locations", loc.project_id] })
      queryClient.invalidateQueries({ queryKey: ["locations-all"] })
      toast.success("Mahal eklendi")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const res = await fetch(`/api/locations/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "Mahal silinemedi")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["locations", vars.project_id] })
      queryClient.invalidateQueries({ queryKey: ["locations-all"] })
      toast.success("Mahal silindi")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useZonesByProject(projectId: string | undefined) {
  return useQuery<Zone[]>({
    queryKey: ["zones", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/zones?project_id=${projectId}`)
      if (!res.ok) throw new Error("Zone'lar yüklenemedi")
      const { data } = await res.json()
      return data
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
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "Zone eklenemedi")
      }
      const { data } = await res.json()
      return data as Zone
    },
    onSuccess: (zone) => {
      queryClient.invalidateQueries({ queryKey: ["zones", zone.project_id] })
      queryClient.invalidateQueries({ queryKey: ["zones-all"] })
      toast.success("Zone eklendi")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const res = await fetch(`/api/zones/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "Zone silinemedi")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["zones", vars.project_id] })
      queryClient.invalidateQueries({ queryKey: ["zones-all"] })
      toast.success("Zone silindi")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
