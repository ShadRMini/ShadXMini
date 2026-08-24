import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateUserToken, generateNextDisplayId, calculateVipLevel, getVipBadge } from "../lib/currentUser.js";

const router: IRouter = Router();

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    const cleanUsername = String(username || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ error: "اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل." });
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "البريد الإلكتروني غير صالح." });
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 خانات أو أكثر." });
    }

    // Check if user or email already exists
    const existing = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, cleanEmail), eq(usersTable.username, cleanUsername)))
      .limit(1);

    if (existing.length > 0) {
      const match = existing[0]!;
      if (match.email === cleanEmail) {
        return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل." });
      }
      return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر." });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const nextDisplayId = await generateNextDisplayId();

    const [newUser] = await db
      .insert(usersTable)
      .values({
        displayId: nextDisplayId,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        balanceUsd: "0",
        balanceSyp: "0",
        role: "user",
        vipLevel: 1,
        totalSpent: "0",
      })
      .returning();

    const token = generateUserToken(newUser!);

    // Set cookie as well for web convenience
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const vipBadge = getVipBadge(newUser!.vipLevel ?? 1);

    return res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      token,
      user: {
        id: String(newUser!.id),
        displayId: newUser!.displayId || nextDisplayId,
        username: newUser!.username,
        email: newUser!.email,
        balanceUsd: Number(newUser!.balanceUsd),
        balanceSyp: Number(newUser!.balanceSyp),
        role: newUser!.role,
        vipLevel: newUser!.vipLevel ?? 1,
        vipBadge,
        avatarUrl: newUser!.avatarUrl || null,
        createdAt: newUser!.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[Auth Register Error]:", error);
    return res.status(500).json({ error: error?.message || "حدث خطأ أثناء إنشاء الحساب." });
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { login, email, username, password } = req.body || {};
    const identifier = String(login || email || username || "").trim();
    const cleanPassword = String(password || "").trim();

    if (!identifier) {
      return res.status(400).json({ error: "يرجى إدخال اسم المستخدم أو البريد الإلكتروني." });
    }
    if (!cleanPassword) {
      return res.status(400).json({ error: "يرجى إدخال كلمة المرور." });
    }

    const isEmail = identifier.includes("@");
    const users = await db
      .select()
      .from(usersTable)
      .where(
        isEmail
          ? eq(usersTable.email, identifier.toLowerCase())
          : or(eq(usersTable.username, identifier), eq(usersTable.displayId, identifier))
      )
      .limit(1);

    if (users.length === 0) {
      return res.status(401).json({ error: "بيانات الاعتماد غير صحيحة." });
    }

    const user = users[0]!;

    if (user.banned) {
      return res.status(403).json({ error: "هذا الحساب محظور من الاستخدام. تواصل مع الدعم الفني." });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        error: "هذا الحساب مرتبط بتيليجرام ولم يتم تعيين كلمة مرور له بعد. يرجى تسجيل الدخول عبر تيليجرام.",
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "كلمة المرور غير صحيحة." });
    }

    // Update dynamic VIP level if spending increased
    const dynamicVip = calculateVipLevel(Number(user.totalSpent || 0), user.vipLevel ?? 1);
    if (dynamicVip !== user.vipLevel) {
      await db.update(usersTable).set({ vipLevel: dynamicVip }).where(eq(usersTable.id, user.id));
      user.vipLevel = dynamicVip;
    }

    const token = generateUserToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const vipBadge = getVipBadge(user.vipLevel ?? 1);

    return res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: {
        id: String(user.id),
        displayId: user.displayId || String(user.id),
        username: user.username,
        email: user.email,
        balanceUsd: Number(user.balanceUsd),
        balanceSyp: Number(user.balanceSyp),
        role: user.role,
        vipLevel: user.vipLevel ?? 1,
        vipBadge,
        avatarUrl: user.avatarUrl || null,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[Auth Login Error]:", error);
    return res.status(500).json({ error: error?.message || "حدث خطأ أثناء تسجيل الدخول." });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", async (_req, res) => {
  res.clearCookie("token");
  return res.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
});

export default router;
