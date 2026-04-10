"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, Users } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { UserIdentity } from "@/components/admin/users/user-identity"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useUsers, ReferenceUser } from "@/hooks/use-reference-data"
import { ROLE_LABELS, UserRole } from "@/lib/constants"

interface User extends ReferenceUser {
  role: UserRole
  is_active: boolean
  created_at: string
}

function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<User> }) => {
      const response = await fetch(`/api/users/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Kullanıcı güncellendi")
    },
    onError: () => toast.error("Güncelleme başarısız"),
  })
}

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  user: "bg-zinc-100 text-zinc-600 border-zinc-200",
}

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers()
  const updateUser = useUpdateUser()
  const [search, setSearch] = useState("")
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("active")

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesActivity =
          activityFilter === "all" ? true : activityFilter === "active" ? user.is_active : !user.is_active
        const query = search.trim().toLowerCase()
        const matchesSearch =
          !query ||
          user.display_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.job_title ?? "").toLowerCase().includes(query)
        return matchesActivity && matchesSearch
      }),
    [activityFilter, search, users]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Kullanıcı Yönetimi"
        title="Kullanıcılar"
        description="Microsoft girişi yapan kullanıcıları arayın, filtreleyin ve rol / aktiflik bilgilerini aynı görünümden yönetin."
      />

      <MetricCardStrip
        items={[
          { label: "Toplam kullanıcı", value: users.length, icon: Users, tone: "slate" },
          { label: "Aktif", value: users.filter((user) => user.is_active).length, icon: Users, tone: "green" },
          { label: "Pasif", value: users.filter((user) => !user.is_active).length, icon: Users, tone: "amber" },
          { label: "Süper admin", value: users.filter((user) => user.role === "super_admin").length, icon: Users, tone: "blue" },
        ]}
      />

      <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ad, unvan veya e-posta ara"
              className="h-11 rounded-2xl border-zinc-200 bg-zinc-50 pl-10"
            />
          </div>

          <Select value={activityFilter} onValueChange={(value: "all" | "active" | "inactive") => setActivityFilter(value)}>
            <SelectTrigger className="h-11 rounded-2xl border-zinc-200 bg-zinc-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktif kullanıcılar</SelectItem>
              <SelectItem value="inactive">Pasif kullanıcılar</SelectItem>
              <SelectItem value="all">Tüm kullanıcılar</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center text-sm text-zinc-500">{filteredUsers.length} kullanıcı listeleniyor</div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className="animate-pulse space-y-4">
                <div className="h-14 w-14 rounded-full bg-zinc-200" />
                <div className="h-4 w-28 rounded bg-zinc-200" />
                <div className="h-3 w-40 rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/70 px-6 py-14 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-600">Bu filtrede kullanıcı bulunamadı.</p>
          <p className="mt-1 text-sm text-zinc-400">Farklı bir arama ya da aktiflik filtresi deneyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`rounded-[28px] border bg-white/92 p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)] transition-opacity ${
                user.is_active ? "border-white/80" : "border-zinc-100 opacity-70"
              }`}
            >
              <Link href={`/admin/users/${user.id}`} className="block">
                <UserIdentity
                  displayName={user.display_name}
                  photoUrl={user.photo_url}
                  email={user.email}
                  jobTitle={user.job_title}
                  size="lg"
                  align="center"
                  avatarClassName="transition-all hover:ring-blue-200"
                />
              </Link>

              <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-100 pt-4">
                <Select
                  value={user.role}
                  onValueChange={(role) => updateUser.mutate({ id: user.id, updates: { role: role as UserRole } })}
                >
                  <SelectTrigger className="h-8 w-auto rounded-full border-none bg-transparent px-0 shadow-none hover:bg-zinc-100">
                    <SelectValue>
                      <span className={`rounded-full border px-2 py-1 text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Badge variant={user.is_active ? "secondary" : "outline"} className="rounded-full px-2 py-1 text-[11px]">
                    {user.is_active ? "Aktif" : "Pasif"}
                  </Badge>
                  <Switch
                    checked={user.is_active}
                    onCheckedChange={(checked) => updateUser.mutate({ id: user.id, updates: { is_active: checked } })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-400">
        Kullanıcılar Microsoft Entra ID ile ilk giriş yaptıklarında otomatik olarak eklenir. Pasif kullanıcılar
        burada devre dışı bırakılabilir.
      </p>
    </div>
  )
}
