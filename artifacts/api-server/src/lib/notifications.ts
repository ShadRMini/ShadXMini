import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface CreateNotificationParams {
  targetType?: "all" | "user" | "vip" | "admin" | string;
  targetUserId?: number | string | null;
  title?: string | null;
  content: string;
  status?: string;
}

export async function createInternalNotification(params: CreateNotificationParams) {
  try {
    const targetType = params.targetType || (params.targetUserId ? "user" : "all");
    let targetUserId: number | null = null;
    if (params.targetUserId != null && params.targetUserId !== "") {
      const parsed = Number(params.targetUserId);
      if (!isNaN(parsed) && parsed > 0) {
        targetUserId = parsed;
      }
    }

    const title = params.title?.trim() || "إشعار من النظام";
    const content = params.content?.trim() || "";
    if (!content) {
      console.warn("[Notification] Skipped creating notification with empty content");
      return null;
    }

    const [row] = await db
      .insert(notificationsTable)
      .values({
        targetType,
        targetUserId,
        title,
        content,
        status: params.status || "sent",
      })
      .returning();

    return row;
  } catch (error) {
    console.error("[Notification] Error creating internal notification:", error);
    return null;
  }
}

export async function notifyUserOrderAccepted(order: {
  userId: number;
  orderNumber: string;
  productName?: string;
  totalUsd?: string | number;
}) {
  return createInternalNotification({
    targetType: "user",
    targetUserId: order.userId,
    title: `✅ تم تنفيذ الطلب #${order.orderNumber}`,
    content: `تم تنفيذ طلبك بنجاح للمنتج: ${order.productName || "منتج رقمي"}. شكراً لاستخدامك خدماتنا.`,
  });
}

export async function notifyUserOrderRejected(order: {
  userId: number;
  orderNumber: string;
  productName?: string;
  totalUsd?: string | number;
  note?: string;
}) {
  const reason = order.note ? ` السبب: ${order.note}` : "";
  const refundNote = order.totalUsd ? ` وتم إرجاع مبلغ $${Number(order.totalUsd).toFixed(2)} إلى رصيد حسابك.` : "";
  return createInternalNotification({
    targetType: "user",
    targetUserId: order.userId,
    title: `❌ تم إلغاء / رفض الطلب #${order.orderNumber}`,
    content: `نأسف، تم رفض طلبك للمنتج: ${order.productName || "منتج رقمي"}.${reason}${refundNote}`,
  });
}

export async function notifyUserDepositConfirmed(deposit: {
  userId: number;
  id: number;
  amountUsd?: string | number;
  amountSyp?: string | number;
  currency?: string;
}) {
  const amountStr = deposit.currency === "SYP" && deposit.amountSyp 
    ? `${Number(deposit.amountSyp).toLocaleString("ar")} ل.س` 
    : `$${Number(deposit.amountUsd || 0).toFixed(2)}`;
  return createInternalNotification({
    targetType: "user",
    targetUserId: deposit.userId,
    title: `💰 تم شحن رصيدك بنجاح (#${deposit.id})`,
    content: `تمت الموافقة على عملية الإيداع رقم #${deposit.id} وإضافة مبلغ ${amountStr} إلى رصيد حسابك.`,
  });
}

export async function notifyUserDepositRejected(deposit: {
  userId: number;
  id: number;
  amountUsd?: string | number;
  currency?: string;
  note?: string;
}) {
  const reason = deposit.note ? ` السبب: ${deposit.note}` : "";
  return createInternalNotification({
    targetType: "user",
    targetUserId: deposit.userId,
    title: `⚠️ تم رفض عملية الإيداع (#${deposit.id})`,
    content: `تم رفض عملية الإيداع رقم #${deposit.id}.${reason} يرجى مراجعة الدعم الفني إن كنت بحاجة للمساعدة.`,
  });
}
