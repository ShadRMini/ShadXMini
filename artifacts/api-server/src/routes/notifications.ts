import { Router, type IRouter, type Request, type Response } from "express";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getOrCreateCurrentUser } from "../lib/currentUser.js";
import { createInternalNotification } from "../lib/notifications.js";

const router: IRouter = Router();

// GET /notifications & GET /me/notifications - User notifications list
async function handleGetNotifications(req: Request, res: Response) {
  try {
    let currentUserId: number | null = null;
    let isVip = false;
    try {
      const user = await getOrCreateCurrentUser(req);
      if (user?.id) {
        currentUserId = user.id;
        if (Number(user.vipLevel || 1) > 1) isVip = true;
      }
    } catch {
      // Guest user
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    let rows;
    if (currentUserId) {
      rows = await db
        .select()
        .from(notificationsTable)
        .where(
          isVip
            ? or(
                eq(notificationsTable.targetType, "all"),
                eq(notificationsTable.targetType, "vip"),
                eq(notificationsTable.targetUserId, currentUserId)
              )
            : or(
                eq(notificationsTable.targetType, "all"),
                eq(notificationsTable.targetUserId, currentUserId)
              )
        )
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      rows = await db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.targetType, "all"))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limit)
        .offset(offset);
    }

    res.json(rows);
  } catch (error: any) {
    console.error("Fetch notifications error:", error);
    res.json([]);
  }
}

router.get("/notifications", handleGetNotifications);
router.get("/me/notifications", handleGetNotifications);

// GET /me/notifications/unread-count & GET /notifications/unread-count
async function handleGetUnreadCount(req: Request, res: Response) {
  try {
    const user = await getOrCreateCurrentUser(req);
    if (!user?.id) {
      return res.json({ count: 0 });
    }

    const currentUserId = user.id;
    const isVip = Number(user.vipLevel || 1) > 1;

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.isRead, false),
          isVip
            ? or(
                eq(notificationsTable.targetType, "all"),
                eq(notificationsTable.targetType, "vip"),
                eq(notificationsTable.targetUserId, currentUserId)
              )
            : or(
                eq(notificationsTable.targetType, "all"),
                eq(notificationsTable.targetUserId, currentUserId)
              )
        )
      );

    res.json({ count: result?.count || 0 });
  } catch (error: any) {
    console.error("Fetch unread notifications count error:", error);
    res.json({ count: 0 });
  }
}

router.get("/me/notifications/unread-count", handleGetUnreadCount);
router.get("/notifications/unread-count", handleGetUnreadCount);

// PATCH /me/notifications/:id/read & PATCH /notifications/:id/read
async function handleMarkAsRead(req: Request, res: Response) {
  try {
    const user = await getOrCreateCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    }

    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "معرف الإشعار غير صالح" });
    }

    const [updated] = await db
      .update(notificationsTable)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notificationsTable.id, id))
      .returning();

    res.json({ ok: true, notification: updated });
  } catch (error: any) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ error: error.message || "فشل تحديد الإشعار كمقروء" });
  }
}

router.patch("/me/notifications/:id/read", handleMarkAsRead);
router.patch("/notifications/:id/read", handleMarkAsRead);

// PATCH /me/notifications/read-all & PATCH /notifications/read-all
async function handleMarkAllAsRead(req: Request, res: Response) {
  try {
    const user = await getOrCreateCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    }

    const currentUserId = user.id;
    const isVip = Number(user.vipLevel || 1) > 1;

    await db
      .update(notificationsTable)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notificationsTable.isRead, false),
          isVip
            ? or(
                eq(notificationsTable.targetType, "all"),
                eq(notificationsTable.targetType, "vip"),
                eq(notificationsTable.targetUserId, currentUserId)
              )
            : or(
                eq(notificationsTable.targetType, "all"),
                eq(notificationsTable.targetUserId, currentUserId)
              )
        )
      );

    res.json({ ok: true, message: "تم تحديد جميع الإشعارات كمقروءة" });
  } catch (error: any) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({ error: error.message || "فشل تحديث حالة الإشعارات" });
  }
}

router.patch("/me/notifications/read-all", handleMarkAllAsRead);
router.patch("/notifications/read-all", handleMarkAllAsRead);

// POST /notifications - Create notification endpoint (Admin or System)
router.post("/notifications", async (req: Request, res: Response) => {
  try {
    const { targetType, targetUserId, title, content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "محتوى الإشعار مطلوب" });
    }

    const row = await createInternalNotification({
      targetType: targetType || "all",
      targetUserId: targetUserId ? Number(targetUserId) : null,
      title: title || "إشعار من النظام",
      content: content.trim(),
    });

    if (!row) {
      return res.status(500).json({ error: "تعذر حفظ الإشعار" });
    }

    res.json(row);
  } catch (error: any) {
    console.error("Create notification error:", error);
    res.status(500).json({ error: error.message || "فشل إنشاء الإشعار" });
  }
});

export default router;
