import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  getOrCreateCurrentUser,
  getVipBadge,
  calculateVipLevel,
  generateUserToken,
} from "../lib/currentUser.js";

const router: IRouter = Router();

async function handleGetProfile(req: Request, res: Response) {
  try {
    const u = await getOrCreateCurrentUser(req);
    const dynamicVip = calculateVipLevel(Number(u.totalSpent || 0), u.vipLevel ?? 1);
    const vipBadge = getVipBadge(dynamicVip);

    return res.json({
      id: String(u.id),
      displayId: u.displayId || String(u.id),
      telegramId: u.telegramId || "",
      username: u.username,
      email: u.email || "",
      balanceUsd: Number(u.balanceUsd),
      balanceSyp: Number(u.balanceSyp),
      totalSpent: Number(u.totalSpent || 0),
      role: u.role,
      vipLevel: dynamicVip,
      vipBadge,
      avatarUrl: u.avatarUrl || null,
      hasPassword: Boolean(u.passwordHash),
      identityMissing: false,
    });
  } catch (error: any) {
    return res.status(200).json({
      id: "0",
      displayId: "1001",
      telegramId: "",
      username: "زائر متجر ShadMini",
      email: "",
      balanceUsd: 0,
      balanceSyp: 0,
      totalSpent: 0,
      role: "user",
      vipLevel: 1,
      vipBadge: getVipBadge(1),
      avatarUrl: null,
      hasPassword: false,
      identityMissing: true,
      error: error?.message || "identity_missing",
    });
  }
}

async function handleUpdateProfile(req: Request, res: Response) {
  try {
    const u = await getOrCreateCurrentUser(req);
    if (!u || !u.id) {
      return res.status(401).json({ error: "يرجى تسجيل الدخول لتحديث البيانات." });
    }

    const { username, email, currentPassword, newPassword, avatarUrl } = req.body || {};

    const cleanUsername = username !== undefined ? String(username).trim() : undefined;
    const cleanEmail = email !== undefined ? String(email).trim().toLowerCase() : undefined;
    const cleanCurrentPassword = currentPassword !== undefined ? String(currentPassword).trim() : undefined;
    const cleanNewPassword = newPassword !== undefined ? String(newPassword).trim() : undefined;
    const cleanAvatarUrl = avatarUrl !== undefined ? (String(avatarUrl).trim() || null) : undefined;

    // 1. Validate Username if provided
    if (cleanUsername !== undefined) {
      if (cleanUsername.length < 3) {
        return res.status(400).json({ error: "اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل." });
      }

      if (cleanUsername !== u.username) {
        // Check uniqueness across other users
        const existingUsers = await db
          .select()
          .from(usersTable)
          .where(and(eq(usersTable.username, cleanUsername), ne(usersTable.id, u.id)))
          .limit(1);

        if (existingUsers.length > 0) {
          return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر." });
        }
      }
    }

    // 2. Validate Email if provided
    if (cleanEmail !== undefined && cleanEmail !== "") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: "البريد الإلكتروني المدخل غير صالح." });
      }

      if (cleanEmail !== (u.email || "").toLowerCase()) {
        const existingEmails = await db
          .select()
          .from(usersTable)
          .where(and(eq(usersTable.email, cleanEmail), ne(usersTable.id, u.id)))
          .limit(1);

        if (existingEmails.length > 0) {
          return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل بحساب آخر." });
        }
      }
    }

    // 3. Security: Current Password Verification
    // If the account has a password set, currentPassword is required to approve modifications
    if (u.passwordHash) {
      if (!cleanCurrentPassword) {
        return res.status(400).json({ error: "يرجى إدخال كلمة المرور الحالية لتأكيد التغييرات." });
      }

      const isCurrentPasswordCorrect = await bcrypt.compare(cleanCurrentPassword, u.passwordHash);
      if (!isCurrentPasswordCorrect) {
        return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة." });
      }
    }

    // 4. Validate and hash New Password if provided
    let newPasswordHash: string | undefined = undefined;
    if (cleanNewPassword) {
      if (cleanNewPassword.length < 6) {
        return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 خانات أو أكثر." });
      }
      newPasswordHash = await bcrypt.hash(cleanNewPassword, 10);
    }

    // 5. Construct update payload
    const updatePayload: Partial<typeof usersTable.$inferInsert> = {};
    if (cleanUsername !== undefined && cleanUsername !== u.username) {
      updatePayload.username = cleanUsername;
    }
    if (cleanEmail !== undefined && cleanEmail !== (u.email || "")) {
      updatePayload.email = cleanEmail || null;
    }
    if (newPasswordHash !== undefined) {
      updatePayload.passwordHash = newPasswordHash;
    }
    if (cleanAvatarUrl !== undefined) {
      updatePayload.avatarUrl = cleanAvatarUrl;
    }

    let updatedUser = u;
    if (Object.keys(updatePayload).length > 0) {
      const [saved] = await db
        .update(usersTable)
        .set(updatePayload)
        .where(eq(usersTable.id, u.id))
        .returning();
      if (saved) {
        updatedUser = saved;
      }
    }

    // 6. Regenerate JWT token so claims and display names are updated
    const newToken = generateUserToken(updatedUser);
    res.cookie("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const dynamicVip = calculateVipLevel(Number(updatedUser.totalSpent || 0), updatedUser.vipLevel ?? 1);
    const vipBadge = getVipBadge(dynamicVip);

    return res.json({
      success: true,
      message: "تم تحديث الملف الشخصي بنجاح",
      token: newToken,
      user: {
        id: String(updatedUser.id),
        displayId: updatedUser.displayId || String(updatedUser.id),
        telegramId: updatedUser.telegramId || "",
        username: updatedUser.username,
        email: updatedUser.email || "",
        balanceUsd: Number(updatedUser.balanceUsd),
        balanceSyp: Number(updatedUser.balanceSyp),
        totalSpent: Number(updatedUser.totalSpent || 0),
        role: updatedUser.role,
        vipLevel: dynamicVip,
        vipBadge,
        avatarUrl: updatedUser.avatarUrl || null,
        hasPassword: Boolean(updatedUser.passwordHash),
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[Update Profile Error]:", error);
    return res.status(500).json({ error: error?.message || "حدث خطأ أثناء تحديث الملف الشخصي." });
  }
}

// Map endpoints
router.get("/me", handleGetProfile);
router.get("/users/me", handleGetProfile);
router.get("/profile", handleGetProfile);

router.patch("/me", handleUpdateProfile);
router.patch("/users/me", handleUpdateProfile);
router.patch("/profile", handleUpdateProfile);
router.put("/users/me", handleUpdateProfile);
router.put("/profile", handleUpdateProfile);

export default router;
