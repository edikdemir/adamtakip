"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Users } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { UserIdentity } from "@/components/admin/users/user-identity"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { PageHeader } from "@/components/layout/page-header"
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

const USER_PRESENCE_REFRESH_MS = 60_000
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000

function parseLastSeen(lastSeenAt?: string | null) {
  if (!lastSeenAt) {
    return null
  }

  const date = new Date(lastSeenAt)
  return Number.isNaN(date.getTime()) ? null : date
}

function isUserOnline(lastSeenAt?: string | null) {
  const lastSeen = parseLastSeen(lastSeenAt)
  return lastSeen ? Date.now() - lastSeen.getTime() <= ONLINE_THRESHOLD_MS : false
}

function formatLastSeen(lastSeenAt?: string | null) {
  const lastSeen = parseLastSeen(lastSeenAt)
  if (!lastSeen) {
    return "Henüz görülmedi"
  }

  const diffMs = Math.max(0, Date.now() - lastSeen.getTime())
  if (diffMs < 60_000) {
    return "Az önce"
  }

  if (diffMs < 60 * 60_000) {
    return `${Math.floor(diffMs / 60_000)} dk önce`
  }

  const now = new Date()
  const isToday =
    lastSeen.getFullYear() === now.getFullYear() &&
    lastSeen.getMonth() === now.getMonth() &&
    lastSeen.getDate() === now.getDate()

  const time = lastSeen.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  if (isToday) {
    return `Bugün ${time}`
  }

  return lastSeen.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function UserPresenceBadge({ lastSeenAt }: { lastSeenAt?: string | null }) {
  const online = isUserOnline(lastSeenAt)
  const label = online ? "Online" : lastSeenAt ? `Son görülme: ${formatLastSeen(lastSeenAt)}` : "Henüz görülmedi"

  return (
    <div className="mt-4 flex justify-center">
      <Badge
        variant="outline"
        className={`rounded-full px-2.5 py-1 text-[11px] ${
          online
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-zinc-200 bg-zinc-50 text-zinc-500"
        }`}
      >
        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-zinc-300"}`} />
        {label}
      </Badge>
    </div>
  )
}

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers({ refetchInterval: USER_PRESENCE_REFRESH_MS })
  const updateUser = useUpdateUser()

  const filteredUsers = useMemo(
    () => users.filter((user) => user.is_active),
    [users]
  )

  const inactiveUsers = useMemo(
    () => users.filter((user) => !user.is_active),
    [users]
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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm [contain-intrinsic-size:220px] [content-visibility:auto]">
              <div className="animate-pulse space-y-4">
                <div className="h-14 w-14 rounded-full bg-zinc-200" />
                <div className="h-4 w-28 rounded bg-zinc-200" />
                <div className="h-3 w-40 rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-600">Bu filtrede kullanıcı bulunamadı.</p>
          <p className="mt-1 text-sm text-zinc-400">Farklı bir arama ya da aktiflik filtresi deneyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-opacity [contain-intrinsic-size:220px] [content-visibility:auto] ${
                user.is_active ? "border-zinc-200" : "border-zinc-100 opacity-70"
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
              <UserPresenceBadge lastSeenAt={user.last_seen_at} />

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

      {inactiveUsers.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-zinc-500">Pasif Kullanıcılar ({inactiveUsers.length})</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {inactiveUsers.map((user) => (
              <div key={user.id} className="rounded-2xl border border-zinc-100 bg-white p-5 opacity-70 shadow-sm [contain-intrinsic-size:220px] [content-visibility:auto]">
                <Link href={`/admin/users/${user.id}`} className="block">
                  <UserIdentity
                    displayName={user.display_name}
                    photoUrl={user.photo_url}
                    email={user.email}
                    jobTitle={user.job_title}
                    size="lg"
                    align="center"
                  />
                </Link>
                <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-100 pt-4">
                  <Badge variant="outline" className="rounded-full px-2 py-1 text-[11px]">Pasif</Badge>
                  <Switch
                    checked={false}
                    onCheckedChange={() => updateUser.mutate({ id: user.id, updates: { is_active: true } })}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-zinc-400">
        Kullanıcılar Microsoft Entra ID ile ilk giriş yaptıklarında otomatik olarak eklenir. Pasif kullanıcılar
        burada devre dışı bırakılabilir.
      </p>
    </div>
  )
}
