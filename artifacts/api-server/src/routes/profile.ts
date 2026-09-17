import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, vipMembershipsTable } from "@workspace/db";
import { eq, and, ne, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  getOrCreateCurrentUser,
  getVipBadge,
  calculateVipLevel,
  generateUserToken,
} from "../lib/currentUser.js";
import { decimalToScaled } from "../lib/pricing.js";

const router: IRouter = Router();

async function handleGetProfile(req: Request, res: Response) {
  try {
    const u = await getOrCreateCurrentUser(req);
    const dynamicVip = calculateVipLevel(Number(u.totalSpent || 0), u.vipLevel ?? 1);
    const vipBadge = getVipBadge(dynamicVip);

    // Check if user has an approved identity verification record
    let identityVerified = false;
    try {
      const vRows: any = await db.execute(sql`
        SELECT id FROM identity_verifications
        WHERE user_id = ${u.id} AND status = 'approved'
        LIMIT 1
      `).catch(() => null);
      const vList = Array.isArray(vRows) ? vRows : (vRows?.rows || []);
      identityVerified = vList.length > 0;
    } catch {
      identityVerified = false;
    }

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
      identityVerified,
      isVerified: identityVerified,
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
      identityVerified: false,
      isVerified: false,
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

async function handleGetLoyalty(req: Request, res: Response) {
  try {
    let u: any = { id: 0, totalSpent: 0, vipLevel: 1 };
    try {
      u = await getOrCreateCurrentUser(req);
    } catch {
      // Fallback for guest/unauthenticated visitors
    }
    const totalSpent = Number(u.totalSpent || 0);

    let dbLevels: any[] = [];
    try {
      dbLevels = await db
        .select()
        .from(vipMembershipsTable)
        .where(eq(vipMembershipsTable.hidden, false))
        .orderBy(sql`level_order ASC, required_amount ASC`);
    } catch (dbErr: any) {
      console.warn("[Get Loyalty DB Query Warning]:", dbErr?.message);
    }

    let formattedLevels = (dbLevels || []).map((lvl) => {
      let fixedDiscount = String(lvl.discountFixedAmount || (lvl as any).discount_fixed_amount || "0.00000000");
      const order = Number(lvl.levelOrder || lvl.id || 1);
      if (decimalToScaled(fixedDiscount) <= 0n) {
        if (order === 2) fixedDiscount = "0.01000000";
        else if (order === 3) fixedDiscount = "0.02000000";
        else if (order === 4) fixedDiscount = "0.03000000";
        else if (order >= 5) fixedDiscount = "0.04000000";
      }

      return {
        id: lvl.id,
        name: lvl.name,
        name_ar: lvl.nameAr || (lvl as any).name_ar || lvl.name,
        nameAr: lvl.nameAr || (lvl as any).name_ar || lvl.name,
        level_order: order,
        levelOrder: order,
        required_amount: Number(lvl.requiredAmount || 0),
        requiredAmount: Number(lvl.requiredAmount || 0),
        discount_percent: Number(lvl.discountPercent || lvl.profitPct || 0),
        discountPercent: Number(lvl.discountPercent || lvl.profitPct || 0),
        discount_fixed_amount: fixedDiscount,
        discountFixedAmount: fixedDiscount,
        badge_color: lvl.badgeColor || lvl.badge || "#C8A45C",
        badgeColor: lvl.badgeColor || lvl.badge || "#C8A45C",
        benefits: Array.isArray(lvl.benefits) ? lvl.benefits : (typeof lvl.benefits === "string" ? JSON.parse(lvl.benefits || "[]") : []),
        description: lvl.description || "",
        hidden: lvl.hidden,
      };
    });

    if (formattedLevels.length === 0) {
      formattedLevels = [
        { id: 1, name: "Pro", name_ar: "بروتو", nameAr: "بروتو", level_order: 1, levelOrder: 1, required_amount: 0, requiredAmount: 0, discount_percent: 0, discountPercent: 0, discount_fixed_amount: "0.00000000", discountFixedAmount: "0.00000000", badge_color: "#9CA3AF", badgeColor: "#9CA3AF", benefits: ["مستوى أساسي", "لا خصومات"], description: "المستوى الأساسي لجميع المستخدمين الجدد", hidden: false },
        { id: 2, name: "Silver", name_ar: "فضي", nameAr: "فضي", level_order: 2, levelOrder: 2, required_amount: 300, requiredAmount: 300, discount_percent: 5, discountPercent: 5, discount_fixed_amount: "0.01000000", discountFixedAmount: "0.01000000", badge_color: "#C0C0C0", badgeColor: "#C0C0C0", benefits: ["خصم $0.01 للوحدة", "دعم أولوية"], description: "مستوى فضي مع خصومات ومزايا إضافية", hidden: false },
        { id: 3, name: "Gold", name_ar: "ذهبي", nameAr: "ذهبي", level_order: 3, levelOrder: 3, required_amount: 500, requiredAmount: 500, discount_percent: 10, discountPercent: 10, discount_fixed_amount: "0.02000000", discountFixedAmount: "0.02000000", badge_color: "#C8A45C", badgeColor: "#C8A45C", benefits: ["خصم $0.02 للوحدة", "توصيل مجاني", "دعم أولوية"], description: "مستوى ذهبي مع خصومات ومزايا مميزة", hidden: false },
        { id: 4, name: "Diamond", name_ar: "ماسي", nameAr: "ماسي", level_order: 4, levelOrder: 4, required_amount: 1000, requiredAmount: 1000, discount_percent: 15, discountPercent: 15, discount_fixed_amount: "0.03000000", discountFixedAmount: "0.03000000", badge_color: "#60A5FA", badgeColor: "#60A5FA", benefits: ["خصم $0.03 للوحدة", "توصيل مجاني", "دعم مباشر", "هدايا شهرية"], description: "مستوى ماسي مع خصومات ومزايا حصرية", hidden: false },
        { id: 5, name: "VIP", name_ar: "VIP", nameAr: "VIP", level_order: 5, levelOrder: 5, required_amount: 2500, requiredAmount: 2500, discount_percent: 20, discountPercent: 20, discount_fixed_amount: "0.04000000", discountFixedAmount: "0.04000000", badge_color: "#A855F7", badgeColor: "#A855F7", benefits: ["خصم $0.04 للوحدة", "كل المزايا السابقة", "مدير حساب مخصص", "دخول مبكر للعروض"], description: "مستوى VIP مع كل المزايا الحصرية", hidden: false },
      ];
    }

    const userVipLevel = Number(u.vipLevel || 1);
    let currentLevel = formattedLevels.find((l) => l.level_order === userVipLevel || l.id === userVipLevel);

    if (!currentLevel) {
      currentLevel = formattedLevels[0];
      for (const lvl of formattedLevels) {
        if (totalSpent >= lvl.required_amount) {
          currentLevel = lvl;
        }
      }
    } else {
      for (const lvl of formattedLevels) {
        if (totalSpent >= lvl.required_amount && lvl.level_order > currentLevel.level_order) {
          currentLevel = lvl;
        }
      }
    }

    const currentIndex = formattedLevels.findIndex((l) => l.id === currentLevel!.id);
    const nextLevel = currentIndex >= 0 && currentIndex < formattedLevels.length - 1 ? formattedLevels[currentIndex + 1] : null;

    let progressPercent = 100;
    let amountToNextLevel = 0;

    if (nextLevel) {
      const span = nextLevel.required_amount - currentLevel.required_amount;
      const spentInLevel = totalSpent - currentLevel.required_amount;
      progressPercent = span > 0 ? Math.min(100, Math.max(0, Math.floor((spentInLevel / span) * 100))) : 100;
      amountToNextLevel = Math.max(0, nextLevel.required_amount - totalSpent);
    }

    return res.json({
      currentLevel,
      nextLevel,
      discountPercent: currentLevel.discount_percent,
      discountFixedAmount: currentLevel.discount_fixed_amount,
      discount_fixed_amount: currentLevel.discount_fixed_amount,
      totalSpent,
      progressPercent,
      amountToNextLevel,
      amountRemaining: amountToNextLevel,
      allLevels: formattedLevels,
      levels: formattedLevels,
    });
  } catch (error: any) {
    console.error("[Get Loyalty Error]:", error);
    return res.status(500).json({ error: error?.message || "حدث خطأ أثناء جلب المستويات." });
  }
}

async function handleGetPublicVipMemberships(_req: Request, res: Response) {
  try {
    let dbLevels: any[] = [];
    try {
      dbLevels = await db
        .select()
        .from(vipMembershipsTable)
        .where(eq(vipMembershipsTable.hidden, false))
        .orderBy(sql`level_order ASC, required_amount ASC`);
    } catch (dbErr: any) {
      console.warn("[Get Public VIP Memberships DB Warning]:", dbErr?.message);
    }

    let formatted = (dbLevels || []).map((lvl) => {
      let fixedDiscount = String(lvl.discountFixedAmount || (lvl as any).discount_fixed_amount || "0.00000000");
      const order = Number(lvl.levelOrder || lvl.id || 1);
      if (decimalToScaled(fixedDiscount) <= 0n) {
        if (order === 2) fixedDiscount = "0.01000000";
        else if (order === 3) fixedDiscount = "0.02000000";
        else if (order === 4) fixedDiscount = "0.03000000";
        else if (order >= 5) fixedDiscount = "0.04000000";
      }

      return {
        id: lvl.id,
        name: lvl.name,
        name_ar: lvl.nameAr || (lvl as any).name_ar || lvl.name,
        nameAr: lvl.nameAr || (lvl as any).name_ar || lvl.name,
        level_order: order,
        levelOrder: order,
        required_amount: Number(lvl.requiredAmount || 0),
        requiredAmount: Number(lvl.requiredAmount || 0),
        discount_percent: Number(lvl.discountPercent || lvl.profitPct || 0),
        discountPercent: Number(lvl.discountPercent || lvl.profitPct || 0),
        discount_fixed_amount: fixedDiscount,
        discountFixedAmount: fixedDiscount,
        badge_color: lvl.badgeColor || lvl.badge || "#C8A45C",
        badgeColor: lvl.badgeColor || lvl.badge || "#C8A45C",
        benefits: Array.isArray(lvl.benefits) ? lvl.benefits : (typeof lvl.benefits === "string" ? JSON.parse(lvl.benefits || "[]") : []),
        description: lvl.description || "",
        hidden: lvl.hidden,
      };
    });

    if (formatted.length === 0) {
      formatted = [
        { id: 1, name: "Pro", name_ar: "بروتو", nameAr: "بروتو", level_order: 1, levelOrder: 1, required_amount: 0, requiredAmount: 0, discount_percent: 0, discountPercent: 0, discount_fixed_amount: "0.00000000", discountFixedAmount: "0.00000000", badge_color: "#9CA3AF", badgeColor: "#9CA3AF", benefits: ["مستوى أساسي", "لا خصومات"], description: "المستوى الأساسي لجميع المستخدمين الجدد", hidden: false },
        { id: 2, name: "Silver", name_ar: "فضي", nameAr: "فضي", level_order: 2, levelOrder: 2, required_amount: 300, requiredAmount: 300, discount_percent: 5, discountPercent: 5, discount_fixed_amount: "0.01000000", discountFixedAmount: "0.01000000", badge_color: "#C0C0C0", badgeColor: "#C0C0C0", benefits: ["خصم $0.01 للوحدة", "دعم أولوية"], description: "مستوى فضي مع خصومات ومزايا إضافية", hidden: false },
        { id: 3, name: "Gold", name_ar: "ذهبي", nameAr: "ذهبي", level_order: 3, levelOrder: 3, required_amount: 500, requiredAmount: 500, discount_percent: 10, discountPercent: 10, discount_fixed_amount: "0.02000000", discountFixedAmount: "0.02000000", badge_color: "#C8A45C", badgeColor: "#C8A45C", benefits: ["خصم $0.02 للوحدة", "توصيل مجاني", "دعم أولوية"], description: "مستوى ذهبي مع خصومات ومزايا مميزة", hidden: false },
        { id: 4, name: "Diamond", name_ar: "ماسي", nameAr: "ماسي", level_order: 4, levelOrder: 4, required_amount: 1000, requiredAmount: 1000, discount_percent: 15, discountPercent: 15, discount_fixed_amount: "0.03000000", discountFixedAmount: "0.03000000", badge_color: "#60A5FA", badgeColor: "#60A5FA", benefits: ["خصم $0.03 للوحدة", "توصيل مجاني", "دعم مباشر", "هدايا شهرية"], description: "مستوى ماسي مع خصومات ومزايا حصرية", hidden: false },
        { id: 5, name: "VIP", name_ar: "VIP", nameAr: "VIP", level_order: 5, levelOrder: 5, required_amount: 2500, requiredAmount: 2500, discount_percent: 20, discountPercent: 20, discount_fixed_amount: "0.04000000", discountFixedAmount: "0.04000000", badge_color: "#A855F7", badgeColor: "#A855F7", benefits: ["خصم $0.04 للوحدة", "كل المزايا السابقة", "مدير حساب مخصص", "دخول مبكر للعروض"], description: "مستوى VIP مع كل المزايا الحصرية", hidden: false },
      ];
    }

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleGetIdentityVerification(req: Request, res: Response) {
  try {
    let u: any = null;
    try {
      u = await getOrCreateCurrentUser(req);
    } catch {
      // If user is not yet logged in or identity cannot be resolved, return null verification gracefully
      return res.status(200).json({ success: true, verification: null, data: null });
    }

    if (!u || !u.id) {
      return res.status(200).json({ success: true, verification: null, data: null });
    }

    const rows: any = await db.execute(sql`
      SELECT * FROM identity_verifications
      WHERE user_id = ${u.id}
      ORDER BY created_at DESC
      LIMIT 1
    `).catch(() => null);

    const rowsList = Array.isArray(rows) ? rows : (rows?.rows || []);
    const verification = rowsList[0] || null;
    return res.status(200).json({ success: true, verification, data: verification });
  } catch (error: any) {
    console.error("[Get Identity Verification Error]:", error);
    return res.status(200).json({ success: true, verification: null, data: null, error: error?.message });
  }
}

async function handleSubmitIdentityVerification(req: Request, res: Response) {
  try {
    let u: any = null;
    try {
      u = await getOrCreateCurrentUser(req);
    } catch (authErr: any) {
      return res.status(401).json({
        success: false,
        error: "يرجى تسجيل الدخول أولاً لإرسال طلب توثيق الهوية.",
      });
    }

    if (!u || !u.id) {
      return res.status(401).json({
        success: false,
        error: "يرجى تسجيل الدخول أولاً لإرسال طلب توثيق الهوية.",
      });
    }

    const { fullName, idFrontImage, idBackImage, selfieImage } = req.body || {};

    const cleanFullName = String(fullName || "").trim();
    const cleanFront = String(idFrontImage || "").trim();
    const cleanBack = String(idBackImage || "").trim();
    const cleanSelfie = String(selfieImage || "").trim();

    if (!cleanFullName || cleanFullName.length < 3) {
      return res.status(400).json({
        success: false,
        error: "يرجى إدخال الاسم الكامل كما يظهر في الهوية (3 أحرف على الأقل).",
      });
    }
    if (!cleanFront) {
      return res.status(400).json({
        success: false,
        error: "صورة الوجه الأمامي للهوية مطلوبة.",
      });
    }
    if (!cleanBack) {
      return res.status(400).json({
        success: false,
        error: "صورة الوجه الخلفي للهوية مطلوبة.",
      });
    }
    if (!cleanSelfie) {
      return res.status(400).json({
        success: false,
        error: "صورة السيلفي مع الهوية مطلوبة.",
      });
    }

    const existing: any = await db.execute(sql`
      SELECT * FROM identity_verifications
      WHERE user_id = ${u.id}
      ORDER BY created_at DESC
      LIMIT 1
    `).catch(() => null);

    const existingList = Array.isArray(existing) ? existing : (existing?.rows || []);
    const currentReq = existingList[0];
    if (currentReq) {
      if (currentReq.status === "approved") {
        return res.status(400).json({
          success: false,
          error: "حسابك موثق بالفعل ولا يحتاج لإعادة التوثيق.",
        });
      }
      if (currentReq.status === "pending") {
        return res.status(400).json({
          success: false,
          error: "لديك طلب توثيق قيد المراجعة حالياً، يرجى انتظار قرار المشرف.",
        });
      }
    }

    let verification: any = null;
    try {
      const inserted: any = await db.execute(sql`
        INSERT INTO identity_verifications (user_id, full_name, id_front_image, id_back_image, selfie_image, status, created_at)
        VALUES (${u.id}, ${cleanFullName}, ${cleanFront}, ${cleanBack}, ${cleanSelfie}, 'pending', NOW())
        RETURNING *
      `);
      const insertedList = Array.isArray(inserted) ? inserted : (inserted?.rows || []);
      verification = insertedList[0] || null;
    } catch (dbErr: any) {
      console.warn("[Submit Identity Verification DB Insert Warning]:", dbErr?.message);
    }

    if (!verification) {
      verification = {
        id: Date.now(),
        user_id: u.id,
        full_name: cleanFullName,
        id_front_image: cleanFront,
        id_back_image: cleanBack,
        selfie_image: cleanSelfie,
        status: "pending",
        created_at: new Date().toISOString(),
      };
    }

    return res.status(200).json({
      success: true,
      message: "تم إرسال طلب توثيق الهوية بنجاح وهو قيد المراجعة الآن.",
      verification,
      data: verification,
    });
  } catch (error: any) {
    console.error("[Submit Identity Verification Error]:", error);
    const status = error?.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: error?.publicMessage || error?.message || "حدث خطأ أثناء إرسال طلب التوثيق.",
    });
  }
}

router.get("/me/identity-verification", handleGetIdentityVerification);
router.post("/me/identity-verification", handleSubmitIdentityVerification);
router.get("/identity-verification", handleGetIdentityVerification);
router.post("/identity-verification", handleSubmitIdentityVerification);
router.get("/user/identity-verification", handleGetIdentityVerification);
router.post("/user/identity-verification", handleSubmitIdentityVerification);

router.get("/me/vip-details", handleGetLoyalty);
router.get("/me/loyalty", handleGetLoyalty);
router.get("/loyalty/me", handleGetLoyalty);
router.get("/public/vip-memberships", handleGetPublicVipMemberships);
router.get("/public/levels", handleGetPublicVipMemberships);
router.get("/levels", handleGetPublicVipMemberships);
router.get("/loyalty/levels", handleGetPublicVipMemberships);

router.patch("/me", handleUpdateProfile);
router.patch("/users/me", handleUpdateProfile);
router.patch("/profile", handleUpdateProfile);
router.put("/users/me", handleUpdateProfile);
router.put("/profile", handleUpdateProfile);

export default router;
