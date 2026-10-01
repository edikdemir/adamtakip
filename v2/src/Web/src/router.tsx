import { createBrowserRouter, Navigate, Outlet, useRouteError } from "react-router"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers/auth-provider"
import { USER_ROLES } from "@/lib/constants"
import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"
import AdminOverviewPage from "@/pages/admin/overview"
import AdminApprovalsPage from "@/pages/admin/approvals"
import AdminAssignmentsPage from "@/pages/admin/assignments"
import AdminJobTypesPage from "@/pages/admin/job-types"
import AdminProjectsPage from "@/pages/admin/projects"
import AdminReportsPage from "@/pages/admin/reports"
import AdminSettingsPage from "@/pages/admin/settings"
import AdminUsersPage from "@/pages/admin/users"
import AdminUserDetailPage from "@/pages/admin/user-detail"

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
    </div>
  )
}

// "/" — eski app/page.tsx: oturum yoksa /login, admin ise /admin, değilse /dashboard
function RootRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === USER_ROLES.SUPER_ADMIN ? "/admin" : "/dashboard"} replace />
}

// Eski proxy.ts'in sayfa tarafı: oturum yoksa /login
function RequireAuth() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

// /admin/* yalnız super_admin; diğerleri /dashboard'a
function RequireAdmin() {
  const { user } = useAuth()
  if (user?.role !== USER_ROLES.SUPER_ADMIN) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

// Eski app/error.tsx + dashboard/error.tsx
function RouteError() {
  const error = useRouteError() as { message?: string } | undefined
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">Bir hata oluştu</h2>
        <p className="mb-4 text-sm text-zinc-500">{error?.message ?? "Beklenmeyen hata"}</p>
        <div className="flex justify-center gap-3">
          <Button size="sm" onClick={() => window.location.reload()}>Tekrar Dene</Button>
          <Button variant="outline" size="sm" onClick={() => { window.location.href = "/login" }}>
            Giriş Sayfasına Dön
          </Button>
        </div>
      </div>
    </div>
  )
}

export const router = createBrowserRouter([
  { path: "/", element: <RootRedirect />, errorElement: <RouteError /> },
  { path: "/login", element: <LoginPage />, errorElement: <RouteError /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <ShellLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: "/admin", element: <AdminOverviewPage /> },
              { path: "/admin/approvals", element: <AdminApprovalsPage /> },
              { path: "/admin/assignments", element: <AdminAssignmentsPage /> },
              { path: "/admin/job-types", element: <AdminJobTypesPage /> },
              { path: "/admin/projects", element: <AdminProjectsPage /> },
              { path: "/admin/reports", element: <AdminReportsPage /> },
              { path: "/admin/settings", element: <AdminSettingsPage /> },
              { path: "/admin/users", element: <AdminUsersPage /> },
              { path: "/admin/users/:id", element: <AdminUserDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])
