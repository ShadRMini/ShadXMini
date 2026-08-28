import { Router, type IRouter, type Request, type Response } from "express";
import { db, notificationsTable } from "@workspace/db";
import { desc, eq, or, sql } from "drizzle-orm";
import { getOrCreateCurrentUser } from "../lib/currentUser.js";
import { createInternalNotification } from "../lib/notifications.js";

const router: IRouter = Router();

// GET /notifications - User notifications list
router.get("/notifications", async (req: Request, res: Response) => {
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
        .limit(100);
    } else {
      rows = await db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.targetType, "all"))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(50);
    }

    res.json(rows);
  } catch (error: any) {
    console.error("Fetch notifications error:", error);
    res.json([]);
  }
});

// POST /notifications - Create notification endpoint
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
