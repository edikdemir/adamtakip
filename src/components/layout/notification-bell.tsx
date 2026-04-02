"use client"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotifications } from "@/hooks/use-notifications"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils"
import { NOTIFICATION_TYPES } from "@/lib/constants"

const notificationIcons: Record<string, string> = {
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: "📋",
  [NOTIFICATION_TYPES.TASK_APPROVED]: "✅",
  [NOTIFICATION_TYPES.TASK_REJECTED]: "❌",
  [NOTIFICATION_TYPES.TASK_COMPLETED]: "🏁",
  [NOTIFICATION_TYPES.DEADLINE_WARNING]: "⚠️",
  [NOTIFICATION_TYPES.TIMER_REMINDER]: "⏱️",
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-zinc-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h3 className="font-semibold text-sm">Bildirimler</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-zinc-500 hover:text-zinc-900"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Tümünü okundu işaretle
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Bildirim yok</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) markAsRead(notification.id)
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors",
                    !notification.is_read && "bg-blue-50/40"
                  )}
                >
                  <div className="flex gap-3">
                    <span className="text-lg leading-none mt-0.5">
                      {notificationIcons[notification.type] || "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium text-zinc-900", !notification.is_read && "font-semibold")}>
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{notification.body}</p>
                      )}
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
