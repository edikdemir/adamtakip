import { createServerClient } from "@/lib/supabase/server"
import { NotificationType, NOTIFICATION_TYPES } from "@/lib/constants"

interface CreateNotificationInput {
  user_id: string
  type: NotificationType
  title: string
  body?: string
  task_id?: number
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const supabase = createServerClient()
  await supabase.from("notifications").insert({
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body || null,
    task_id: input.task_id || null,
  })
}

export async function notifyTaskAssigned(userId: string, taskId: number, drawingNo: string, projectCode: string): Promise<void> {
  await createNotification({
    user_id: userId,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: "Yeni Görev Atandı",
    body: `${projectCode} — ${drawingNo} görevi size atandı.`,
    task_id: taskId,
  })
}

export async function notifyTaskApproved(userId: string, taskId: number, drawingNo: string): Promise<void> {
  await createNotification({
    user_id: userId,
    type: NOTIFICATION_TYPES.TASK_APPROVED,
    title: "Görev Onaylandı",
    body: `${drawingNo} görevi onaylandı.`,
    task_id: taskId,
  })
}

export async function notifyTaskRejected(userId: string, taskId: number, drawingNo: string, reason?: string): Promise<void> {
  await createNotification({
    user_id: userId,
    type: NOTIFICATION_TYPES.TASK_REJECTED,
    title: "Görev Revizeye Gönderildi",
    body: reason ? `${drawingNo}: ${reason}` : `${drawingNo} görevi revizeye gönderildi.`,
    task_id: taskId,
  })
}

export async function notifyTaskCancelled(userId: string, taskId: number, drawingNo: string, reason?: string): Promise<void> {
  await createNotification({
    user_id: userId,
    type: NOTIFICATION_TYPES.TASK_REJECTED,
    title: "Görev İptal Edildi",
    body: reason ? `${drawingNo} görevi iptal edildi: ${reason}` : `${drawingNo} görevi iptal edildi.`,
    task_id: taskId,
  })
}

export async function notifyDeadlineWarning(
  userId: string,
  taskId: number,
  drawingNo: string,
  daysOverdue: number
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: NOTIFICATION_TYPES.DEADLINE_WARNING,
    title: "Görev Süresi Geçti",
    body: `${drawingNo} görevinin hedef bitiş tarihi ${daysOverdue} gün önce geçti.`,
    task_id: taskId,
  })
}

export async function notifyTaskCompleted(adminId: string, taskId: number, drawingNo: string, workerName: string): Promise<void> {
  await createNotification({
    user_id: adminId,
    type: NOTIFICATION_TYPES.TASK_COMPLETED,
    title: "Görev Tamamlandı",
    body: `${workerName} tarafından ${drawingNo} görevi tamamlandı. Onay bekliyor.`,
    task_id: taskId,
  })
}
