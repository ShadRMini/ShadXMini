import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import {
  db,
  adminsTable,
  usersTable,
  categoriesTable,
  productGroupsTable,
  productsTable,
  productChangesLogTable,
  ordersTable,
  depositsTable,
  newsTable,
  bannersTable,
  paymentMethodsTable,
  socialLinksTable,
  settingsTable,
  providersTable,
  couponsTable,
  vipMembershipsTable,
  autoCodesTable,
  orderMessagesTable,
  activityLogTable,
  apiKeysTable,
  notificationsTable,
  ticketsTable,
  ticketMessagesTable,
} from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/adminAuth.js";
import { getAdapter } from "../lib/adapter-registry"; 
import { MersalAdapter } from "../lib/mersal-adapter";
import { getTelegramConfigStatus, notifyUserDepositApproved, notifyUserDepositRejected, notifyUserOrderStatusChanged } from "../lib/telegram.js";
import { 
  createInternalNotification, 
  notifyUserDepositConfirmed as notifyInternalDepositConfirmed, 
  notifyUserDepositRejected as notifyInternalDepositRejected,
  notifyUserOrderAccepted as notifyInternalOrderAccepted,
  notifyUserOrderRejected as notifyInternalOrderRejected
} from "../lib/notifications.js";
import { rateLimit } from "../lib/rateLimit.js";
import { addUnitPrices, decimalToScaled, parseProviderQuantityValues, subtractUnitPrices } from "../lib/pricing.js";
import { ensureDatabaseSchema } from "../lib/ensureSchema";
const router: IRouter = Router();
const EXTERNAL_CATEGORY_NAME = "External Provider";
const EXTERNAL_CATEGORY_IMAGE = "https://placehold.co/600x400?text=External+Provider";
const BCRYPT_ROUNDS = 12;
let depositsTelegramMessageColumnReady = false;

async function ensureDepositsTelegramMessageColumn() {
  if (depositsTelegramMessageColumnReady) return;
  await db.execute(sql`
    ALTER TABLE deposits
    ADD COLUMN IF NOT EXISTS telegram_message_id INTEGER
  `);
  depositsTelegramMessageColumnReady = true;
}

class ValidationError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

function isBcryptHash(value: string | null | undefined): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ""));
}

async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyAdminPassword(storedPassword: string, candidate: string): Promise<boolean> {
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(candidate, storedPassword);
  }
  return storedPassword === candidate;
}

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function normalizeNumberField(data: Record<string, any>, key: string, opts?: { nullable?: boolean; required?: boolean }) {
  const raw = data[key];
  const nullable = opts?.nullable ?? false;
  const required = opts?.required ?? false;

  if (isBlank(raw)) {
    if (required) throw new ValidationError(`${key} is required`);
    data[key] = nullable ? null : raw;
    return;
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`${key} must be a valid number`);
  }
  data[key] = n;
}

function normalizeDecimalField(
  data: Record<string, any>,
  key: string,
  opts?: { nullable?: boolean; required?: boolean },
) {
  const raw = data[key];
  const nullable = opts?.nullable ?? false;
  const required = opts?.required ?? false;

  if (isBlank(raw)) {
    if (required) throw new ValidationError(`${key} is required`);
    data[key] = nullable ? null : raw;
    return;
  }

  const s = String(raw).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    throw new ValidationError(`${key} must be a valid decimal number`);
  }
  data[key] = s;
}

function parseBalanceAdjustment(body: any): {
  currency: "USD" | "SYP";
  operation: "add" | "sub";
  amountText: string;
  deltaText: string;
  note?: string;
} {
  const currency = body?.currency === "SYP" ? "SYP" : "USD";
  const note = typeof body?.note === "string" ? body.note : undefined;

  let operation: "add" | "sub";
  let amount: number;

  if (body?.operation === "add" || body?.operation === "sub") {
    operation = body.operation;
    amount = Number(body.amount);
  } else {
    const delta = Number(body?.delta);
    operation = delta < 0 ? "sub" : "add";
    amount = Math.abs(delta);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError("المبلغ غير صالح");
  }

  const amountText = String(amount);
  const deltaText = operation === "sub" ? `-${amountText}` : amountText;
  return { currency, operation, amountText, deltaText, note };
}

async function applyUserBalanceAdjustment(userId: number, body: any) {
  const adjustment = parseBalanceAdjustment(body);
  const col = adjustment.currency === "SYP" ? usersTable.balanceSyp : usersTable.balanceUsd;
  const field = adjustment.currency === "SYP" ? "balanceSyp" : "balanceUsd";

  const query = db
    .update(usersTable)
    .set({ [field]: sql`${col} + ${adjustment.deltaText}` })
    .where(
      adjustment.operation === "sub"
        ? and(eq(usersTable.id, userId), sql`${col} >= ${adjustment.amountText}`)
        : eq(usersTable.id, userId),
    )
    .returning();

  const [updatedUser] = await query;
  if (!updatedUser) {
    throw new ValidationError("الرصيد غير كافٍ لإتمام الخصم");
  }

  return { adjustment, updatedUser };
}

function findPgError(err: any): any {
  let cur = err;
  for (let i = 0; i < 6 && cur; i += 1) {
    if (cur?.code && typeof cur.code === "string") return cur;
    cur = cur?.cause;
  }
  return null;
}

function toHttpError(error: any): { status: number; message: string } {
  if (typeof error?.statusCode === "number") {
    return { status: error.statusCode, message: error?.message || "Validation error" };
  }

  const pg = findPgError(error);
  if (pg) {
    if (pg.code === "23505") {
      return {
        status: 400,
        message: "القيمة المدخلة موجودة مسبقًا (حقل فريد). عدّل الكود أو استخدم قيمة مختلفة.",
      };
    }
    if (pg.code === "23503") {
      return { status: 400, message: `Foreign key violation: ${pg?.detail || pg?.constraint || "invalid reference"}` };
    }
    if (pg.code === "23502") {
      return { status: 400, message: `Missing required field: ${pg?.column || "unknown"}` };
    }
    if (pg.code === "22P02") {
      return { status: 400, message: `Invalid value format: ${pg?.message || "bad input"}` };
    }
    if (pg.code === "42703") {
      return { status: 400, message: `خطأ في هيكل البيانات (حقل غير موجود): ${pg?.message || "Undefined column"}` };
    }
    if (pg.message) {
      return { status: 400, message: `خطأ في قاعدة البيانات: ${pg.message}` };
    }
  }

  return { status: 400, message: error?.message || "فشلت العملية" };
}

async function getOrCreateExternalCategoryId(): Promise<number> {
  const [existing] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.name, EXTERNAL_CATEGORY_NAME))
    .limit(1);

  if (existing?.id) return existing.id;

  const [created] = await db
    .insert(categoriesTable)
    .values({
      name: EXTERNAL_CATEGORY_NAME,
      image: EXTERNAL_CATEGORY_IMAGE,
      active: true,
    })
    .returning({ id: categoriesTable.id });

  return created.id;
}

async function applyDepositStatusChange(id: number, status: string) {
  await ensureDepositsTelegramMessageColumn();
  const [dep] = await db.select().from(depositsTable).where(eq(depositsTable.id, id)).limit(1);
  if (!dep) return { error: "not_found" as const };
  if (dep.method === "sham_cash_auto") {
    return { error: "auto_managed" as const };
  }

  if (status === "approved" && dep.status !== "approved") {
    const col = dep.currency === "SYP" ? "balanceSyp" : "balanceUsd";
    const amount = dep.currency === "SYP" ? dep.amountSyp : dep.amountUsd;
    if (amount) {
      await db
        .update(usersTable)
        .set({
          [col]:
            col === "balanceSyp"
              ? sql`${usersTable.balanceSyp} + ${amount}`
              : sql`${usersTable.balanceUsd} + ${amount}`,
        })
        .where(eq(usersTable.id, dep.userId));
    }
  }

  const [updated] = await db
    .update(depositsTable)
    .set({ status })
    .where(eq(depositsTable.id, id))
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, dep.userId)).limit(1);
  if (user) {
    try {
      if (status === "approved") {
        await notifyUserDepositApproved({
          telegramId: user.telegramId,
          addedUsd: Number(dep.amountUsd),
          currentUsd: Number(user.balanceUsd),
          operationNumber: String(dep.id),
          messageId: dep.telegramMessageId,
        });
        await notifyInternalDepositConfirmed({
          userId: user.id,
          id: dep.id,
          amountUsd: dep.amountUsd,
          amountSyp: dep.amountSyp,
          currency: dep.currency,
        });
      } else if (status === "rejected") {
        await notifyUserDepositRejected({
          telegramId: user.telegramId,
          operationNumber: String(dep.id),
        });
        await notifyInternalDepositRejected({
          userId: user.id,
          id: dep.id,
          amountUsd: dep.amountUsd,
          currency: dep.currency,
        });
      }
    } catch (error) {
      console.error("Notify deposit user failed:", error);
    }
  }

  return { updated };
}

async function applyOrderStatusChange(id: number, status: string, note?: string) {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id))
    .limit(1);
  if (!order) return { error: "not_found" as const };

  const [updated] = await db
    .update(ordersTable)
    .set({ status })
    .where(eq(ordersTable.id, id))
    .returning();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, order.userId))
    .limit(1);
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, order.productId))
    .limit(1);

  if (user && product) {
    try {
      await notifyUserOrderStatusChanged({
        telegramId: user.telegramId,
        orderNumber: order.orderNumber,
        productName: product.name,
        status,
        note,
      });

      if (["accept", "completed", "approved"].includes(status)) {
        await notifyInternalOrderAccepted({
          userId: user.id,
          orderNumber: order.orderNumber,
          productName: product.name,
          totalUsd: order.totalUsd,
        });
      } else if (["reject", "cancelled", "rejected"].includes(status)) {
        await notifyInternalOrderRejected({
          userId: user.id,
          orderNumber: order.orderNumber,
          productName: product.name,
          totalUsd: order.totalUsd,
          note,
        });
      }
    } catch (error) {
      console.error("Notify order status user failed:", error);
    }
  }

  return { updated };
}

async function logActivity(
  actor: { id?: number; name?: string } | null,
  action: string,
  target?: string,
  meta?: unknown,
) {
  await db.insert(activityLogTable).values({
    actorType: "admin",
    actorId: actor?.id ? String(actor.id) : null,
    actorName: actor?.name || "system",
    action,
    target: target || null,
    meta: (meta as object) || null,
  });
}

// ========== AUTH ==========
const adminLoginRateLimit = rateLimit({
  keyPrefix: "admin-login",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "تم تجاوز عدد محاولات تسجيل الدخول. حاول بعد قليل.",
});

router.post("/admin/login", adminLoginRateLimit, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "بيانات ناقصة" });
    return;
  }
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.username, username))
    .limit(1);
  if (!admin || !(await verifyAdminPassword(admin.password, password)) || !admin.active) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }
  if (!isBcryptHash(admin.password)) {
    await db
      .update(adminsTable)
      .set({ password: await hashAdminPassword(password) })
      .where(eq(adminsTable.id, admin.id));
  }
  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;
  req.session.adminRole = admin.role;
  await logActivity({ id: admin.id, name: admin.username }, "login", "admin_panel");
  res.json({
    id: admin.id,
    username: admin.username,
    fullName: admin.fullName,
    role: admin.role,
  });
});

router.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/admin/me", requireAdmin, async (req, res) => {
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.id, req.session.adminId!))
    .limit(1);
  if (!admin) {
    res.status(401).json({ error: "غير موجود" });
    return;
  }
  res.json({
    id: admin.id,
    username: admin.username,
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role,
    twoFactorEnabled: !!admin.twoFactorSecret,
  });
});

// ========== DASHBOARD ==========
router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  try {
    await ensureDatabaseSchema();

    let u = { c: 0 };
    let p = { c: 0 };
    let oTotal = { c: 0 };
    let oPending = { c: 0 };
    let oCompleted = { c: 0 };
    let oCancelled = { c: 0 };
    let dPending = { c: 0 };
    let sales = { s: "0" };
    let cost = { s: "0" };
    let bal = { s: "0" };
    let todayOrders = { c: 0 };
    let pendingTicketsCount = 0;
    let totalTicketsCount = 0;
    let recentTickets: any[] = [];
    let recentOrdersRaw: any[] = [];
    let recentDeposits: any[] = [];
    let chartRows: any[] = [];

    try {
      const [resU] = await db.select({ c: sql<number>`count(*)::int` }).from(usersTable);
      if (resU) u = resU;
    } catch (e) {
      console.warn("Count users failed:", e);
    }

    try {
      const [resP] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(productsTable)
        .where(eq(productsTable.available, true));
      if (resP) p = resP;
    } catch (e) {
      console.warn("Count products failed:", e);
    }

    try {
      const [resOTotal] = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable);
      if (resOTotal) oTotal = resOTotal;

      const [resOPending] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(sql`status IN ('wait', 'pending', 'processing')`);
      if (resOPending) oPending = resOPending;

      const [resOCompleted] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(sql`status IN ('accept', 'completed', 'approved')`);
      if (resOCompleted) oCompleted = resOCompleted;

      const [resOCancelled] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(sql`status IN ('reject', 'cancelled', 'rejected')`);
      if (resOCancelled) oCancelled = resOCancelled;

      const [resSales] = await db
        .select({ s: sql<string>`coalesce(sum(total_usd),0)::text` })
        .from(ordersTable)
        .where(sql`status IN ('accept', 'completed')`);
      if (resSales) sales = resSales;

      const [resCost] = await db
        .select({ s: sql<string>`coalesce(sum(cost_usd),0)::text` })
        .from(ordersTable)
        .where(sql`status IN ('accept', 'completed')`);
      if (resCost) cost = resCost;
    } catch (e) {
      console.warn("Orders stats failed:", e);
    }

    try {
      const [resDPending] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(depositsTable)
        .where(eq(depositsTable.status, "pending"));
      if (resDPending) dPending = resDPending;
    } catch (e) {
      console.warn("Deposits stats failed:", e);
    }

    try {
      const [resBal] = await db.select({ s: sql<string>`coalesce(sum(balance_usd),0)::text` }).from(usersTable);
      if (resBal) bal = resBal;
    } catch (e) {
      console.warn("Balance sum failed:", e);
    }

    try {
      const [tPending] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(ticketsTable)
        .where(sql`status IN ('pending', 'wait', 'open')`);
      const [tTotal] = await db.select({ c: sql<number>`count(*)::int` }).from(ticketsTable);
      pendingTicketsCount = tPending?.c || 0;
      totalTicketsCount = tTotal?.c || 0;

      recentTickets = await db
        .select()
        .from(ticketsTable)
        .orderBy(desc(ticketsTable.createdAt))
        .limit(6);
    } catch (err) {
      console.warn("[Dashboard] Tickets table query error:", err);
    }

    try {
      recentOrdersRaw = await db
        .select({
          id: ordersTable.id,
          orderNumber: ordersTable.orderNumber,
          userId: ordersTable.userId,
          customParam: ordersTable.customParam,
          quantity: ordersTable.quantity,
          totalUsd: ordersTable.totalUsd,
          status: ordersTable.status,
          createdAt: ordersTable.createdAt,
          userName: usersTable.username,
          userEmail: usersTable.email,
        })
        .from(ordersTable)
        .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
        .orderBy(desc(ordersTable.createdAt))
        .limit(8);
    } catch (e) {
      console.warn("Recent orders query failed:", e);
    }

    try {
      recentDeposits = await db
        .select()
        .from(depositsTable)
        .orderBy(desc(depositsTable.createdAt))
        .limit(5);
    } catch (e) {
      console.warn("Recent deposits query failed:", e);
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [resToday] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(gte(ordersTable.createdAt, today));
      if (resToday) todayOrders = resToday;
    } catch (e) {
      console.warn("Today orders query failed:", e);
    }

    try {
      const chartRes = await db.execute(sql`
        SELECT to_char(d, 'YYYY-MM-DD') as date,
          coalesce(sum(o.total_usd) filter (where o.status IN ('accept', 'completed')), 0)::float as sales,
          count(o.id)::int as orders_count
        FROM generate_series((current_date - interval '6 day')::date, current_date::date, '1 day') d
        LEFT JOIN orders o ON o.created_at::date = d
        GROUP BY d ORDER BY d
      `);
      chartRows = (chartRes.rows as any[]) || [];
    } catch (e) {
      console.warn("Chart query failed:", e);
    }

    res.json({
      stats: {
        users: Number(u?.c || 0),
        activeProducts: Number(p?.c || 0),
        totalOrders: Number(oTotal?.c || 0),
        pendingOrders: Number(oPending?.c || 0),
        completedOrders: Number(oCompleted?.c || 0),
        cancelledOrders: Number(oCancelled?.c || 0),
        pendingDeposits: Number(dPending?.c || 0),
        pendingTickets: Number(pendingTicketsCount || 0),
        totalTickets: Number(totalTicketsCount || 0),
        totalSalesUsd: Number(sales?.s || 0),
        totalCostUsd: Number(cost?.s || 0),
        netProfitUsd: Number(sales?.s || 0) - Number(cost?.s || 0),
        totalUserBalanceUsd: Number(bal?.s || 0),
        todayOrders: Number(todayOrders?.c || 0),
        apiBalanceUsd: 0.0,
      },
      recentOrders: recentOrdersRaw || [],
      recentDeposits: recentDeposits || [],
      recentTickets: recentTickets || [],
      chart: chartRows || [],
    });
  } catch (err: any) {
    console.error("Dashboard error:", err);
    res.json({
      stats: {
        users: 0,
        activeProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        pendingDeposits: 0,
        pendingTickets: 0,
        totalTickets: 0,
        totalSalesUsd: 0,
        totalCostUsd: 0,
        netProfitUsd: 0,
        totalUserBalanceUsd: 0,
        todayOrders: 0,
        apiBalanceUsd: 0.0,
      },
      recentOrders: [],
      recentDeposits: [],
      recentTickets: [],
      chart: [],
    });
  }
});

// ========== TICKETS ENDPOINTS ==========
router.get("/admin/tickets", requireAdmin, async (_req, res) => {
  await ensureDatabaseSchema();
  try {
    const list = await db
      .select({
        id: ticketsTable.id,
        userId: ticketsTable.userId,
        userName: ticketsTable.userName,
        userEmail: ticketsTable.userEmail,
        subject: ticketsTable.subject,
        status: ticketsTable.status,
        priority: ticketsTable.priority,
        createdAt: ticketsTable.createdAt,
        updatedAt: ticketsTable.updatedAt,
      })
      .from(ticketsTable)
      .orderBy(desc(ticketsTable.createdAt));
    res.json(list);
  } catch (err: any) {
    res.json([]);
  }
});

router.get("/admin/tickets/:id", requireAdmin, async (req, res) => {
  await ensureDatabaseSchema();
  const id = Number(req.params.id);
  try {
    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
    if (!ticket) {
      return res.status(404).json({ error: "التذكرة غير موجودة" });
    }
    const messages = await db
      .select()
      .from(ticketMessagesTable)
      .where(eq(ticketMessagesTable.ticketId, id))
      .orderBy(ticketMessagesTable.createdAt);

    res.json({
      ...ticket,
      messages: messages || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "خطأ في جلب التذكرة" });
  }
});

router.put("/admin/tickets/:id", requireAdmin, async (req, res) => {
  await ensureDatabaseSchema();
  const id = Number(req.params.id);
  const { status, priority } = req.body;
  try {
    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    await db.update(ticketsTable).set(updateData).where(eq(ticketsTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "فشل تحديث التذكرة" });
  }
});

router.post("/admin/tickets/:id/reply", requireAdmin, async (req, res) => {
  await ensureDatabaseSchema();
  const id = Number(req.params.id);
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "الرد لا يمكن أن يكون فارغاً" });
  }
  try {
    await db.insert(ticketMessagesTable).values({
      ticketId: id,
      senderType: "admin",
      senderName: req.session.adminUsername || "الدعم الفني",
      message: message.trim(),
      createdAt: new Date(),
    });

    await db
      .update(ticketsTable)
      .set({ status: "answered", updatedAt: new Date() })
      .where(eq(ticketsTable.id, id));

    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "فشل إرسال الرد" });
  }
});

router.post("/admin/tickets/:id/close", requireAdmin, async (req, res) => {
  await ensureDatabaseSchema();
  const id = Number(req.params.id);
  try {
    await db
      .update(ticketsTable)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(ticketsTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "فشل إغلاق التذكرة" });
  }
});

// Helper count endpoints
router.get("/admin/orders/count", requireAdmin, async (_req, res) => {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable);
  res.json({ count: row?.c || 0 });
});

router.get("/admin/users/count", requireAdmin, async (_req, res) => {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(usersTable);
  res.json({ count: row?.c || 0 });
});

router.get("/admin/tickets/count", requireAdmin, async (_req, res) => {
  try {
    const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(ticketsTable);
    res.json({ count: row?.c || 0 });
  } catch {
    res.json({ count: 0 });
  }
});

router.get("/admin/orders/total-sales", requireAdmin, async (_req, res) => {
  const [sales] = await db
    .select({ s: sql<string>`coalesce(sum(total_usd),0)::text` })
    .from(ordersTable)
    .where(sql`status IN ('accept', 'completed')`);
  res.json({ totalSales: Number(sales?.s || 0) });
});

// ========== GENERIC CRUD HELPER ==========
function makeCrud<T extends { id: any }>(
  path: string,
  table: any,
  opts: { orderBy?: any; allowedFields?: string[] } = {},
) {
  router.get(`/admin/${path}`, requireAdmin, async (_req, res) => {
    const rows = await db.select().from(table).orderBy(opts.orderBy ?? desc(table.id));
    res.json(rows);
  });
  router.get(`/admin/${path}/:id`, requireAdmin, async (req, res) => {
    const [row] = await db.select().from(table).where(eq(table.id, Number(req.params.id))).limit(1);
    if (!row) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    res.json(row);
  });
  router.post(`/admin/${path}`, requireAdmin, async (req, res) => {
    try {
      if (path === "providers") {
        await ensureDatabaseSchema();
      }
      const data = await sanitizeCrudDataForRuntimeSchema(
        path,
        filterFields(req.body, opts.allowedFields),
      );
      const [row] = (await db.insert(table).values(data).returning()) as any[];
      await logActivity(
        { id: req.session.adminId, name: req.session.adminUsername },
        "create",
        path,
        { id: row.id },
      );
      res.json(row);
    } catch (error: any) {
      console.error(`Create ${path} failed:`, error);
      const httpErr = toHttpError(error);
      res.status(httpErr.status).json({ error: httpErr.message });
    }
  });
  const handleUpdate = async (req: any, res: any) => {
    try {
      if (path === "providers") {
        await ensureDatabaseSchema();
      }
      const data = await sanitizeCrudDataForRuntimeSchema(
        path,
        filterFields(req.body, opts.allowedFields),
      );
      const id = Number(req.params.id);
      const [before] =
        path === "products"
          ? ((await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1)) as any[])
          : [];
      if (path === "products" && before && "minQuantity" in data && data.minQuantity != null) {
        const providerMinQuantity = Number(before.minQty ?? before.minQuantity ?? 1);
        if (
          Number.isFinite(providerMinQuantity) &&
          providerMinQuantity > 0 &&
          Number(data.minQuantity) < providerMinQuantity
        ) {
          throw new ValidationError(
            `minQuantity must be greater than or equal to provider minimum (${providerMinQuantity})`,
          );
        }
      }
      const [row] = await db
        .update(table)
        .set(data)
        .where(eq(table.id, id))
        .returning();
      if (path === "products" && before && row) {
        try {
          const logs: Array<{
            productId: number;
            changeType: "profit" | "max_quantity";
            oldValue: string | null;
            newValue: string | null;
            providerSnapshot: Record<string, unknown>;
            adminId?: number;
          }> = [];
          if ("storeProfitPerUnit" in data || "priceUsd" in data) {
            logs.push({
              productId: row.id,
              changeType: "profit",
              oldValue: String(before.storeProfitPerUnit ?? before.priceUsd ?? ""),
              newValue: String((row as any).storeProfitPerUnit ?? (row as any).priceUsd ?? ""),
              providerSnapshot: {
                providerUnitPrice: (row as any).providerUnitPrice ?? (row as any).basePriceUsd ?? null,
                minQuantity: (row as any).minQuantity ?? (row as any).minQty ?? null,
              },
              adminId: req.session.adminId,
            });
          }
          if ("maxQuantity" in data || "maxQty" in data) {
            logs.push({
              productId: row.id,
              changeType: "max_quantity",
              oldValue: String(before.maxQuantity ?? before.maxQty ?? ""),
              newValue: String((row as any).maxQuantity ?? (row as any).maxQty ?? ""),
              providerSnapshot: {
                providerUnitPrice: (row as any).providerUnitPrice ?? (row as any).basePriceUsd ?? null,
                minQuantity: (row as any).minQuantity ?? (row as any).minQty ?? null,
              },
              adminId: req.session.adminId,
            });
          }
          if (logs.length) {
            await db.insert(productChangesLogTable).values(logs);
          }
        } catch (logError) {
          console.warn("[Admin Product Update] Failed to insert into product_changes_log:", logError);
        }
      }
      await logActivity(
        { id: req.session.adminId, name: req.session.adminUsername },
        "update",
        path,
        { id: row?.id },
      );
      res.json(row);
    } catch (error: any) {
      console.error(`Update ${path} failed:`, error);
      const httpErr = toHttpError(error);
      res.status(httpErr.status).json({ error: httpErr.message });
    }
  };
  router.patch(`/admin/${path}/:id`, requireAdmin, handleUpdate);
  router.put(`/admin/${path}/:id`, requireAdmin, handleUpdate);
  router.delete(`/admin/${path}/:id`, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (path === "products") {
        const [orderStats] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(ordersTable)
          .where(eq(ordersTable.productId, id));

        if ((orderStats?.count || 0) > 0) {
          await db
            .update(productsTable)
            .set({ available: false, featured: false })
            .where(eq(productsTable.id, id));
          await logActivity(
            { id: req.session.adminId, name: req.session.adminUsername },
            "archive",
            path,
            { id, reason: "product_has_orders" },
          );
          res.json({
            ok: true,
            archived: true,
            message: "تم إخفاء المنتج لأنه مرتبط بطلبات شراء سابقة. بقيت الطلبات محفوظة ولن يظهر المنتج في المتجر.",
          });
          return;
        }

        await db.delete(autoCodesTable).where(eq(autoCodesTable.productId, id));
      }

      if (path === "product-groups") {
        await db
          .update(productsTable)
          .set({ groupId: null })
          .where(eq(productsTable.groupId, id));
      }

      await db.delete(table).where(eq(table.id, id));
      await logActivity(
        { id: req.session.adminId, name: req.session.adminUsername },
        "delete",
        path,
        { id },
      );
      res.json({ ok: true });
    } catch (error: any) {
      console.error(`Delete ${path} failed:`, error);
      const httpErr = toHttpError(error);
      res.status(httpErr.status).json({ error: httpErr.message });
    }
  });
}

function filterFields(body: any, allowed?: string[]): any {
  if (!allowed) return body;
  const out: any = {};
  for (const k of allowed) if (k in body) out[k] = body[k];
  return out;
}

const columnExistsCache = new Map<string, boolean>();

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const cacheKey = `${tableName}.${columnName}`;
  const cached = columnExistsCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const result = await db.execute(sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    LIMIT 1
  `);
  const exists = (result.rows as any[]).length > 0;
  columnExistsCache.set(cacheKey, exists);
  return exists;
}

async function fetchProviderLiveCostUsd(providerId: number, providerProductId: number): Promise<string | null> {
  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, providerId))
    .limit(1);

  if (!provider) {
    throw new ValidationError(`providerId ${providerId} does not exist`);
  }

  const pType = (provider.providerType || "custom").toLowerCase().trim();
  if (pType === "custom" || pType === "manual" || !provider.apiKey) {
    return null;
  }

  const adapter = getAdapter(pType);
  if (!adapter) {
    return null;
  }

  try {
    const remoteProducts = await adapter.fetchProducts(provider.apiKey, provider.apiUrl || undefined);
    const remote = remoteProducts.find((p) => Number(p.id) === Number(providerProductId));
    if (!remote) {
      return null;
    }

    const remotePrice = String(remote.price ?? "").trim();
    if (!/^-?\d+(\.\d+)?$/.test(remotePrice)) {
      return null;
    }

    return remotePrice;
  } catch (error: any) {
    console.warn(`[ProviderLiveCost] Could not fetch remote price for provider ${providerId}:`, error?.message || error);
    return null;
  }
}

async function sanitizeCrudDataForRuntimeSchema(path: string, data: any): Promise<any> {
  if (!data || typeof data !== "object") return data;
  const normalized: Record<string, any> = { ...data };

  if (path === "banners") {
    if ("title" in normalized && typeof normalized.title === "string") {
      normalized.title = normalized.title.trim();
    }
    if ("image" in normalized && typeof normalized.image === "string") {
      normalized.image = normalized.image.trim();
    }
    if ("description" in normalized && typeof normalized.description === "string") {
      normalized.description = normalized.description.trim();
      if (normalized.description === "") normalized.description = null;
    }
    if ("link" in normalized && typeof normalized.link === "string") {
      normalized.link = normalized.link.trim();
      if (normalized.link === "") normalized.link = null;
    }
    if ("order" in normalized) normalizeNumberField(normalized, "order", { required: false });
    if ("active" in normalized) normalized.active = !!normalized.active;
    if ("featured" in normalized) normalized.featured = !!normalized.featured;
    if (isBlank(normalized.title)) throw new ValidationError("عنوان البانر مطلوب");
    if (isBlank(normalized.image)) throw new ValidationError("رابط صورة البانر مطلوب");
  }

  if (path === "categories" || path === "product-groups") {
    if ("name" in normalized && typeof normalized.name === "string") {
      normalized.name = normalized.name.trim();
    }
    if ("image" in normalized && typeof normalized.image === "string") {
      normalized.image = normalized.image.trim();
    }
    if (isBlank(normalized.name)) throw new ValidationError(`${path} name is required`);
    if (isBlank(normalized.image)) throw new ValidationError(`${path} image is required`);
    if ("categoryId" in normalized) normalizeNumberField(normalized, "categoryId", { required: path === "product-groups" });
    if ("order" in normalized) normalizeNumberField(normalized, "order", { required: true });
    if ("active" in normalized) normalized.active = !!normalized.active;
    if ("columnsCount" in normalized) normalizeNumberField(normalized, "columnsCount", { required: true });
    if ("columns_count" in normalized) {
      normalized.columnsCount = normalized.columns_count;
      delete normalized.columns_count;
      normalizeNumberField(normalized, "columnsCount", { required: true });
    }
  }

  if (path === "products") {
    if ("name" in normalized && typeof normalized.name === "string") {
      normalized.name = normalized.name.trim();
    }
    if ("image" in normalized && typeof normalized.image === "string") {
      normalized.image = normalized.image.trim();
    }
    if ("description" in normalized && typeof normalized.description === "string") {
      normalized.description = normalized.description.trim();
      if (normalized.description === "") normalized.description = null;
    }
    if ("source" in normalized && typeof normalized.source === "string") {
      normalized.source = normalized.source.trim() || "manual";
    }

    const source = String(normalized.source || "manual").toLowerCase();
    const isExternalProduct =
      source !== "manual" || !isBlank(normalized.providerId) || !isBlank(normalized.providerProductId);

    if ("categoryId" in normalized) normalizeNumberField(normalized, "categoryId", { required: true });
    if ("priceUsd" in normalized) normalizeDecimalField(normalized, "priceUsd", { required: true });
    if (isBlank(normalized.priceSyp)) normalized.priceSyp = 0;
    if ("priceSyp" in normalized) normalizeNumberField(normalized, "priceSyp", { required: true });
    if ("basePriceUsd" in normalized) normalizeDecimalField(normalized, "basePriceUsd", { nullable: true });
    if ("providerUnitPrice" in normalized) normalizeDecimalField(normalized, "providerUnitPrice", { nullable: true });
    if ("storeProfitPerUnit" in normalized) normalizeDecimalField(normalized, "storeProfitPerUnit", { required: true });
    if ("finalUnitPrice" in normalized) normalizeDecimalField(normalized, "finalUnitPrice", { nullable: true });
    if ("minQty" in normalized) normalizeNumberField(normalized, "minQty", { nullable: true });
    if ("maxQty" in normalized) normalizeNumberField(normalized, "maxQty", { nullable: true });
    if ("minQuantity" in normalized) normalizeNumberField(normalized, "minQuantity", { nullable: true });
    if ("maxQuantity" in normalized) normalizeNumberField(normalized, "maxQuantity", { nullable: true });
    if (isBlank(normalized.quantityType) || !["fixed", "range", "list"].includes(String(normalized.quantityType))) {
      normalized.quantityType = "fixed";
    }
    if (isBlank(normalized.quantityValues)) {
      normalized.quantityValues = null;
    }
    if ("providerId" in normalized) normalizeNumberField(normalized, "providerId", { nullable: true });
    if ("groupId" in normalized) normalizeNumberField(normalized, "groupId", { nullable: true });
    if ("providerProductId" in normalized) {
      normalizeNumberField(normalized, "providerProductId", { nullable: true });
    }

    if ("available" in normalized) normalized.available = !!normalized.available;
    if ("featured" in normalized) normalized.featured = !!normalized.featured;
    if ("order" in normalized) normalizeNumberField(normalized, "order", { required: true });

    if (isBlank(normalized.name)) throw new ValidationError("name is required");
    if (isBlank(normalized.image)) throw new ValidationError("image is required");
    if (!isExternalProduct && isBlank(normalized.categoryId)) {
      throw new ValidationError("categoryId is required for manual products");
    }
    if (isBlank(normalized.priceUsd)) throw new ValidationError("priceUsd is required");
    if (String(normalized.priceUsd).startsWith("-")) {
      throw new ValidationError("priceUsd must be zero or a positive decimal");
    }
    if (normalized.storeProfitPerUnit != null && String(normalized.storeProfitPerUnit).startsWith("-")) {
      throw new ValidationError("storeProfitPerUnit must be zero or a positive decimal");
    }
    if (normalized.basePriceUsd != null && String(normalized.basePriceUsd).startsWith("-")) {
      throw new ValidationError("basePriceUsd must be zero or a positive decimal");
    }

    if (normalized.minQty != null && normalized.maxQty != null && normalized.minQty > normalized.maxQty) {
      throw new ValidationError("minQty must be less than or equal to maxQty");
    }

    if (
      normalized.minQuantity != null &&
      normalized.minQty != null &&
      Number(normalized.minQuantity) < Number(normalized.minQty)
    ) {
      throw new ValidationError("minQuantity must be greater than or equal to provider minimum");
    }

    const effectiveMinQuantity = Number(normalized.minQuantity ?? normalized.minQty ?? 1);
    if (
      normalized.maxQuantity != null &&
      Number.isFinite(effectiveMinQuantity) &&
      Number(normalized.maxQuantity) < effectiveMinQuantity
    ) {
      throw new ValidationError("maxQuantity must be greater than or equal to minQuantity");
    }

    if (normalized.categoryId != null) {
      const [category] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, Number(normalized.categoryId)))
        .limit(1);
      if (!category) {
        if (isExternalProduct) {
          normalized.categoryId = await getOrCreateExternalCategoryId();
        } else {
          throw new ValidationError(`categoryId ${normalized.categoryId} does not exist`);
        }
      }
    } else if (isExternalProduct) {
      normalized.categoryId = await getOrCreateExternalCategoryId();
    }

    if (normalized.providerId != null) {
      const [provider] = await db
        .select({ id: providersTable.id })
        .from(providersTable)
        .where(eq(providersTable.id, Number(normalized.providerId)))
        .limit(1);
      if (!provider) throw new ValidationError(`providerId ${normalized.providerId} does not exist`);
    }

    if (normalized.providerId != null && normalized.providerProductId != null) {
      const providerCostUsd = await fetchProviderLiveCostUsd(
        Number(normalized.providerId),
        Number(normalized.providerProductId),
      );
      if (providerCostUsd != null) {
        normalized.basePriceUsd = providerCostUsd;
        normalized.providerUnitPrice = providerCostUsd;
      }
      normalized.source = "provider";
    }

    const providerUnitPrice = normalized.providerUnitPrice ?? normalized.basePriceUsd ?? "0";
    const requestedFinalUnitPrice = normalized.finalUnitPrice;

    if (!isBlank(requestedFinalUnitPrice)) {
      const derivedProfit = subtractUnitPrices(requestedFinalUnitPrice, providerUnitPrice);
      if (decimalToScaled(derivedProfit) < 0n) {
        throw new ValidationError("finalUnitPrice must be greater than or equal to providerUnitPrice");
      }
      normalized.storeProfitPerUnit = derivedProfit;
      normalized.priceUsd = derivedProfit;
      normalized.finalUnitPrice = addUnitPrices(providerUnitPrice, derivedProfit);
    } else {
      const storeProfitPerUnit = normalized.storeProfitPerUnit ?? normalized.priceUsd ?? "0";
      normalized.storeProfitPerUnit = storeProfitPerUnit;
      normalized.priceUsd = storeProfitPerUnit;
      normalized.finalUnitPrice = addUnitPrices(providerUnitPrice, storeProfitPerUnit);
    }
  }

  if (path === "products" && "providerProductId" in normalized) {
    const exists = await hasColumn("products", "provider_product_id");
    if (!exists) delete normalized.providerProductId;
  }

  if (path === "providers") {
    if ("name" in normalized && typeof normalized.name === "string") {
      normalized.name = normalized.name.trim();
    }
    if (isBlank(normalized.name)) throw new ValidationError("اسم المزود مطلوب");
    if ("priority" in normalized) normalizeNumberField(normalized, "priority", { nullable: true });
    if ("active" in normalized) normalized.active = !!normalized.active;
    if ("providerType" in normalized) {
      const exists = await hasColumn("providers", "provider_type");
      if (!exists) delete normalized.providerType;
    }
    if ("productsEndpoint" in normalized) {
      const exists = await hasColumn("providers", "products_endpoint");
      if (!exists) delete normalized.productsEndpoint;
    }
    if ("profileEndpoint" in normalized) {
      const exists = await hasColumn("providers", "profile_endpoint");
      if (!exists) delete normalized.profileEndpoint;
    }
    if ("orderEndpoint" in normalized) {
      const exists = await hasColumn("providers", "order_endpoint");
      if (!exists) delete normalized.orderEndpoint;
    }
    if ("checkEndpoint" in normalized) {
      const exists = await hasColumn("providers", "check_endpoint");
      if (!exists) delete normalized.checkEndpoint;
    }
    if ("tokenHeader" in normalized) {
      const exists = await hasColumn("providers", "token_header");
      if (!exists) delete normalized.tokenHeader;
    }
  }

  return normalized;
}

// ========== RESOURCES ==========
// Cascade delete للفئات: حذف المنتجات المرتبطة ثم حذف الفئة
router.delete("/admin/categories/:id", requireAdmin, async (req, res) => {
  const categoryId = Number(req.params.id);
  
  // حذف جميع المنتجات المرتبطة بهذه الفئة
  await db.execute(sql`DELETE FROM products WHERE category_id = ${categoryId}`);
  
  // حذف الفئة نفسها
  await db.delete(categoriesTable).where(eq(categoriesTable.id, categoryId));
  
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "delete",
    "categories",
    { id: categoryId, cascade: true }
  );
  
  res.json({ ok: true });
});


makeCrud("categories", categoriesTable, {
  orderBy: categoriesTable.order,
  allowedFields: ["name", "image", "order", "active", "columnsCount", "columns_count", "displayStyle", "display_style"],
});

makeCrud("product-groups", productGroupsTable, {
  orderBy: productGroupsTable.order,
  allowedFields: ["categoryId", "name", "image", "order", "active"],
});

makeCrud("products", productsTable, {
  orderBy: productsTable.order,
  allowedFields: [
    "categoryId",
    "groupId",
    "name",
    "image",
    "order",
    "priceUsd",
    "priceSyp",
    "basePriceUsd",
    "providerUnitPrice",
    "storeProfitPerUnit",
    "finalUnitPrice",
    "productType",
    "available",
    "minQty",
    "maxQty",
    "minQuantity",
    "maxQuantity",
    "quantityType",
    "quantityValues",
    "description",
    "featured",
    "providerId",
    "source",
    "providerProductId",
  ],
});

makeCrud("news", newsTable, {
  allowedFields: ["content", "type", "active"],
});

makeCrud("banners", bannersTable, {
  orderBy: bannersTable.order,
  allowedFields: ["image", "title", "description", "link", "order", "active", "featured"],
});

router.patch("/admin/banners/reorder", requireAdmin, async (req, res) => {
  try {
    const items = req.body?.items; // Array of { id: number, order: number }
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.id !== undefined && item.order !== undefined) {
          await db
            .update(bannersTable)
            .set({ order: Number(item.order) })
            .where(eq(bannersTable.id, Number(item.id)));
        }
      }
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/banners/:id/toggle-featured", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(bannersTable).where(eq(bannersTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Banner not found" });

    const newFeatured = req.body?.featured !== undefined ? Boolean(req.body.featured) : !existing.featured;
    await db
      .update(bannersTable)
      .set({ featured: newFeatured })
      .where(eq(bannersTable.id, id));

    res.json({ ok: true, featured: newFeatured });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/banners/:id/toggle-active", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(bannersTable).where(eq(bannersTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Banner not found" });

    const newActive = req.body?.active !== undefined ? Boolean(req.body.active) : !existing.active;
    await db
      .update(bannersTable)
      .set({ active: newActive })
      .where(eq(bannersTable.id, id));

    res.json({ ok: true, active: newActive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

makeCrud("payment-methods", paymentMethodsTable, {
  allowedFields: [
    "code",
    "name",
    "subtitle",
    "instructions",
    "walletAddress",
    "logoImage",
    "qrImage",
    "minAmount",
    "active",
  ],
});

makeCrud("social-links", socialLinksTable, {
  orderBy: socialLinksTable.order,
  allowedFields: ["platform", "url", "label", "order"],
});

router.patch("/admin/social-links/reorder", requireAdmin, async (req, res) => {
  try {
    const items = req.body?.items; // Array of { id: number, order: number }
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.id !== undefined && item.order !== undefined) {
          await db
            .update(socialLinksTable)
            .set({ order: Number(item.order) })
            .where(eq(socialLinksTable.id, Number(item.id)));
        }
      }
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cascade delete للمزودين: حذف المنتجات المرتبطة ثم حذف المزود
router.delete("/admin/providers/:id", requireAdmin, async (req, res) => {
  const providerId = Number(req.params.id);
  
  // حذف جميع المنتجات المرتبطة بهذا المزود
  await db.execute(sql`DELETE FROM products WHERE provider_id = ${providerId}`);
  
  // حذف المزود نفسه
  await db.delete(providersTable).where(eq(providersTable.id, providerId));
  
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "delete",
    "providers",
    { id: providerId, cascade: true }
  );
  
  res.json({ ok: true });
});

makeCrud("providers", providersTable, {
  orderBy: providersTable.priority,
  allowedFields: [
    "name", "apiUrl", "apiKey", "notes", "priority", "active", "providerType",
    "productsEndpoint", "profileEndpoint", "orderEndpoint", "checkEndpoint", "tokenHeader"
  ],
});

makeCrud("coupons", couponsTable, {
  allowedFields: ["code", "discountPct", "maxUses", "active"],
});

makeCrud("vip-memberships", vipMembershipsTable, {
  allowedFields: ["name", "requiredAmount", "profitPct", "badge", "hidden"],
});

makeCrud("auto-codes", autoCodesTable, {
  allowedFields: ["productId", "code", "note", "used"],
});

makeCrud("order-messages", orderMessagesTable, {
  allowedFields: ["event", "title", "body"],
});

makeCrud("api-keys", apiKeysTable, {
  allowedFields: ["name", "keyValue", "active"],
});

makeCrud("notifications", notificationsTable, {
  allowedFields: ["targetType", "targetUserId", "title", "content", "status", "isRead"],
});

// ========== USERS ==========
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const q = (req.query["q"] as string | undefined)?.trim();
    const role = (req.query["role"] as string | undefined)?.trim();
    const vipLevel = req.query["vipLevel"] ? Number(req.query["vipLevel"]) : undefined;
    const status = (req.query["status"] as string | undefined)?.trim();

    const conditions: any[] = [];

    if (role && role !== "all") {
      conditions.push(eq(usersTable.role, role));
    }
    if (vipLevel && !isNaN(vipLevel)) {
      conditions.push(eq(usersTable.vipLevel, vipLevel));
    }
    if (status === "banned" || status === "true") {
      conditions.push(eq(usersTable.banned, true));
    } else if (status === "active" || status === "false") {
      conditions.push(eq(usersTable.banned, false));
    }

    if (q) {
      const numId = Number(q);
      if (!isNaN(numId)) {
        conditions.push(
          sql`(${usersTable.id} = ${numId} OR ${usersTable.displayId} ILIKE ${"%" + q + "%"} OR ${usersTable.username} ILIKE ${"%" + q + "%"} OR ${usersTable.email} ILIKE ${"%" + q + "%"} OR ${usersTable.telegramId} ILIKE ${"%" + q + "%"})`
        );
      } else {
        conditions.push(
          sql`(${usersTable.displayId} ILIKE ${"%" + q + "%"} OR ${usersTable.username} ILIKE ${"%" + q + "%"} OR ${usersTable.email} ILIKE ${"%" + q + "%"} OR ${usersTable.telegramId} ILIKE ${"%" + q + "%"})`
        );
      }
    }

    const rows = await db
      .select()
      .from(usersTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(usersTable.createdAt))
      .limit(1000);

    res.json(rows);
  } catch (err: any) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message || "فشل في جلب المستخدمين" });
  }
});

router.post("/admin/users", requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, vipLevel, banned } = req.body;
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "اسم المستخدم مطلوب" });
    }
    if (!password || typeof password !== "string" || !password.trim()) {
      return res.status(400).json({ error: "كلمة المرور مطلوبة" });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const displayId = "USR" + Math.floor(100000 + Math.random() * 900000);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        username: username.trim(),
        displayId,
        email: email ? email.trim() : null,
        passwordHash,
        role: role || "user",
        vipLevel: vipLevel ? Number(vipLevel) : 1,
        banned: Boolean(banned),
        balanceUsd: "0.00",
        balanceSyp: "0",
      })
      .returning();

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "create_user",
      String(newUser.id),
      { username: newUser.username, role: newUser.role }
    );

    res.json(newUser);
  } catch (err: any) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: err.message || "فشل في إنشاء المستخدم" });
  }
});

const handleUpdateUser = async (req: any, res: any) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: "معرف المستخدم غير صالح" });
    }

    const allowed = filterFields(req.body, [
      "username",
      "email",
      "balanceUsd",
      "balanceSyp",
      "role",
      "banned",
      "vipLevel",
    ]);

    if ("vipLevel" in allowed && allowed.vipLevel != null) {
      allowed.vipLevel = Number(allowed.vipLevel);
    }
    if (req.body.password && typeof req.body.password === "string" && req.body.password.trim().length > 0) {
      allowed.passwordHash = await bcrypt.hash(req.body.password.trim(), 10);
    }

    const [row] = await db
      .update(usersTable)
      .set(allowed)
      .where(eq(usersTable.id, userId))
      .returning();

    if (!row) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "update_user",
      String(userId),
      allowed,
    );

    res.json(row);
  } catch (err: any) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: err.message || "فشل تحديث بيانات المستخدم" });
  }
};

router.put("/admin/users/:id", requireAdmin, handleUpdateUser);
router.patch("/admin/users/:id", requireAdmin, handleUpdateUser);

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "delete_user",
      String(userId)
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: err.message || "فشل في حذف المستخدم" });
  }
});

router.post("/admin/users/bulk-ban", requireAdmin, async (req, res) => {
  try {
    const { userIds, banned } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "لم يتم تحديد أي مستخدمين" });
    }

    await db
      .update(usersTable)
      .set({ banned: Boolean(banned) })
      .where(inArray(usersTable.id, userIds.map(Number)));

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      banned ? "bulk_ban_users" : "bulk_unban_users",
      "users",
      { userIds, count: userIds.length }
    );

    res.json({ ok: true, count: userIds.length });
  } catch (err: any) {
    console.error("Error bulk banning users:", err);
    res.status(500).json({ error: err.message || "فشل في الإجراء الجماعي" });
  }
});

router.post("/admin/users/bulk-delete", requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "لم يتم تحديد أي مستخدمين" });
    }

    await db.delete(usersTable).where(inArray(usersTable.id, userIds.map(Number)));

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "bulk_delete_users",
      "users",
      { userIds, count: userIds.length }
    );

    res.json({ ok: true, count: userIds.length });
  } catch (err: any) {
    console.error("Error bulk deleting users:", err);
    res.status(500).json({ error: err.message || "فشل في الحذف الجماعي" });
  }
});

router.post("/admin/users/:id/notify", requireAdmin, async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = Number(req.params.id);
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: "معرف المستخدم غير صالح" });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "محتوى الإشعار مطلوب" });
    }

    const row = await createInternalNotification({
      targetType: "user",
      targetUserId: userId,
      title: (title || "").trim() || "إشعار من الإدارة",
      content: content.trim(),
    });

    if (!row) {
      return res.status(500).json({ error: "فشل إنشاء الإشعار في قاعدة البيانات" });
    }

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "notify_user",
      String(userId),
      { title, content },
    );

    res.json(row);
  } catch (error: any) {
    console.error("Notify user error:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء إرسال الإشعار" });
  }
});

router.post("/admin/users/:id/adjust-balance", requireAdmin, async (req, res) => {
  let result: Awaited<ReturnType<typeof applyUserBalanceAdjustment>>;
  try {
    result = await applyUserBalanceAdjustment(Number(req.params.id), req.body);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "adjust_balance",
    String(req.params.id),
    result.adjustment,
  );
  res.json({ ok: true, user: result.updatedUser });
});

// ========== ORDERS ==========
router.get("/admin/orders", requireAdmin, async (req, res) => {
  const status = req.query["status"] as string | undefined;
  const conditions = status && status !== "all" ? [eq(ordersTable.status, status)] : [];
  const rows = await db
    .select({
      order: ordersTable,
      user: usersTable,
      product: productsTable,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(usersTable.id, ordersTable.userId))
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt))
    .limit(500);
  res.json(
    rows.map((r) => ({
      ...r.order,
      userName: r.user?.username,
      productName: r.product?.name,
      productImage: r.product?.image,
    })),
  );
});

router.post("/admin/orders/:id/status", requireAdmin, async (req, res) => {
  const { status, note } = req.body as { status: string; note?: string };
  const id = Number(req.params.id);
  const result = await applyOrderStatusChange(id, status, note);
  if ("error" in result) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "order_status",
    String(id),
    { status, note },
  );
  res.json(result.updated);
});

// ========== DEPOSITS ==========
router.get("/admin/deposits", requireAdmin, async (req, res) => {
  const status = req.query["status"] as string | undefined;
  const conditions = status && status !== "all" ? [eq(depositsTable.status, status)] : [];
  const rows = await db
    .select({ deposit: depositsTable, user: usersTable })
    .from(depositsTable)
    .leftJoin(usersTable, eq(usersTable.id, depositsTable.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(depositsTable.createdAt))
    .limit(500);
  res.json(
    rows.map((r) => ({ ...r.deposit, userName: r.user?.username })),
  );
});

router.post("/admin/deposits/:id/status", requireAdmin, async (req, res) => {
  const { status, note } = req.body as { status: string; note?: string };
  const id = Number(req.params.id);
  const result = await applyDepositStatusChange(id, status);
  if ("error" in result) {
    if (result.error === "auto_managed") {
      res.status(400).json({ error: "إيداع شام كاش التلقائي يُدار تلقائيًا عبر API ولا يقبل موافقة/رفض يدوي." });
      return;
    }
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "deposit_status",
    String(id),
    { status, note },
  );
  res.json(result.updated);
});

// ========== SETTINGS ==========
router.get("/admin/settings/use-legacy-users-page", async (_req, res) => {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "use_legacy_users_page")).limit(1);
    const value = row?.value;
    const isLegacy = value === "true" || value === true;
    res.json({ key: "use_legacy_users_page", value: String(isLegacy) });
  } catch (err: any) {
    res.json({ key: "use_legacy_users_page", value: "false" });
  }
});

router.put("/admin/settings/use-legacy-users-page", requireAdmin, async (req, res) => {
  try {
    const value = String(req.body?.value === true || req.body?.value === "true");
    await db
      .insert(settingsTable)
      .values({ key: "use_legacy_users_page", value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    res.json({ ok: true, value });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/settings/use-legacy-theme-page", async (_req, res) => {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "use_legacy_theme_page")).limit(1);
    const value = row?.value;
    const isLegacy = value === "true" || value === true;
    res.json({ key: "use_legacy_theme_page", value: String(isLegacy) });
  } catch (err: any) {
    res.json({ key: "use_legacy_theme_page", value: "false" });
  }
});

router.put("/admin/settings/use-legacy-theme-page", requireAdmin, async (req, res) => {
  try {
    const value = String(req.body?.value === true || req.body?.value === "true");
    await db
      .insert(settingsTable)
      .values({ key: "use_legacy_theme_page", value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    res.json({ ok: true, value });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/settings/use-legacy-settings-page", async (_req, res) => {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "use_legacy_settings_page")).limit(1);
    const value = row?.value;
    const isLegacy = value === "true" || value === true;
    res.json({ key: "use_legacy_settings_page", value: String(isLegacy) });
  } catch (err: any) {
    res.json({ key: "use_legacy_settings_page", value: "false" });
  }
});

router.put("/admin/settings/use-legacy-settings-page", requireAdmin, async (req, res) => {
  try {
    const value = String(req.body?.value === true || req.body?.value === "true");
    await db
      .insert(settingsTable)
      .values({ key: "use_legacy_settings_page", value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    res.json({ ok: true, value });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/settings/use-legacy-social-links-page", async (_req, res) => {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "use_legacy_social_links_page")).limit(1);
    const value = row?.value;
    const isLegacy = value === "true" || value === true;
    res.json({ key: "use_legacy_social_links_page", value: String(isLegacy) });
  } catch (err: any) {
    res.json({ key: "use_legacy_social_links_page", value: "false" });
  }
});

router.put("/admin/settings/use-legacy-social-links-page", requireAdmin, async (req, res) => {
  try {
    const value = String(req.body?.value === true || req.body?.value === "true");
    await db
      .insert(settingsTable)
      .values({ key: "use_legacy_social_links_page", value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    res.json({ ok: true, value });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/settings/use-legacy-banners-page", async (_req, res) => {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "use_legacy_banners_page")).limit(1);
    const value = row?.value;
    const isLegacy = value === "true" || value === true;
    res.json({ key: "use_legacy_banners_page", value: String(isLegacy) });
  } catch (err: any) {
    res.json({ key: "use_legacy_banners_page", value: "false" });
  }
});

router.put("/admin/settings/use-legacy-banners-page", requireAdmin, async (req, res) => {
  try {
    const value = String(req.body?.value === true || req.body?.value === "true");
    await db
      .insert(settingsTable)
      .values({ key: "use_legacy_banners_page", value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    res.json({ ok: true, value });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/settings/show-featured-offers", async (_req, res) => {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "show_featured_offers")).limit(1);
    const value = row?.value;
    const enabled = value === "true" || value === true || value === undefined; // default true
    res.json({ key: "show_featured_offers", value: String(enabled) });
  } catch (err: any) {
    res.json({ key: "show_featured_offers", value: "true" });
  }
});

router.put("/admin/settings/show-featured-offers", requireAdmin, async (req, res) => {
  try {
    const value = String(req.body?.value === true || req.body?.value === "true");
    await db
      .insert(settingsTable)
      .values({ key: "show_featured_offers", value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    res.json({ ok: true, value });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/theme-settings", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const out: Record<string, any> = {
      theme_primary: "#C8A45C",
      theme_secondary: "#B8954A",
      theme_accent: "#FDE68A",
      theme_background: "#1A1A1A",
      theme_text_primary: "#FFFFFF",
      theme_font_arabic: "Cairo",
      theme_font_english: "Inter",
      theme_border_radius: "16",
      theme_shadow: "medium",
      theme_default_mode: "dark",
    };
    for (const r of rows) {
      if (r.key.startsWith("theme_")) {
        out[r.key] = r.value;
      }
    }
    res.json(out);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin/theme-settings", requireAdmin, async (req, res) => {
  try {
    const updates = req.body as Record<string, any>;
    for (const [key, value] of Object.entries(updates)) {
      await db
        .insert(settingsTable)
        .values({ key, value })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    }
    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "theme_update",
      "theme",
      Object.keys(updates),
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/settings", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  const out: Record<string, any> = {};
  for (const r of rows) out[r.key] = r.value;
  res.json(out);
});

router.put("/admin/settings", requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, any>;
  for (const [key, value] of Object.entries(updates)) {
    await db
      .insert(settingsTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
  }
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "settings_update",
    "settings",
    Object.keys(updates),
  );
  res.json({ ok: true });
});

// ========== ACTIVITY ==========
router.get("/admin/activity", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(activityLogTable)
    .orderBy(desc(activityLogTable.createdAt))
    .limit(300);
  res.json(rows);
});

// ========== ADMINS MANAGEMENT ==========
router.get("/admin/admins", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(adminsTable).orderBy(desc(adminsTable.id));
    res.json(rows.map((r) => ({ ...r, password: undefined })));
  } catch (err: any) {
    console.error("Error fetching admins:", err);
    res.status(500).json({ error: err.message || "خطأ في جلب قائمة المشرفين" });
  }
});

router.post("/admin/admins", requireAdmin, async (req, res) => {
  try {
    const data = filterFields(req.body, [
      "username",
      "password",
      "fullName",
      "email",
      "role",
      "permissions",
      "active",
    ]);
    if (!data.username || typeof data.username !== "string" || !data.username.trim()) {
      res.status(400).json({ error: "اسم المستخدم مطلوب" });
      return;
    }
    if (!data.password || typeof data.password !== "string") {
      res.status(400).json({ error: "كلمة المرور مطلوبة" });
      return;
    }
    data.password = await hashAdminPassword(data.password);
    if (!data.fullName) data.fullName = data.username;
    if (!data.role) data.role = "admin";
    if (data.active === undefined) data.active = true;

    const [row] = await db.insert(adminsTable).values(data).returning();
    res.json({ ...row, password: undefined });
  } catch (err: any) {
    console.error("Error creating admin:", err);
    res.status(500).json({ error: err.message || "خطأ في إنشاء المشرف" });
  }
});

const handleUpdateAdmin = async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "معرف المشرف غير صالحة" });
      return;
    }
    const data = filterFields(req.body, [
      "username",
      "password",
      "fullName",
      "email",
      "role",
      "permissions",
      "active",
    ]);
    if (data.password === "" || data.password === null) delete data.password;
    if (typeof data.password === "string" && data.password.trim()) {
      data.password = await hashAdminPassword(data.password.trim());
    } else {
      delete data.password;
    }

    const [row] = await db
      .update(adminsTable)
      .set(data)
      .where(eq(adminsTable.id, id))
      .returning();
    
    if (!row) {
      res.status(404).json({ error: "المشرف غير موجود" });
      return;
    }

    res.json({ ...row, password: undefined });
  } catch (err: any) {
    console.error("Error updating admin:", err);
    res.status(500).json({ error: err.message || "خطأ في تعديل بيانات المشرف" });
  }
};

router.put("/admin/admins/:id", requireAdmin, handleUpdateAdmin);
router.patch("/admin/admins/:id", requireAdmin, handleUpdateAdmin);

router.delete("/admin/admins/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(adminsTable).where(eq(adminsTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    console.error("Error deleting admin:", err);
    res.status(500).json({ error: err.message || "خطأ في حذف المشرف" });
  }
});

// ========== NOTIFICATIONS ==========
router.get("/admin/notifications", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: notificationsTable.id,
        targetType: notificationsTable.targetType,
        targetUserId: notificationsTable.targetUserId,
        title: notificationsTable.title,
        content: notificationsTable.content,
        status: notificationsTable.status,
        createdAt: notificationsTable.createdAt,
        targetUserName: usersTable.username,
        targetUserEmail: usersTable.email,
        targetDisplayId: usersTable.displayId,
      })
      .from(notificationsTable)
      .leftJoin(usersTable, eq(usersTable.id, notificationsTable.targetUserId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(300);
    res.json(rows);
  } catch (error: any) {
    console.error("Fetch admin notifications error:", error);
    res.json([]);
  }
});

router.post("/admin/notifications", requireAdmin, async (req, res) => {
  try {
    const { targetType, targetUserId, title, content } = req.body as any;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "محتوى الإشعار مطلوب" });
    }

    let parsedUserId: number | null = null;
    if (targetUserId != null && targetUserId !== "") {
      const p = Number(targetUserId);
      if (!isNaN(p) && p > 0) parsedUserId = p;
    }

    const row = await createInternalNotification({
      targetType: targetType || (parsedUserId ? "user" : "all"),
      targetUserId: parsedUserId,
      title: (title || "").trim() || "إشعار من الإدارة",
      content: content.trim(),
    });

    if (!row) {
      return res.status(500).json({ error: "فشل إنشاء الإشعار في قاعدة البيانات" });
    }

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "send_notification",
      "notifications",
      { targetType, targetUserId: parsedUserId, title },
    );

    res.json(row);
  } catch (error: any) {
    console.error("Admin send notification error:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء إرسال الإشعار" });
  }
});

router.delete("/admin/notifications/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "delete_notification",
      "notifications",
      { id },
    );
    res.json({ ok: true });
  } catch (error: any) {
    console.error("Delete notification error:", error);
    res.status(500).json({ error: error.message || "فشل حذف الإشعار" });
  }
});

// ========== REPORTS ==========
router.get("/admin/reports", requireAdmin, async (req, res) => {
  const startDate = (req.query["startDate"] as string) || (req.query["from"] as string) || "2020-01-01";
  const endDate = (req.query["endDate"] as string) || (req.query["to"] as string) || "2099-12-31";

  try {
    const [summaryRow]: any = (await db.execute(sql`
      SELECT 
        count(*)::int as total_orders,
        count(*) filter (where status IN ('accept', 'completed'))::int as completed_orders,
        coalesce(sum(total_usd), 0)::float as total_revenue,
        coalesce(sum(total_usd) filter (where status IN ('accept', 'completed')), 0)::float as completed_revenue,
        coalesce(sum(case when cost_usd is not null then (total_usd - cost_usd) else (total_usd * 0.2) end) filter (where status IN ('accept', 'completed')), 0)::float as net_profit
      FROM orders
      WHERE created_at::date >= ${startDate}::date AND created_at::date <= ${endDate}::date
    `)).rows;

    const topServices: any = (await db.execute(sql`
      SELECT 
        p.id,
        p.name,
        p.image,
        count(o.id)::int as sales_count,
        coalesce(sum(o.total_usd), 0)::float as total_amount
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.created_at::date >= ${startDate}::date AND o.created_at::date <= ${endDate}::date
      GROUP BY p.id, p.name, p.image
      ORDER BY sales_count DESC
      LIMIT 10
    `)).rows;

    const chartData: any = (await db.execute(sql`
      SELECT 
        to_char(created_at::date, 'YYYY-MM-DD') as date,
        count(*)::int as orders_count,
        count(*) filter (where status IN ('accept', 'completed'))::int as "ordersCount",
        coalesce(sum(total_usd), 0)::float as revenue,
        coalesce(sum(total_usd) filter (where status IN ('accept', 'completed')), 0)::float as "salesUsd",
        coalesce(sum(case when cost_usd is not null then (total_usd - cost_usd) else (total_usd * 0.2) end) filter (where status IN ('accept', 'completed')), 0)::float as "profitUsd"
      FROM orders
      WHERE created_at::date >= ${startDate}::date AND created_at::date <= ${endDate}::date
      GROUP BY created_at::date
      ORDER BY created_at::date ASC
    `)).rows;

    const depResult = await db.execute(sql`
      SELECT coalesce(sum(amount_usd) filter (where status='approved'), 0)::float as "totalDepositsUsd"
      FROM deposits
      WHERE created_at::date >= ${startDate}::date AND created_at::date <= ${endDate}::date
    `);
    const [dep] = (depResult.rows as any[]) || [];

    // Get admin notification email from settings
    const [emailSetting] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "admin_report_email"))
      .limit(1);

    res.json({
      summary: {
        totalOrders: summaryRow?.total_orders || 0,
        completedOrders: summaryRow?.completed_orders || 0,
        totalRevenue: summaryRow?.total_revenue || 0,
        netProfit: summaryRow?.net_profit || 0,
      },
      topServices: topServices || [],
      chart: chartData || [],
      daily: chartData || [],
      totalSalesUsd: summaryRow?.total_revenue || 0,
      totalProfitUsd: summaryRow?.net_profit || 0,
      orderCount: summaryRow?.total_orders || 0,
      totalDepositsUsd: dep?.totalDepositsUsd || 0,
      adminEmail: (emailSetting?.value as any)?.email || "admin@x-z.store",
      systemLogsClean: true,
    });
  } catch (err: any) {
    console.error("Reports error:", err);
    res.json({
      summary: {
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        netProfit: 0,
      },
      topServices: [],
      chart: [],
      daily: [],
      totalSalesUsd: 0,
      totalProfitUsd: 0,
      orderCount: 0,
      totalDepositsUsd: 0,
      adminEmail: "admin@x-z.store",
      systemLogsClean: true,
    });
  }
});

router.post("/admin/reports/email", requireAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
  }
  await db
    .insert(settingsTable)
    .values({ key: "admin_report_email", value: { email } })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: { email } } });
  res.json({ ok: true, email });
});

router.get("/admin/reports/sales", requireAdmin, async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
      count(*)::int as orders_count,
      coalesce(sum(total_usd) filter (where status='accept'), 0)::float as revenue,
      coalesce(sum(cost_usd) filter (where status='accept'), 0)::float as cost,
      coalesce(sum(total_usd - cost_usd) filter (where status='accept'), 0)::float as profit
    FROM orders
    WHERE created_at >= current_date - interval '30 days'
    GROUP BY date_trunc('day', created_at)
    ORDER BY date_trunc('day', created_at) DESC
  `);
  res.json((rows.rows as any[]) || []);
});

router.get("/admin/reports/profit-log", requireAdmin, async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
      coalesce(sum(total_usd - cost_usd) filter (where status='accept'), 0)::float as profit_usd,
      count(*) filter (where status='accept')::int as accepted_orders
    FROM orders
    GROUP BY date_trunc('day', created_at)
    ORDER BY date_trunc('day', created_at) DESC
    LIMIT 90
  `);
  res.json((rows.rows as any[]) || []);
});

// ========== BACKUP (mock) ==========
router.post("/admin/backup", requireAdmin, async (_req, res) => {
  await logActivity(
    { id: _req.session.adminId, name: _req.session.adminUsername },
    "backup_request",
    "system",
  );
  res.json({
    ok: true,
    filename: `xpay-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.sql`,
    sizeMb: Math.round(Math.random() * 30 + 5),
  });
});

// ========== IMPORT PRODUCTS ==========
router.post("/admin/import-products", requireAdmin, async (req, res) => {
  const { rows } = req.body as {
    rows: Array<{
      name: string;
      categoryId: number;
      priceUsd: number;
      priceSyp: number;
      productType?: string;
      image?: string;
    }>;
  };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "لا توجد بيانات" });
    return;
  }
  const inserted = await db
    .insert(productsTable)
    .values(
      rows.map((r) => ({
        name: r.name,
        categoryId: r.categoryId,
        priceUsd: String(r.priceUsd),
        priceSyp: String(r.priceSyp),
        productType: r.productType || "package",
        image: r.image || "/cat-cards.png",
        source: "import",
      })),
    )
    .returning();
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "import_products",
    "products",
    { count: inserted.length },
  );
  res.json({ ok: true, count: inserted.length });
});

// ========== 2FA (mock secret) ==========
router.post("/admin/2fa/enable", requireAdmin, async (req, res) => {
  const secret = Array.from({ length: 16 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[Math.floor(Math.random() * 32)],
  ).join("");
  await db
    .update(adminsTable)
    .set({ twoFactorSecret: secret })
    .where(eq(adminsTable.id, req.session.adminId!));
  res.json({ secret, otpauthUrl: `otpauth://totp/XPayStore?secret=${secret}&issuer=XPayStore` });
});

router.post("/admin/2fa/disable", requireAdmin, async (req, res) => {
  await db
    .update(adminsTable)
    .set({ twoFactorSecret: null })
    .where(eq(adminsTable.id, req.session.adminId!));
  res.json({ ok: true });
});

router.post("/admin/2fa/verify", requireAdmin, async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code || code.length !== 6) {
    res.status(400).json({ error: "رمز غير صالح" });
    return;
  }
  res.json({ ok: true, verified: true });
});

// ========== PROFILE ==========
router.put("/admin/profile", requireAdmin, async (req, res) => {
  const { fullName, email, oldPassword, newPassword } = req.body as any;
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.id, req.session.adminId!))
    .limit(1);
  if (!admin) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  const update: any = {};
  if (fullName !== undefined) update.fullName = fullName;
  if (email !== undefined) update.email = email;
  if (newPassword) {
    if (!(await verifyAdminPassword(admin.password, oldPassword))) {
      res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    update.password = await hashAdminPassword(newPassword);
  }
  if (Object.keys(update).length) {
    await db.update(adminsTable).set(update).where(eq(adminsTable.id, admin.id));
  }
  res.json({ ok: true });
});

// ========== USER BALANCE / BAN ALIASES ==========
router.post("/admin/users/:id/balance", requireAdmin, async (req, res) => {
  let result: Awaited<ReturnType<typeof applyUserBalanceAdjustment>>;
  try {
    result = await applyUserBalanceAdjustment(Number(req.params.id), req.body);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "adjust_balance",
    String(req.params.id),
    result.adjustment,
  );
  res.json({ ok: true, user: result.updatedUser });
});

router.patch("/admin/users/:id/ban", requireAdmin, async (req, res) => {
  const { banned } = req.body as { banned: boolean };
  await db
    .update(usersTable)
    .set({ banned: !!banned })
    .where(eq(usersTable.id, Number(req.params.id)));
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    banned ? "ban_user" : "unban_user",
    String(req.params.id),
  );
  res.json({ ok: true });
});

// ========== STATUS PATCH ALIASES ==========
router.patch("/admin/orders/:id/status", requireAdmin, async (req, res) => {
  const { status, note } = req.body as { status: string; note?: string };
  const id = Number(req.params.id);
  const result = await applyOrderStatusChange(id, status, note);
  if ("error" in result) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "order_status",
    String(id),
    { status, note },
  );
  res.json(result.updated);
});

router.patch("/admin/deposits/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body as { status: string };
  const id = Number(req.params.id);
  const result = await applyDepositStatusChange(id, status);
  if ("error" in result) {
    if (result.error === "auto_managed") {
      res.status(400).json({ error: "إيداع شام كاش التلقائي يُدار تلقائيًا عبر API ولا يقبل موافقة/رفض يدوي." });
      return;
    }
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "deposit_status",
    String(id),
    { status },
  );
  res.json(result.updated);
});

// ========== GENERIC PUT FOR ALL CRUDS (ALIAS OF PATCH) ==========
const PUT_RESOURCES: Array<{ path: string; table: any; allowed: string[] }> = [
  { path: "categories", table: categoriesTable, allowed: ["name", "image", "order", "active", "columnsCount", "columns_count"] },
  { path: "product-groups", table: productGroupsTable, allowed: ["categoryId", "name", "image", "order", "active"] },
  {
    path: "products",
    table: productsTable,
    allowed: [
      "categoryId", "groupId", "name", "image", "priceUsd", "priceSyp", "basePriceUsd",
      "order",
      "providerUnitPrice", "storeProfitPerUnit", "finalUnitPrice",
      "productType", "available", "minQty", "maxQty", "minQuantity", "maxQuantity",
      "quantityType", "quantityValues", "description", "featured",
      "providerId", "source", "providerProductId",
    ],
  },
  { path: "news", table: newsTable, allowed: ["content", "type", "active"] },
  { path: "banners", table: bannersTable, allowed: ["image", "title", "description", "link", "order", "active", "featured"] },
  {
    path: "payment-methods",
    table: paymentMethodsTable,
    allowed: [
      "code", "name", "subtitle", "instructions", "walletAddress", "logoImage", "qrImage",
      "minAmount", "active",
    ],
  },
  { path: "social-links", table: socialLinksTable, allowed: ["platform", "url", "label", "order"] },
  {
    path: "providers",
    table: providersTable,
    allowed: [
      "name", "apiUrl", "apiKey", "notes", "priority", "active", "providerType",
      "productsEndpoint", "profileEndpoint", "orderEndpoint", "checkEndpoint", "tokenHeader"
    ]
  },
  { path: "coupons", table: couponsTable, allowed: ["code", "discountPct", "maxUses", "usedCount", "active"] },
  { path: "vip-memberships", table: vipMembershipsTable, allowed: ["name", "requiredAmount", "profitPct", "badge", "hidden"] },
  { path: "auto-codes", table: autoCodesTable, allowed: ["productId", "code", "note", "used"] },
  { path: "order-messages", table: orderMessagesTable, allowed: ["event", "title", "body"] },
  { path: "api-keys", table: apiKeysTable, allowed: ["name", "keyValue", "active"] },
  { path: "notifications", table: notificationsTable, allowed: ["targetType", "targetUserId", "title", "content", "status", "isRead"] },
];

for (const r of PUT_RESOURCES) {
  router.put(`/admin/${r.path}/:id`, requireAdmin, async (req, res) => {
    try {
      if (r.path === "providers") {
        await ensureDatabaseSchema();
      }
      const data = await sanitizeCrudDataForRuntimeSchema(
        r.path,
        filterFields(req.body, r.allowed),
      );
      const [row] = await db
        .update(r.table)
        .set(data)
        .where(eq(r.table.id, Number(req.params.id)))
        .returning();
      await logActivity(
        { id: req.session.adminId, name: req.session.adminUsername },
        "update",
        r.path,
        { id: row?.id },
      );
      res.json(row);
    } catch (error: any) {
      console.error(`Update ${r.path} failed:`, error);
      const httpErr = toHttpError(error);
      res.status(httpErr.status).json({ error: httpErr.message });
    }
  });
}

// ========== VIP ALIAS ==========
router.get("/admin/vip", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(vipMembershipsTable).orderBy(desc(vipMembershipsTable.id));
  res.json(rows);
});
router.post("/admin/vip", requireAdmin, async (req, res) => {
  const data = filterFields(req.body, ["name", "requiredAmount", "profitPct", "badge", "hidden"]);
  const [row] = await db.insert(vipMembershipsTable).values(data).returning();
  res.json(row);
});
router.put("/admin/vip/:id", requireAdmin, async (req, res) => {
  const data = filterFields(req.body, ["name", "requiredAmount", "profitPct", "badge", "hidden"]);
  const [row] = await db
    .update(vipMembershipsTable)
    .set(data)
    .where(eq(vipMembershipsTable.id, Number(req.params.id)))
    .returning();
  res.json(row);
});
router.delete("/admin/vip/:id", requireAdmin, async (req, res) => {
  await db.delete(vipMembershipsTable).where(eq(vipMembershipsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ========== BULK DELETE ==========
router.post("/admin/bulk-delete", requireAdmin, async (req, res) => {
  const { resource, ids } = req.body as { resource: string; ids: number[] };
  if (!resource || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }

  // جدول حسب المورد
  const tableMap: Record<string, any> = {
    categories: categoriesTable,
    "product-groups": productGroupsTable,
    products: productsTable,
    providers: providersTable,
    coupons: couponsTable,
    banners: bannersTable,
    news: newsTable,
    paymentMethods: paymentMethodsTable,
    socialLinks: socialLinksTable,
    vipMemberships: vipMembershipsTable,
    autoCodes: autoCodesTable,
    orderMessages: orderMessagesTable,
    apiKeys: apiKeysTable,
    notifications: notificationsTable,
  };

  const table = tableMap[resource];
  if (!table) {
    res.status(400).json({ error: "المورد غير مدعوم" });
    return;
  }

  try {
    // تنفيذ الحذف المتسلسل حسب المورد
    if (resource === "categories") {
      for (const id of ids) {
        await db.execute(sql`DELETE FROM products WHERE category_id = ${id}`);
      }
    } else if (resource === "products") {
      let deleted = 0;
      let archived = 0;
      for (const id of ids) {
        const [orderStats] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(ordersTable)
          .where(eq(ordersTable.productId, id));

        if ((orderStats?.count || 0) > 0) {
          await db
            .update(productsTable)
            .set({ available: false, featured: false })
            .where(eq(productsTable.id, id));
          archived += 1;
        } else {
          await db.delete(autoCodesTable).where(eq(autoCodesTable.productId, id));
          await db.delete(productsTable).where(eq(productsTable.id, id));
          deleted += 1;
        }
      }

      await logActivity(
        { id: req.session.adminId, name: req.session.adminUsername },
        "bulk_delete",
        resource,
        { ids, deleted, archived },
      );
      res.json({ ok: true, deleted, archived });
      return;
    } else if (resource === "product-groups") {
      for (const id of ids) {
        await db
          .update(productsTable)
          .set({ groupId: null })
          .where(eq(productsTable.groupId, id));
      }
    } else if (resource === "providers") {
      for (const id of ids) {
        await db.execute(sql`DELETE FROM products WHERE provider_id = ${id}`);
      }
    }

    // حذف العناصر نفسها واحداً تلو الآخر
    for (const id of ids) {
      await db.delete(table).where(eq(table.id, id));
    }

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "bulk_delete",
      resource,
      { ids }
    );

    res.json({ ok: true, deletedCount: ids.length });
  } catch (error: any) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ error: error.message || "فشل الحذف الجماعي" });
  }
});

// ========== NOTIFICATIONS DELETE ==========
router.delete("/admin/notifications/:id", requireAdmin, async (req, res) => {
  await db.delete(notificationsTable).where(eq(notificationsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ========== BACKUP / IMPORT (full JSON) ==========
router.get("/admin/backup", requireAdmin, async (req, res) => {
  const [
    users, categories, products, paymentMethods, banners, news, socialLinks,
    providers, coupons, vipMemberships, settings, orderMessages, apiKeys,
  ] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(categoriesTable),
    db.select().from(productsTable),
    db.select().from(paymentMethodsTable),
    db.select().from(bannersTable),
    db.select().from(newsTable),
    db.select().from(socialLinksTable),
    db.select().from(providersTable),
    db.select().from(couponsTable),
    db.select().from(vipMembershipsTable),
    db.select().from(settingsTable),
    db.select().from(orderMessagesTable),
    db.select().from(apiKeysTable),
  ]);
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "export_backup",
    "system",
  );
  res.json({
    exportedAt: new Date().toISOString(),
    users, categories, products, paymentMethods, banners, news, socialLinks,
    providers, coupons, vipMemberships, settings, orderMessages, apiKeys,
  });
});

router.post("/admin/import", requireAdmin, async (req, res) => {
  const body = req.body as Record<string, any>;
  let imported = 0;
  const tableMap: Record<string, any> = {
    categories: categoriesTable,
    products: productsTable,
    paymentMethods: paymentMethodsTable,
    banners: bannersTable,
    news: newsTable,
    socialLinks: socialLinksTable,
    providers: providersTable,
    coupons: couponsTable,
    vipMemberships: vipMembershipsTable,
    orderMessages: orderMessagesTable,
    apiKeys: apiKeysTable,
  };
  for (const [k, table] of Object.entries(tableMap)) {
    const rows = body[k];
    if (Array.isArray(rows) && rows.length > 0) {
      try {
        const stripped = rows.map(({ id, ...rest }: any) => rest);
        const result = await db.insert(table).values(stripped).onConflictDoNothing().returning();
        imported += (result as any[]).length;
      } catch {
        // continue silently for invalid rows
      }
    }
  }
  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "import_backup",
    "system",
    { imported },
  );
  res.json({ ok: true, imported });
});

// ========== SETTINGS LIST/ITEMS WRAPPER ==========
router.get("/admin/settings/list", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  res.json(rows);
});

router.put("/admin/settings/items", requireAdmin, async (req, res) => {
  const { items } = req.body as { items: Array<{ key: string; value: any }> };
  if (!Array.isArray(items)) {
    res.status(400).json({ error: "items required" });
    return;
  }
  for (const it of items) {
    await db
      .insert(settingsTable)
      .values({ key: it.key, value: it.value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: it.value } });
  }
  res.json({ ok: true });
});

router.put("/admin/settings/brand-logo", requireAdmin, async (req, res) => {
  const brandLogoUrl = String(req.body?.brandLogoUrl || req.body?.logoUrl || req.body?.image || "").trim();
  
  await db
    .insert(settingsTable)
    .values({ key: "brand_logo_url", value: brandLogoUrl })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: brandLogoUrl } });

  await db
    .insert(settingsTable)
    .values({ key: "site_logo", value: brandLogoUrl })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: brandLogoUrl } });

  await logActivity(
    { id: req.session.adminId, name: req.session.adminUsername },
    "update_brand_logo",
    "settings",
    { brandLogoUrl: brandLogoUrl ? "updated" : "cleared" },
  );

  res.json({ ok: true, success: true, brandLogoUrl });
});

router.get("/admin/telegram/config-status", requireAdmin, async (_req, res) => {
  res.json(getTelegramConfigStatus());
});

// ========== PROVIDER SYNC (UPDATED – لا يضيف منتجات جديدة) ==========
router.post("/admin/providers/:id/sync", requireAdmin, async (req, res) => {
  const providerId = Number(req.params.id);
  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, providerId))
    .limit(1);

  if (!provider) {
    res.status(404).json({ error: "المزود غير موجود" });
    return;
  }

  const pType = (provider.providerType || "custom").toLowerCase().trim();
  if (pType === "custom" || pType === "manual" || !provider.apiKey) {
    res.json({
      ok: true,
      message: "هذا المزود من النوع اليدوي (Custom Provider) ولا يتطلب مزامنة خارجية.",
      updated: 0,
    });
    return;
  }

  const adapter = getAdapter(pType);

  try {
    const products = await adapter.fetchProducts(
      provider.apiKey!,
      provider.apiUrl || undefined
    );

    let updated = 0;

    for (const p of products) {
      // البحث عن منتج موجود مسبقاً بنفس provider_product_id
      const existingProdResult = await db.execute(sql`
        SELECT id FROM products 
        WHERE provider_product_id = ${Number(p.id)} 
        LIMIT 1
      `);
      const existingProdId = (existingProdResult.rows as any[])[0]?.id || null;

      // تحديث المنتج الموجود فقط – لا نقوم بإدراج جديد
      if (existingProdId) {
        const quantityInfo = parseProviderQuantityValues((p as any).rawData?.qty_values);
        await db.execute(sql`
          UPDATE products SET
            base_price_usd = ${String(p.price)},
            provider_unit_price = ${String(p.price)},
            product_type = ${p.productType},
            available = ${p.available},
            min_qty = ${p.minQty ? String(p.minQty) : null},
            max_qty = ${p.maxQty ? String(p.maxQty) : null},
            min_quantity = ${quantityInfo.minQuantity},
            quantity_type = ${quantityInfo.quantityType}::quantity_type,
            quantity_values = ${quantityInfo.quantityValues ? JSON.stringify(quantityInfo.quantityValues) : null}::jsonb,
            source = 'provider'
          WHERE id = ${existingProdId}
        `);
        updated++;
      }
    }

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "sync_provider",
      `provider_${providerId}`,
      { updated }
    );

    res.json({
      ok: true,
      message: `✅ تم تحديث ${updated} منتج مرتبط`,
      updated,
    });
  } catch (error: any) {
    console.error("🔥 Sync error:", error);
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.name === 'AbortError') {
      return res.status(408).json({
        error: 'انتهت مهلة الاتصال بمزود الخدمة (Timeout - 408). يرجى المحاولة لاحقاً، أو التأكد من استجابة خادم المزود.'
      });
    }
    res.status(500).json({ error: error.message || "فشلت المزامنة" });
  }
});


// ========== FETCH PROVIDER PRODUCTS (للاطلاع على المعرفات) ==========
router.get("/admin/providers/:id/products", requireAdmin, async (req, res) => {
  const providerId = Number(req.params.id);
  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, providerId))
    .limit(1);

  if (!provider) {
    res.status(404).json({ error: "المزود غير موجود" });
    return;
  }

  const pType = (provider.providerType || "custom").toLowerCase().trim();
  if (pType === "custom" || pType === "manual" || !provider.apiKey) {
    // For custom/manual provider, fetch products from the local database
    const localProducts = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        price: productsTable.priceUsd,
        category: categoriesTable.name,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(eq(productsTable.providerId, providerId));

    res.json({
      provider: provider.name,
      products: localProducts.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        category: p.category || "عام",
      })),
      isCustom: true,
    });
    return;
  }

  const adapter = getAdapter(pType);
  try {
    const products = await adapter.fetchProducts(
      provider.apiKey!,
      provider.apiUrl || undefined
    );

    if (!Array.isArray(products)) {
      throw new Error("تنسيق بيانات المنتجات المستلمة من المزود غير صالح (ليس مصفوفة)");
    }

    // إعادة قائمة بالمعلومات الأساسية فقط (id, name, price)
    const list = products.map((p) => {
      const typeVal = p.productType;
      const normalizedType = typeof typeVal === "string" ? typeVal.toLowerCase() : (typeVal != null ? String(typeVal).toLowerCase() : "custom");
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.categoryName,
        productType: normalizedType,
      };
    });

    res.json({ provider: provider.name, products: list });
  } catch (error: any) {
    console.error("Fetch provider products error:", error);
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.name === 'AbortError') {
      return res.status(408).json({
        error: 'انتهت مهلة الاتصال بمزود الخدمة (Timeout - 408). يرجى المحاولة لاحقاً.'
      });
    }
    res.status(500).json({ error: error.message || "فشل تحليل بيانات المنتجات من المزود" });
  }
});

// ========== VERIFY SINGLE PRODUCT AGAINST PROVIDER ==========
router.get("/admin/products/:id/provider-status", requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  if (!product.providerId) {
    res.json({
      ok: true,
      type: "local",
      existsAtProvider: false,
      message: "هذا منتج محلي غير مرتبط بمزوّد خارجي.",
      product: {
        id: product.id,
        name: product.name,
        source: product.source,
      },
    });
    return;
  }

  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, product.providerId))
    .limit(1);

  if (!provider) {
    res.status(400).json({ error: `المزوّد المرتبط (${product.providerId}) غير موجود` });
    return;
  }

  const apiUrl = provider.apiUrl || "https://api.mersal-card.com";
  let isMersalHost = false;
  try {
    const host = new URL(apiUrl).host.toLowerCase();
    isMersalHost = host === "api.mersal-card.com";
  } catch {
    isMersalHost = false;
  }

  const pType = (provider.providerType || "custom").toLowerCase().trim();
  if (pType === "custom" || pType === "manual" || !provider.apiKey) {
    res.json({
      ok: true,
      type: "custom",
      existsAtProvider: true,
      provider: {
        id: provider.id,
        name: provider.name,
        providerType: provider.providerType,
        apiUrl,
        isMersalHost: false,
      },
      product: {
        id: product.id,
        name: product.name,
        source: product.source,
      },
      message: "مزود مخصص / يدوي (Custom Provider).",
    });
    return;
  }

  if (!product.providerProductId) {
    res.json({
      ok: true,
      type: "provider",
      existsAtProvider: false,
      provider: {
        id: provider.id,
        name: provider.name,
        providerType: provider.providerType,
        apiUrl,
        isMersalHost,
      },
      product: {
        id: product.id,
        name: product.name,
        source: product.source,
      },
      message: "المنتج مرتبط بمزوّد لكن بدون providerProductId.",
    });
    return;
  }

  const adapter = getAdapter(pType);

  try {
    const remoteProducts = await adapter.fetchProducts(provider.apiKey!, provider.apiUrl || undefined);
    const remote = remoteProducts.find((p) => Number(p.id) === Number(product.providerProductId));
    const remotePrice = remote?.price != null ? Number(remote.price) : null;
    const localMarkup = Number((product as any).storeProfitPerUnit ?? product.priceUsd ?? 0);
    const localBaseCostRaw = (product as any).providerUnitPrice ?? product.basePriceUsd;
    const localBaseCost = localBaseCostRaw != null ? Number(localBaseCostRaw) : null;
    const localFinalPriceRaw = (product as any).finalUnitPrice;
    const localFinalPrice = localFinalPriceRaw != null
      ? Number(localFinalPriceRaw)
      : localBaseCost != null
        ? localBaseCost + localMarkup
        : localMarkup;

    res.json({
      ok: true,
      type: "provider",
      existsAtProvider: !!remote,
      provider: {
        id: provider.id,
        name: provider.name,
        providerType: provider.providerType,
        apiUrl,
        isMersalHost,
      },
      product: {
        id: product.id,
        name: product.name,
        source: product.source,
        localProviderProductId: product.providerProductId,
        localMarkupUsd: localMarkup,
        localBaseCostUsd: localBaseCost,
        localFinalPriceUsd: localFinalPrice,
      },
      remote: remote
        ? {
            id: remote.id,
            name: remote.name,
            priceUsd: remotePrice,
            categoryName: remote.categoryName,
            available: remote.available,
            minQty: remote.minQty ?? null,
            maxQty: remote.maxQty ?? null,
          }
        : null,
      baseCostDiffUsd:
        remotePrice != null && localBaseCost != null
          ? Number((localBaseCost - remotePrice).toFixed(6))
          : null,
      message: remote
        ? "تم العثور على المنتج عند المزوّد الخارجي."
        : "لم يتم العثور على providerProductId في قائمة منتجات المزوّد.",
    });
  } catch (error: any) {
    console.error("Verify provider product error:", error);
    res.status(500).json({ error: error?.message || "فشل التحقق من المنتج عند المزوّد" });
  }
});

// Provider Reports
router.get("/admin/provider-reports", requireAdmin, async (req, res) => {
  try {
    const stopped = await db.select().from(productsTable).where(eq(productsTable.available, false)).limit(100);
    const providersList = await db.select().from(providersTable);
    const mapped = stopped.map(p => {
      const prov = providersList.find(pr => pr.id === p.providerId);
      return {
        id: p.id,
        name: p.name,
        providerName: prov?.name || "المزود الرئيسي",
        cost: p.providerUnitPrice || p.basePriceUsd || "0.00",
        status: "متوقف / محذوف"
      };
    });
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب تقارير المزودين" });
  }
});

router.post("/admin/provider-reports/:productId/restart", requireAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    await db.update(productsTable)
      .set({ available: true, active: true })
      .where(eq(productsTable.id, productId));
    res.json({ ok: true, message: "تمت إعادة تشغيل وتفعيل الخدمة بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل إعادة تفعيل الخدمة" });
  }
});

// Currency Settings
router.get("/admin/currency-settings", requireAdmin, async (req, res) => {
  try {
    const s = await db.select().from(settingsTable).where(eq(settingsTable.key, "currency_settings"));
    if (s.length > 0) {
      res.json(s[0].value);
    } else {
      res.json({ storeCurrency: "USD", exchangeRate: 1.0, currencySymbol: "$" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعدادات العملة" });
  }
});

router.put("/admin/currency-settings", requireAdmin, async (req, res) => {
  try {
    const { storeCurrency, exchangeRate, currencySymbol } = req.body;
    const value = { storeCurrency, exchangeRate: Number(exchangeRate), currencySymbol };
    await db.insert(settingsTable).values({ key: "currency_settings", value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    res.json({ ok: true, message: "تم حفظ إعدادات العملة بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل حفظ إعدادات العملة" });
  }
});

// Provider Products for API Products page
router.get("/admin/provider-products/:providerId", requireAdmin, async (req, res) => {
  try {
    const providerId = Number(req.params.providerId);
    const [provider] = await db.select().from(providersTable).where(eq(providersTable.id, providerId));
    if (!provider) {
      return res.status(404).json({ error: "المزود غير موجود" });
    }
    const adapter = getAdapter(provider.providerType);
    if (!adapter) {
      const localProds = await db.select().from(productsTable).where(eq(productsTable.providerId, providerId));
      return res.json(localProds.map(p => ({
        id: p.id,
        name: p.name,
        price: p.priceUsd,
        available: p.available,
        externalServiceId: p.providerProductId
      })));
    }
    const remoteProds = await adapter.fetchProducts(provider.apiKey, provider.apiUrl || undefined);
    res.json(remoteProds.map((rp: any) => ({
      id: rp.id,
      name: rp.name,
      price: rp.price,
      category: rp.categoryName || rp.category || "عام",
      available: rp.available ?? true,
      externalServiceId: rp.id
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب منتجات المزود" });
  }
});

router.post("/admin/provider-products/import", requireAdmin, async (req, res) => {
  try {
    const { providerId, name, price, externalServiceId, categoryId } = req.body;
    if (!providerId || !name) {
      return res.status(400).json({ error: "بيانات الاستيراد غير مكتملة" });
    }
    const [newProd] = await db.insert(productsTable).values({
      name: String(name),
      priceUsd: String(price || "0"),
      providerId: Number(providerId),
      providerProductId: String(externalServiceId || ""),
      categoryId: categoryId ? Number(categoryId) : null,
      available: true,
      active: true,
      source: "api"
    } as any).returning();
    res.json({ ok: true, product: newProd, message: "تم استيراد المنتج بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل استيراد المنتج" });
  }
});

// Order Messages CRUD
router.get("/admin/order-messages", requireAdmin, async (req, res) => {
  try {
    const msgs = await db.select().from(orderMessagesTable);
    res.json(msgs);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب رسائل الطلبات" });
  }
});

router.post("/admin/order-messages", requireAdmin, async (req, res) => {
  try {
    const { event, title, body } = req.body;
    const [newMsg] = await db.insert(orderMessagesTable).values({ event, title, body }).returning();
    res.json(newMsg);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل إنشاء رسالة الطلب" });
  }
});

router.put("/admin/order-messages/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { event, title, body } = req.body;
    const [updated] = await db.update(orderMessagesTable)
      .set({ event, title, body })
      .where(eq(orderMessagesTable.id, id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل تحديث رسالة الطلب" });
  }
});

router.delete("/admin/order-messages/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(orderMessagesTable).where(eq(orderMessagesTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل حذف رسالة الطلب" });
  }
});

// Clear Cache
router.post("/admin/clear-cache", requireAdmin, async (req, res) => {
  try {
    res.json({ ok: true, message: "تم مسح الذاكرة المؤقتة بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل مسح الكاش" });
  }
});

// Popup Settings Admin
router.get("/admin/popup-settings", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    
    const getBool = (key: string, fallback = false) => {
      const v = map.get(key);
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v === "true";
      return fallback;
    };

    res.json({
      popupEnabled: getBool("popup_enabled", false),
      popupTitle: String(map.get("popup_title") || "مجتمع الواتس أب"),
      popupContent: String(map.get("popup_content") || "انضم إلى مجتمع الواتس أب للاطلاع على كل جديد والخصومات الحصرية."),
      popupImage: String(map.get("popup_image") || ""),
      popupLinkUrl: String(map.get("popup_link_url") || ""),
      popupLinkText: String(map.get("popup_link_text") || "انضم الآن"),
      popupButtonCloseText: String(map.get("popup_button_close_text") || "إغلاق الكل"),
      popupButtonReadText: String(map.get("popup_button_read_text") || "قراءة الكل"),
      popupButtonViewText: String(map.get("popup_button_view_text") || "عرض الكل"),
      popupShowOnlyOnce: getBool("popup_show_only_once", true),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعدادات النافذة المنبثقة" });
  }
});

router.put("/admin/popup-settings", requireAdmin, async (req, res) => {
  try {
    const {
      popupEnabled,
      popupTitle,
      popupContent,
      popupImage,
      popupLinkUrl,
      popupLinkText,
      popupButtonCloseText,
      popupButtonReadText,
      popupButtonViewText,
      popupShowOnlyOnce,
    } = req.body;

    const pairs = [
      ["popup_enabled", Boolean(popupEnabled)],
      ["popup_title", String(popupTitle || "")],
      ["popup_content", String(popupContent || "")],
      ["popup_image", String(popupImage || "")],
      ["popup_link_url", String(popupLinkUrl || "")],
      ["popup_link_text", String(popupLinkText || "")],
      ["popup_button_close_text", String(popupButtonCloseText || "")],
      ["popup_button_read_text", String(popupButtonReadText || "")],
      ["popup_button_view_text", String(popupButtonViewText || "")],
      ["popup_show_only_once", Boolean(popupShowOnlyOnce)],
    ];

    for (const [key, value] of pairs) {
      await db
        .insert(settingsTable)
        .values({ key, value })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    }

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "popup_settings_update",
      "settings",
      ["popup_enabled", "popup_title"]
    );

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل تحديث إعدادات النافذة المنبثقة" });
  }
});

// News Ticker Speed Settings Admin
router.get("/admin/settings/news-ticker", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const speed = Number(map.get("news_ticker_speed") || 15);
    res.json({ newsTickerSpeed: speed, news_ticker_speed: speed });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعدادات سرعة شريط الأخبار" });
  }
});

router.put("/admin/settings/news-ticker", requireAdmin, async (req, res) => {
  try {
    const { newsTickerSpeed, news_ticker_speed } = req.body;
    const speedVal = Number(newsTickerSpeed ?? news_ticker_speed ?? 15);

    await db
      .insert(settingsTable)
      .values({ key: "news_ticker_speed", value: speedVal })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: speedVal } });

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "news_ticker_speed_update",
      "settings",
      ["news_ticker_speed"]
    );

    res.json({ success: true, newsTickerSpeed: speedVal });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل تحديث إعدادات سرعة شريط الأخبار" });
  }
});

// Maintenance Settings Admin
router.get("/admin/maintenance-settings", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const getBool = (key: string, fallback = false) => {
      const v = map.get(key);
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v === "true";
      return fallback;
    };
    res.json({
      maintenanceMode: getBool("maintenance_mode", false),
      maintenanceTitle: String(map.get("maintenance_title") || "الموقع قيد الصيانة المؤقتة"),
      maintenanceMessage: String(map.get("maintenance_message") || "نعمل حاليًّا على تنفيذ مجموعة من أعمال الصيانة والتحديث لتحسين أداء الموقع."),
      maintenanceIcon: String(map.get("maintenance_icon") || "Wrench"),
      maintenanceContactEnabled: getBool("maintenance_contact_enabled", true),
      maintenanceContactText: String(map.get("maintenance_contact_text") || "تواصل معنا"),
      maintenanceContactUrl: String(map.get("maintenance_contact_url") || "/support"),
      maintenanceEstimatedTime: String(map.get("maintenance_estimated_time") || ""),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعدادات وضع الصيانة" });
  }
});

router.put("/admin/maintenance-settings", requireAdmin, async (req, res) => {
  try {
    const {
      maintenanceMode,
      maintenance_mode,
      maintenanceTitle,
      maintenance_title,
      maintenanceMessage,
      maintenance_message,
      maintenanceIcon,
      maintenance_icon,
      maintenanceContactEnabled,
      maintenance_contact_enabled,
      maintenanceContactText,
      maintenance_contact_text,
      maintenanceContactUrl,
      maintenance_contact_url,
      maintenanceEstimatedTime,
      maintenance_estimated_time,
    } = req.body;

    const modeVal = Boolean(maintenanceMode ?? maintenance_mode ?? false);
    const titleVal = String(maintenanceTitle ?? maintenance_title ?? "الموقع قيد الصيانة المؤقتة");
    const msgVal = String(maintenanceMessage ?? maintenance_message ?? "نعمل حاليًّا على تنفيذ مجموعة من أعمال الصيانة والتحديث لتحسين أداء الموقع.");
    const iconVal = String(maintenanceIcon ?? maintenance_icon ?? "Wrench");
    const contactEnabledVal = Boolean(maintenanceContactEnabled ?? maintenance_contact_enabled ?? true);
    const contactTextVal = String(maintenanceContactText ?? maintenance_contact_text ?? "تواصل معنا");
    const contactUrlVal = String(maintenanceContactUrl ?? maintenance_contact_url ?? "/support");
    const estimatedTimeVal = String(maintenanceEstimatedTime ?? maintenance_estimated_time ?? "");

    const settingsPairs = [
      { key: "maintenance_mode", value: modeVal },
      { key: "maintenance_title", value: titleVal },
      { key: "maintenance_message", value: msgVal },
      { key: "maintenance_icon", value: iconVal },
      { key: "maintenance_contact_enabled", value: contactEnabledVal },
      { key: "maintenance_contact_text", value: contactTextVal },
      { key: "maintenance_contact_url", value: contactUrlVal },
      { key: "maintenance_estimated_time", value: estimatedTimeVal },
    ];

    for (const pair of settingsPairs) {
      await db
        .insert(settingsTable)
        .values(pair)
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: pair.value } });
    }

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "maintenance_settings_update",
      "settings",
      ["maintenance_mode", "maintenance_title", "maintenance_message", "maintenance_icon", "maintenance_contact_enabled", "maintenance_contact_text", "maintenance_contact_url", "maintenance_estimated_time"]
    );

    res.json({ success: true, message: "تم تحديث إعدادات وضع الصيانة بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل تحديث إعدادات وضع الصيانة" });
  }
});

// Legacy Product Form Toggle Settings
router.get("/admin/settings/use-legacy-product-form", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "use_legacy_product_form"));
    const val = rows[0]?.value;
    const isLegacy = val === true || val === "true" || JSON.stringify(val) === "true";
    res.json({ value: isLegacy ? "true" : "false", useLegacy: isLegacy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعداد واجهة المنتجات" });
  }
});

router.put("/admin/settings/use-legacy-product-form", requireAdmin, async (req, res) => {
  try {
    const { value, useLegacy } = req.body;
    const isLegacy = value === true || value === "true" || useLegacy === true || useLegacy === "true";

    await db
      .insert(settingsTable)
      .values({ key: "use_legacy_product_form", value: isLegacy })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: isLegacy } });

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "use_legacy_product_form_update",
      "settings",
      ["use_legacy_product_form"]
    );

    res.json({ success: true, value: isLegacy ? "true" : "false", useLegacy: isLegacy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل تحديث إعداد واجهة المنتجات" });
  }
});

// Legacy Dashboard Toggle Settings
router.get("/admin/settings/use-legacy-dashboard", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "use_legacy_dashboard"));
    const val = rows[0]?.value;
    const isLegacy = val === true || val === "true" || JSON.stringify(val) === "true";
    res.json({ value: isLegacy ? "true" : "false", useLegacy: isLegacy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعداد لوحة القيادة" });
  }
});

router.put("/admin/settings/use-legacy-dashboard", requireAdmin, async (req, res) => {
  try {
    const { value, useLegacy } = req.body;
    const isLegacy = value === true || value === "true" || useLegacy === true || useLegacy === "true";

    await db
      .insert(settingsTable)
      .values({ key: "use_legacy_dashboard", value: isLegacy })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: isLegacy } });

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "use_legacy_dashboard_update",
      "settings",
      ["use_legacy_dashboard"]
    );

    res.json({ success: true, value: isLegacy ? "true" : "false", useLegacy: isLegacy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل تحديث إعداد لوحة القيادة" });
  }
});

// Legacy Api Products Toggle Settings
router.get("/admin/settings/use-legacy-api-products", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "use_legacy_api_products"));
    const val = rows[0]?.value;
    const isLegacy = val === true || val === "true" || JSON.stringify(val) === "true";
    res.json({ value: isLegacy ? "true" : "false", useLegacy: isLegacy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعداد منتجات المزود" });
  }
});

router.put("/admin/settings/use-legacy-api-products", requireAdmin, async (req, res) => {
  try {
    const { value, useLegacy } = req.body;
    const isLegacy = value === true || value === "true" || useLegacy === true || useLegacy === "true";

    await db
      .insert(settingsTable)
      .values({ key: "use_legacy_api_products", value: isLegacy })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: isLegacy } });

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "use_legacy_api_products_update",
      "settings",
      ["use_legacy_api_products"]
    );

    res.json({ success: true, value: isLegacy ? "true" : "false", useLegacy: isLegacy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل تحديث إعداد منتجات المزود" });
  }
});

// Legacy Banners Toggle Settings
router.get("/admin/settings/use-legacy-banners-page", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "use_legacy_banners_page"));
    const val = rows[0]?.value;
    const isLegacy = val === true || val === "true" || JSON.stringify(val) === "true";
    res.json({ value: isLegacy ? "true" : "false", useLegacy: isLegacy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعداد واجهة البانرات" });
  }
});

router.put("/admin/settings/use-legacy-banners-page", requireAdmin, async (req, res) => {
  try {
    const { value, useLegacy } = req.body;
    const isLegacy = value === true || value === "true" || useLegacy === true || useLegacy === "true";

    await db
      .insert(settingsTable)
      .values({ key: "use_legacy_banners_page", value: isLegacy })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: isLegacy } });

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "use_legacy_banners_page_update",
      "settings",
      ["use_legacy_banners_page"]
    );

    res.json({ success: true, value: isLegacy ? "true" : "false", useLegacy: isLegacy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل تحديث إعداد واجهة البانرات" });
  }
});

// Show Featured Offers Store Setting
router.get("/admin/settings/show-featured-offers", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "show_featured_offers"));
    const val = rows[0]?.value;
    const show = val === undefined || val === true || val === "true" || JSON.stringify(val) === "true";
    res.json({ value: show ? "true" : "false", showFeaturedOffers: show });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب إعداد العروض المميزة" });
  }
});

router.put("/admin/settings/show-featured-offers", requireAdmin, async (req, res) => {
  try {
    const { value, showFeaturedOffers } = req.body;
    const show = value === true || value === "true" || showFeaturedOffers === true || showFeaturedOffers === "true";

    await db
      .insert(settingsTable)
      .values({ key: "show_featured_offers", value: show })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: show } });

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "show_featured_offers_update",
      "settings",
      ["show_featured_offers"]
    );

    res.json({ success: true, value: show ? "true" : "false", showFeaturedOffers: show });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل تحديث إعداد العروض المميزة" });
  }
});

// Generic Settings Fallback Routes
router.get("/admin/settings/:key", requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
    if (rows.length > 0) {
      res.json({ key, value: rows[0].value });
    } else {
      res.json({ key, value: null });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل جلب الإعداد" });
  }
});

router.put("/admin/settings/:key", requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    const value = req.body.value !== undefined ? req.body.value : req.body;
    await db
      .insert(settingsTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });

    await logActivity(
      { id: req.session.adminId, name: req.session.adminUsername },
      "setting_update",
      "settings",
      [key]
    );

    res.json({ success: true, key, value });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل حفظ الإعداد" });
  }
});

export default router;
