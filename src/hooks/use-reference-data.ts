"use client"

import { useQuery } from "@tanstack/react-query"
import { JobType, Project, Zone } from "@/types/task"
import { UserRole } from "@/lib/constants"

export interface ReferenceUser {
  id: string
  email: string
  display_name: string
  job_title?: string | null
  photo_url?: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

async function fetchReferenceData<T>(url: string, errorMessage: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(errorMessage)
  }

  const payload = await response.json()
  return payload.data || []
}

function sortZones(zones: Zone[]) {
  return [...zones].sort((first, second) => {
    const firstNumber = parseInt(first.name.replace(/\D+/g, "") || "0", 10)
    const secondNumber = parseInt(second.name.replace(/\D+/g, "") || "0", 10)

    if (firstNumber !== secondNumber) {
      return firstNumber - secondNumber
    }

    return first.name.localeCompare(second.name, "tr")
  })
}

interface UseProjectsOptions {
  includeArchived?: boolean
}

export function useProjects(options?: UseProjectsOptions) {
  const includeArchived = options?.includeArchived ?? false
  const endpoint = includeArchived ? "/api/projects?include_archived=true" : "/api/projects"

  return useQuery<Project[]>({
    queryKey: includeArchived ? ["projects-all"] : ["projects"],
    queryFn: () => fetchReferenceData<Project[]>(endpoint, "Projeler yüklenemedi"),
  })
}

export function useJobTypes() {
  return useQuery<JobType[]>({
    queryKey: ["job-types"],
    queryFn: () => fetchReferenceData<JobType[]>("/api/job-types", "İş tipleri yüklenemedi"),
  })
}

export function useUsers() {
  return useQuery<ReferenceUser[]>({
    queryKey: ["users"],
    queryFn: () => fetchReferenceData<ReferenceUser[]>("/api/users", "Kullanıcılar yüklenemedi"),
  })
}

export function useZones(projectId: string) {
  return useQuery<Zone[]>({
    queryKey: ["zones", projectId],
    queryFn: async () => {
      const zones = await fetchReferenceData<Zone[]>(`/api/zones?project_id=${projectId}`, "Zone'lar yüklenemedi")
      return sortZones(zones)
    },
    enabled: !!projectId,
  })
}

export function useAllZones() {
  return useQuery<Zone[]>({
    queryKey: ["zones-all"],
    queryFn: () => fetchReferenceData<Zone[]>("/api/zones", "Zone'lar yüklenemedi"),
  })
}
