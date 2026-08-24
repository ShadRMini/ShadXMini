import type { Request } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const DEFAULT_TELEGRAM_ID = "8333183867";
const DEFAULT_USERNAME = "XPayUser";
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "xpay-jwt-secret-key-2026";
const TELEGRAM_AUTH_MAX_AGE_SECONDS = Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS || 60 * 60 * 24);

export interface UserTokenPayload {
  userId: number;
  displayId?: string;
  email?: string;
  username: string;
  role: string;
}

export function generateUserToken(user: typeof usersTable.$inferSelect): string {
  const payload: UserTokenPayload = {
    userId: user.id,
    displayId: user.displayId || String(user.id),
    email: user.email || undefined,
    username: user.username,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyUserToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
  } catch {
    return null;
  }
}

export async function generateNextDisplayId(): Promise<string> {
  try {
    const result = await db.select({ maxId: sql<string>`MAX(CAST(display_id AS INTEGER))` }).from(usersTable);
    const maxVal = result[0]?.maxId ? parseInt(String(result[0].maxId), 10) : 0;
    const nextVal = Math.max(1001, isNaN(maxVal) ? 1001 : maxVal + 1);
    return String(nextVal);
  } catch {
    const fallbackVal = 1000 + Math.floor(Math.random() * 9000);
    return String(fallbackVal);
  }
}

function normalizeUsername(input?: string | null): string {
  const raw = (input || "").trim();
  if (!raw) return DEFAULT_USERNAME;
  return raw.slice(0, 64);
}

function identityError(message = "identity_missing"): never {
  const err: any = new Error(message);
  err.statusCode = 401;
  err.publicMessage = "يرجى تسجيل الدخول للوصول إلى هذه الخدمة.";
  throw err;
}

function invalidIdentityError(): never {
  const err: any = new Error("telegram_identity_invalid");
  err.statusCode = 401;
  err.publicMessage = "تعذر التحقق من هوية المستخدم. يرجى تسجيل الدخول مجدداً.";
  throw err;
}

function parseTelegramUserFromInitData(initDataRaw?: string): { telegramId: string; username: string } | null {
  try {
    const raw = String(initDataRaw || "").trim();
    if (!raw) return null;
    const p = new URLSearchParams(raw);
    const userRaw = p.get("user");
    if (!userRaw) return null;
    const user = JSON.parse(userRaw);
    if (!user?.id) return null;
    const username = normalizeUsername(
      String(user.username || `${user.first_name || ""} ${user.last_name || ""}`.trim() || DEFAULT_USERNAME),
    );
    return { telegramId: String(user.id), username };
  } catch {
    return null;
  }
}

function verifyTelegramInitData(initDataRaw: string): boolean {
  const botToken = process.env.TELEGRAM_STORE_BOT_TOKEN || "";
  if (!botToken) return false;

  const params = new URLSearchParams(initDataRaw);
  const receivedHash = params.get("hash") || "";
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) return false;

  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const received = Buffer.from(receivedHash, "hex");
  const calculated = Buffer.from(calculatedHash, "hex");
  if (received.length !== calculated.length || !timingSafeEqual(received, calculated)) return false;

  const authDate = Number(params.get("auth_date") || 0);
  if (Number.isFinite(TELEGRAM_AUTH_MAX_AGE_SECONDS) && TELEGRAM_AUTH_MAX_AGE_SECONDS > 0) {
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || Math.abs(now - authDate) > TELEGRAM_AUTH_MAX_AGE_SECONDS) return false;
  }

  return true;
}

function readVerifiedIdentityFromInitData(initDataRaw?: string): { telegramId: string; username: string } | null {
  const raw = String(initDataRaw || "").trim();
  if (!raw) return null;
  if (!verifyTelegramInitData(raw)) return null;
  return parseTelegramUserFromInitData(raw);
}

function extractInitDataCandidates(rawInput?: string): string[] {
  const raw = String(rawInput || "").trim();
  if (!raw) return [];

  const candidates = new Set<string>();
  candidates.add(raw);

  try {
    candidates.add(decodeURIComponent(raw));
  } catch {
    // keep raw only
  }

  for (const candidate of Array.from(candidates)) {
    try {
      const full = new URLSearchParams(candidate);
      const nested = full.get("tgWebAppData");
      if (nested) {
        candidates.add(nested);
        try {
          candidates.add(decodeURIComponent(nested));
        } catch {
          // keep nested only
        }
      }
    } catch {
      // ignore malformed query-like data
    }
  }

  return Array.from(candidates).map((item) => item.trim()).filter(Boolean);
}

function tryReadVerifiedIdentityFromAnyRaw(rawInput?: string): { telegramId: string; username: string } | null {
  for (const candidate of extractInitDataCandidates(rawInput)) {
    const identity = readVerifiedIdentityFromInitData(candidate);
    if (identity?.telegramId) return identity;
  }
  return null;
}

function allowUnverifiedTelegramIdentity(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_UNVERIFIED_TELEGRAM_ID === "true";
}

function readAuthTokenFromReq(req?: Request): string | null {
  if (!req) return null;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  const cookieToken = (req as any)?.cookies?.token;
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }
  return null;
}

export function getShortAccountId(identifier: string | number): string {
  const digits = String(identifier).replace(/\D/g, "");
  const n = digits ? Number(digits.slice(-10)) : 0;
  const short = ((n % 9000) + 1000).toString();
  return short.padStart(4, "0");
}

export function calculateVipLevel(totalSpentUsd: number, currentVipLevel: number = 1): number {
  if (currentVipLevel > 1) {
    // Keep manual admin upgrade if already higher
  }
  if (totalSpentUsd >= 5000) return 4; // SVIP
  if (totalSpentUsd >= 1500) return 3; // VIP3
  if (totalSpentUsd >= 500) return 2;  // VIP2
  return Math.max(1, currentVipLevel);  // VIP1
}

export function getVipBadge(vipLevel: number): { label: string; name: string; color: string } {
  switch (vipLevel) {
    case 4:
      return { label: "SVIP", name: "عضوية ماسية (SVIP)", color: "amber" };
    case 3:
      return { label: "VIP3", name: "عضوية ذهبية (VIP3)", color: "yellow" };
    case 2:
      return { label: "VIP2", name: "عضوية فضية (VIP2)", color: "blue" };
    case 1:
    default:
      return { label: "VIP1", name: "عضوية عادية (VIP1)", color: "emerald" };
  }
}

async function upsertCurrentUserByIdentity(identity: { telegramId: string; username: string }) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, identity.telegramId))
    .limit(1);

  if (existing.length > 0) {
    const current = existing[0]!;
    let shouldUpdate = false;
    const updates: Partial<typeof usersTable.$inferInsert> = {};

    if (!current.username || current.username === DEFAULT_USERNAME) {
      updates.username = identity.username;
      shouldUpdate = true;
    }
    if (!current.displayId) {
      updates.displayId = await generateNextDisplayId();
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      const [updated] = await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, current.id))
        .returning();
      return updated ?? current;
    }
    return current;
  }

  const nextDisplayId = await generateNextDisplayId();

  const inserted = await db
    .insert(usersTable)
    .values({
      telegramId: identity.telegramId,
      displayId: nextDisplayId,
      username: identity.username,
      balanceUsd: "0",
      balanceSyp: "0",
      role: "user",
      vipLevel: 1,
    })
    .returning();
  return inserted[0]!;
}

export async function getOrCreateCurrentUser(req?: Request) {
  // 1. Check for JWT Bearer / Web Session token
  const token = readAuthTokenFromReq(req);
  if (token) {
    const decoded = verifyUserToken(token);
    if (decoded?.userId) {
      const users = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, decoded.userId))
        .limit(1);
      if (users.length > 0) {
        const u = users[0]!;
        if (!u.displayId) {
          const nextDisp = await generateNextDisplayId();
          const [updated] = await db
            .update(usersTable)
            .set({ displayId: nextDisp })
            .where(eq(usersTable.id, u.id))
            .returning();
          return updated || u;
        }
        return u;
      }
    }
  }

  // 2. Fallback to Telegram WebApp headers
  const hdr = req?.headers || {};
  const initDataRaw = hdr["x-telegram-init-data"] as string | undefined;
  const queryTgWebAppData = req?.query?.["tgWebAppData"] as string | undefined;
  const bodyInitData = (req as any)?.body?.telegramInitData as string | undefined;
  const bodyTgWebAppData = (req as any)?.body?.tgWebAppData as string | undefined;

  const verifiedIdentity =
    tryReadVerifiedIdentityFromAnyRaw(initDataRaw) ||
    tryReadVerifiedIdentityFromAnyRaw(queryTgWebAppData) ||
    tryReadVerifiedIdentityFromAnyRaw(bodyInitData) ||
    tryReadVerifiedIdentityFromAnyRaw(bodyTgWebAppData);

  if (verifiedIdentity?.telegramId) {
    return upsertCurrentUserByIdentity(verifiedIdentity);
  }

  const tgIdRaw =
    (hdr["x-telegram-id"] as string | undefined) ||
    (req?.query?.["tg_id"] as string | undefined) ||
    ((req as any)?.body?.telegramId as string | undefined);

  const usernameRaw =
    (hdr["x-telegram-username"] as string | undefined) ||
    (req?.query?.["tg_username"] as string | undefined) ||
    ((req as any)?.body?.telegramUsername as string | undefined) ||
    [hdr["x-telegram-first-name"], hdr["x-telegram-last-name"]]
      .filter(Boolean)
      .join(" ") ||
    DEFAULT_USERNAME;

  const telegramId = String(tgIdRaw || "").trim();
  const hasAnyInitData = Boolean(
    String(initDataRaw || queryTgWebAppData || bodyInitData || bodyTgWebAppData || "").trim(),
  );

  if (telegramId) {
    return upsertCurrentUserByIdentity({
      telegramId,
      username: normalizeUsername(String(usernameRaw)),
    });
  }

  if (hasAnyInitData && !allowUnverifiedTelegramIdentity()) {
    invalidIdentityError();
  }

  const allowFallback = process.env.ALLOW_DEFAULT_TELEGRAM_ID === "true";
  if (allowFallback && allowUnverifiedTelegramIdentity()) {
    return upsertCurrentUserByIdentity({
      telegramId: DEFAULT_TELEGRAM_ID,
      username: DEFAULT_USERNAME,
    });
  }

  identityError();
}

export async function getOrCreateCurrentUserStrict(req?: Request) {
  return getOrCreateCurrentUser(req);
}
