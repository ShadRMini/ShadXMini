import { Router, type IRouter } from "express";
import { timingSafeEqual } from "node:crypto";
import { db, depositsTable, paymentMethodsTable, shamcashUsedTransactionRefsTable, usersTable } from "@workspace/db";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import {
  CreateDepositBody,
  CreateDepositResponse,
  GetDepositsSummaryResponse,
  ListMyDepositsResponse,
} from "@workspace/api-zod";
import { getOrCreateCurrentUser, getOrCreateCurrentUserStrict } from "../lib/currentUser.js";
import {
  notifyAdminsAboutDeposit,
  notifyUserDepositApproved,
  notifyUserDepositPending,
  notifyUserDepositRejected,
} from "../lib/telegram.js";
import {
  notifyUserDepositConfirmed as notifyInternalDepositConfirmed,
  notifyUserDepositRejected as notifyInternalDepositRejected,
} from "../lib/notifications.js";
import { rateLimit } from "../lib/rateLimit.js";
import { createShamCashInvoice, getShamCashSettings } from "../services/shamcash.service.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();
const SAM_API_BASE_URL = process.env.SAM_API_BASE_URL || "https://www.sam-api.pro/api";
const SAM_PAY_BASE_URL =
  process.env.SAM_PAY_BASE_URL ||
  SAM_API_BASE_URL.replace(/\/api\/?$/i, "");
const SAM_API_KEY = process.env.SAM_API_KEY || "";
const SAM_SHAMCASH_IDENTIFIER = process.env.SAM_SHAMCASH_IDENTIFIER || "";
const SAM_WEBHOOK_SECRET = process.env.SAM_WEBHOOK_SECRET || "";
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL || process.env.RENDER_EXTERNAL_URL || "";

const shamCashInvoiceRateLimit = rateLimit({
  keyPrefix: "shamcash-invoice",
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "تم تجاوز عدد محاولات إنشاء الفواتير. حاول بعد قليل.",
  keyGenerator: (req) => {
    const telegramId = String(req.headers["x-telegram-id"] || req.body?.telegramId || "").trim();
    return telegramId || req.ip || "unknown";
  },
});

function authHeaders() {
  if (!SAM_API_KEY) throw new Error("SAM_API_KEY is missing");
  return {
    Authorization: `Bearer ${SAM_API_KEY}`,
    "X-Api-Key": SAM_API_KEY,
    "Content-Type": "application/json",
  };
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 10000,
): Promise<{ response: Response; payload: any }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json().catch((jsonErr) => {
      console.warn("[fetchJsonWithTimeout] ⚠️ Failed to parse response JSON from:", url, jsonErr?.message);
      return {};
    });
    return { response, payload };
  } finally {
    clearTimeout(timeout);
  }
}

let shamCashRefsTableReady = false;
let depositsTelegramMessageColumnReady = false;

async function ensureDepositsTelegramMessageColumn() {
  if (depositsTelegramMessageColumnReady) return;
  await db.execute(sql`
    ALTER TABLE deposits
    ADD COLUMN IF NOT EXISTS telegram_message_id INTEGER
  `);
  depositsTelegramMessageColumnReady = true;
}

function normalizeShamCashTransactionRef(input: unknown): string {
  return String(input || "").replace(/\D/g, "").trim();
}

function isValidShamCashTransactionRef(ref: string): boolean {
  return /^[a-zA-Z0-9]{4,100}$/.test(ref);
}

async function ensureShamCashRefsTable() {
  if (shamCashRefsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS shamcash_used_transaction_refs (
      id SERIAL PRIMARY KEY,
      transaction_ref TEXT NOT NULL UNIQUE,
      deposit_id INTEGER REFERENCES deposits(id),
      user_id INTEGER REFERENCES users(id),
      invoice_id TEXT,
      amount_usd NUMERIC(24, 12),
      amount_syp NUMERIC(14, 2),
      currency TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  shamCashRefsTableReady = true;
}

async function isShamCashTransactionRefUsed(transactionRef: string): Promise<boolean> {
  await ensureShamCashRefsTable();
  const rows: any = await db.execute(sql`
    SELECT id FROM shamcash_used_transaction_refs
    WHERE transaction_ref = ${transactionRef}
    LIMIT 1
  `);
  return Array.isArray(rows?.rows) ? rows.rows.length > 0 : Array.isArray(rows) ? rows.length > 0 : false;
}

async function reserveShamCashTransactionRef(args: {
  transactionRef: string;
  depositId: number;
  userId: number;
  invoiceId: string;
  amountUsd: string | number;
  amountSyp: string | number | null;
  currency: string;
}): Promise<boolean> {
  await ensureShamCashRefsTable();
  try {
    await db.execute(sql`
      INSERT INTO shamcash_used_transaction_refs (
        transaction_ref,
        deposit_id,
        user_id,
        invoice_id,
        amount_usd,
        amount_syp,
        currency
      )
      VALUES (
        ${args.transactionRef},
        ${args.depositId},
        ${args.userId},
        ${args.invoiceId},
        ${String(args.amountUsd)},
        ${args.amountSyp == null ? null : String(args.amountSyp)},
        ${args.currency}
      )
    `);
    return true;
  } catch (error: any) {
    if (error?.code === "23505") return false;
    throw error;
  }
}

type ApproveDepositAtomicResult =
  | { success: true; alreadyProcessed: false; deposit: any }
  | { success: true; alreadyProcessed: true; deposit: any }
  | { success: false; error: "not_found" }
  | { success: false; error: "ref_already_used"; message: string }
  | { success: false; error: "duplicate_ref"; message: string }
  | { success: false; error: "invalid_ref"; message: string }
  | { success: false; error: "amount_mismatch"; message: string }
  | { success: false; error: "currency_mismatch"; message: string };

function validateDepositAmountAndCurrency(
  deposit: { amountUsd: string | number; amountSyp?: string | number | null; currency: string; id: number },
  verifyData?: { paidAmount?: number | string | null; amount?: number | string | null; currency?: string | null } | null,
): { valid: boolean; reason?: "amount_mismatch" | "currency_mismatch" } {
  if (!verifyData) return { valid: true };

  const rawPaid = verifyData.paidAmount ?? verifyData.amount;
  const paidAmount = rawPaid !== undefined && rawPaid !== null && rawPaid !== "" ? Number(rawPaid) : 0;
  const paidCurrency = String(verifyData.currency || "").trim().toUpperCase();

  const expectedCurrency = String(deposit.currency || "USD").trim().toUpperCase();
  const expectedAmount = expectedCurrency === "SYP"
    ? Number(deposit.amountSyp || 0)
    : Number(deposit.amountUsd || 0);

  // الشرط 2.1: تطابق العملة
  if (paidCurrency && paidCurrency !== expectedCurrency) {
    logger.error(
      {
        depositId: deposit.id,
        expected: expectedCurrency,
        paid: paidCurrency,
      },
      "🚨 Currency mismatch in verify"
    );
    return { valid: false, reason: "currency_mismatch" };
  }

  // الشرط 2.2: تطابق المبلغ بهامش تسامح 1% لفرق العمولة
  if (paidAmount > 0 && expectedAmount > 0) {
    const tolerance = 0.01;
    const diff = Math.abs(paidAmount - expectedAmount);
    const amountMatches = diff / expectedAmount <= tolerance;

    if (!amountMatches) {
      logger.error(
        {
          depositId: deposit.id,
          expected: expectedAmount,
          paid: paidAmount,
          diff: paidAmount - expectedAmount,
        },
        "🚨 Amount mismatch in verify"
      );
      return { valid: false, reason: "amount_mismatch" };
    }
  }

  return { valid: true };
}

async function approveShamCashDepositAtomic(params: {
  depositId: number;
  transactionRef?: string | null;
  invoiceId?: string;
  approvedVia?: string;
  verifyData?: {
    paidAmount?: number | string | null;
    amount?: number | string | null;
    currency?: string | null;
  } | null;
}): Promise<ApproveDepositAtomicResult> {
  await ensureShamCashRefsTable();
  await ensureDepositsTelegramMessageColumn();

  let notifyData: {
    userId: number;
    depositId: number;
    amountUsd: string | number;
    amountSyp: string | number | null;
    currency: string;
    telegramMessageId?: number | null;
  } | null = null;

  try {
    const txResult = await db.transaction(async (tx: any) => {
      // 1. قفل صف الإيداع لمنع أي Race Condition (SELECT ... FOR UPDATE)
      let query = tx.select().from(depositsTable).where(eq(depositsTable.id, params.depositId));
      if (typeof query.for === "function") {
        query = query.for("update");
      }
      const [dep] = await query.limit(1);

      if (!dep) {
        return { success: false as const, error: "not_found" as const };
      }

      // إذا كان الإيداع معتمدًا مسبقًا
      if (dep.status === "approved") {
        return { success: true as const, alreadyProcessed: true as const, deposit: dep };
      }

      // الشرط 1: التحقق الإلزامي من أن transactionRef لم يُستخدم في أي إيداع معتمد آخر
      const normalizedRef = params.transactionRef ? normalizeShamCashTransactionRef(params.transactionRef) : null;
      if (normalizedRef) {
        if (!isValidShamCashTransactionRef(normalizedRef)) {
          return {
            success: false as const,
            error: "invalid_ref" as const,
            message: "رقم العملية غير صالح. يجب أن يحتوي على أحرف وأرقام فقط وطوله بين 4 و100 محرف.",
          };
        }

        // فحص جدول depositsTable لمنع استخدام نفس الرقم في إيداع معتمد آخر
        const existingDepWithRef = await tx
          .select({ id: depositsTable.id })
          .from(depositsTable)
          .where(
            and(
              eq(depositsTable.transactionRef, normalizedRef),
              ne(depositsTable.id, dep.id),
              eq(depositsTable.status, "approved")
            )
          )
          .limit(1);

        if (existingDepWithRef.length > 0) {
          logger.warn(
            {
              depositId: dep.id,
              ref: normalizedRef,
              existingDepositId: existingDepWithRef[0].id,
            },
            "⚠️ transactionRef already used in another approved deposit"
          );
          return {
            success: false as const,
            error: "ref_already_used" as const,
            message: "رقم العملية غير صالح أو تم استخدامه مسبقًا في عملية إيداع معتمدة أخرى.",
          };
        }

        // فحص جدول shamcash_used_transaction_refs
        const [usedRef] = await tx
          .select({ id: shamcashUsedTransactionRefsTable.id })
          .from(shamcashUsedTransactionRefsTable)
          .where(eq(shamcashUsedTransactionRefsTable.transactionRef, normalizedRef))
          .limit(1);

        if (usedRef) {
          logger.warn(
            { depositId: dep.id, ref: normalizedRef },
            "⚠️ transactionRef already registered in shamcash_used_transaction_refs"
          );
          return {
            success: false as const,
            error: "ref_already_used" as const,
            message: "رقم العملية غير صالح أو تم استخدامه مسبقًا.",
          };
        }
      }

      // الشرط 2: مطابقة المبلغ والعملة (paidAmount & currency) بهامش 1%
      if (params.verifyData) {
        const valCheck = validateDepositAmountAndCurrency(dep, params.verifyData);
        if (!valCheck.valid) {
          return {
            success: false as const,
            error: valCheck.reason || "amount_mismatch",
            message:
              valCheck.reason === "currency_mismatch"
                ? "عملة الفاتورة لا تطابق عملة الدفع."
                : "المبلغ المدفوع لا يطابق مبلغ الفاتورة المطلوب.",
          };
        }
      }

      // الشرط 3: تحديث حالة الإيداع ذرياً بشرط status = 'pending' (Atomic Idempotency)
      const [updatedDep] = await tx
        .update(depositsTable)
        .set({
          status: "approved",
          ...(normalizedRef ? { transactionRef: normalizedRef } : {}),
          approvedVia: params.approvedVia || "verify",
          approvedAt: new Date(),
        })
        .where(
          and(
            eq(depositsTable.id, dep.id),
            eq(depositsTable.status, "pending") // ← شرط حرج
          )
        )
        .returning();

      if (!updatedDep) {
        // تم تحديثه بالفعل بواسطة عملية متزامنة (مثل webhook)
        logger.info(
          { depositId: dep.id, via: params.approvedVia || "verify" },
          "Deposit already processed (likely by webhook or concurrent request)"
        );
        return {
          success: true as const,
          alreadyProcessed: true as const,
          deposit: dep,
        };
      }

      // الآن فقط: إضافة الرصيد إلى المستخدم ذرّياً
      const col = dep.currency === "SYP" ? "balanceSyp" : "balanceUsd";
      const amount = dep.currency === "SYP" ? dep.amountSyp : dep.amountUsd;
      if (amount) {
        await tx
          .update(usersTable)
          .set({
            [col]:
              col === "balanceSyp"
                ? sql`${usersTable.balanceSyp} + ${amount}`
                : sql`${usersTable.balanceUsd} + ${amount}`,
          })
          .where(eq(usersTable.id, dep.userId));
      }

      if (normalizedRef) {
        try {
          await tx.execute(sql`
            INSERT INTO shamcash_used_transaction_refs (
              transaction_ref,
              deposit_id,
              user_id,
              invoice_id,
              amount_usd,
              amount_syp,
              currency
            )
            VALUES (
              ${normalizedRef},
              ${dep.id},
              ${dep.userId},
              ${params.invoiceId || dep.transactionId || null},
              ${String(dep.amountUsd)},
              ${dep.amountSyp == null ? null : String(dep.amountSyp)},
              ${dep.currency}
            )
            ON CONFLICT (transaction_ref) DO NOTHING
          `);
        } catch (insertErr: any) {
          if (insertErr?.code === "23505") {
            return {
              success: false as const,
              error: "duplicate_ref" as const,
              message: "رقم العملية غير صالح أو تم استخدامه مسبقًا.",
            };
          }
          throw insertErr;
        }
      }

      notifyData = {
        userId: dep.userId,
        depositId: dep.id,
        amountUsd: dep.amountUsd,
        amountSyp: dep.amountSyp,
        currency: dep.currency,
        telegramMessageId: dep.telegramMessageId,
      };

      return {
        success: true as const,
        alreadyProcessed: false as const,
        deposit: updatedDep,
      };
    });

    // 5. إرسال الإشعارات بعد اكتمال المعاملة بنجاح
    if (txResult.success && !txResult.alreadyProcessed && notifyData) {
      try {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, (notifyData as any).userId)).limit(1);
        if (u) {
          await notifyUserDepositApproved({
            telegramId: u.telegramId,
            addedUsd: Number((notifyData as any).amountUsd),
            currentUsd: Number(u.balanceUsd),
            operationNumber: String((notifyData as any).depositId),
            messageId: (notifyData as any).telegramMessageId,
          }).catch((e: any) => console.error("[Telegram notify error]:", e));

          await notifyInternalDepositConfirmed({
            userId: u.id,
            id: (notifyData as any).depositId,
            amountUsd: (notifyData as any).amountUsd,
            amountSyp: (notifyData as any).amountSyp,
            currency: (notifyData as any).currency,
          }).catch((e: any) => console.error("[Internal notify error]:", e));
        }
      } catch (notifyErr) {
        console.error("Post-commit notify failed:", notifyErr);
      }
    }

    return txResult;
  } catch (error: any) {
    if (error?.code === "23505") {
      return {
        success: false,
        error: "duplicate_ref",
        message: "رقم العملية غير صالح أو تم استخدامه مسبقًا.",
      };
    }
    throw error;
  }
}

async function findIncomingShamCashTransactionByRef(
  walletIdentifier: string,
  transactionRef: string,
): Promise<{ found: boolean; amount?: number; currency?: string }> {
  const txUrl = `${SAM_API_BASE_URL.replace(/\/+$/, "")}/v1/wallets/shamcash/${encodeURIComponent(walletIdentifier)}/transactions?direction=in`;
  const { response, payload } = await fetchJsonWithTimeout(
    txUrl,
    {
      method: "GET",
      headers: authHeaders(),
    },
    10000,
  );
  if (!response.ok || !Array.isArray(payload)) {
    console.error("ShamCash transactions lookup failed:", {
      status: response.status,
      code: payload?.code,
      message: payload?.message,
    });
    return { found: false };
  }

  const match = payload.find((t: any) => String(t?.id || "").trim() === transactionRef);
  if (!match) return { found: false };

  const amount = Number(match?.amount);
  const currency = String(match?.currency || "").toUpperCase();
  return {
    found: true,
    amount: Number.isFinite(amount) ? amount : undefined,
    currency: currency || undefined,
  };
}

async function applyDepositStatusChangeAuto(id: number, status: "approved" | "rejected") {
  await ensureDepositsTelegramMessageColumn();
  const [dep] = await db.select().from(depositsTable).where(eq(depositsTable.id, id)).limit(1);
  if (!dep) return { error: "not_found" as const };

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
      } else {
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
      console.error("Auto deposit notify failed:", error);
    }
  }

  return { updated };
}

// ==========================================
// ShamCash API Sync, Backoff & Circuit Breaker
// ==========================================

export function isShamCashSyncEnabled(): boolean {
  const envVal = String(process.env.SHAMCASH_SYNC_ENABLED ?? "true").toLowerCase().trim();
  return envVal !== "false" && envVal !== "0";
}

interface SamApiCircuitBreakerState {
  consecutiveFailures: number;
  openUntil: number;
  lastLoggedOpenAt: number;
}

const samApiCircuitBreaker: SamApiCircuitBreakerState = {
  consecutiveFailures: 0,
  openUntil: 0,
  lastLoggedOpenAt: 0,
};

function recordSamApiSuccess() {
  samApiCircuitBreaker.consecutiveFailures = 0;
}

function recordSamApiFailure(reason: string) {
  samApiCircuitBreaker.consecutiveFailures += 1;
  if (samApiCircuitBreaker.consecutiveFailures >= 5) {
    samApiCircuitBreaker.openUntil = Date.now() + 15 * 60 * 1000; // 15-minute circuit break
    const now = Date.now();
    if (now - samApiCircuitBreaker.lastLoggedOpenAt > 5 * 60 * 1000) {
      logger.warn(
        {
          consecutiveFailures: samApiCircuitBreaker.consecutiveFailures,
          openUntil: new Date(samApiCircuitBreaker.openUntil).toISOString(),
          lastReason: reason,
        },
        "[syncShamCashInvoiceStatus] Circuit breaker OPEN: Pausing SAM API sync for 15 minutes after 5 consecutive failures"
      );
      samApiCircuitBreaker.lastLoggedOpenAt = now;
    }
  }
}

interface InvoiceBackoffRecord {
  attempts: number;
  nextAllowedTime: number;
  loggedNonJson?: boolean;
}

const invoiceBackoffMap = new Map<string, InvoiceBackoffRecord>();
const BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 30000, 60000];

function canAttemptInvoiceSync(invoiceId: string): boolean {
  const state = invoiceBackoffMap.get(invoiceId);
  if (!state) return true;
  return Date.now() >= state.nextAllowedTime;
}

function recordInvoiceSyncAttempt(invoiceId: string) {
  const state = invoiceBackoffMap.get(invoiceId);
  const attempts = (state?.attempts ?? 0) + 1;
  const delayIdx = Math.min(attempts - 1, BACKOFF_DELAYS_MS.length - 1);
  const delayMs = BACKOFF_DELAYS_MS[delayIdx];
  const nextAllowedTime = Date.now() + delayMs;

  invoiceBackoffMap.set(invoiceId, {
    attempts,
    nextAllowedTime,
    loggedNonJson: state?.loggedNonJson ?? false,
  });

  if (invoiceBackoffMap.size > 2000) {
    const now = Date.now();
    for (const [k, v] of invoiceBackoffMap.entries()) {
      if (now > v.nextAllowedTime + 3600000) {
        invoiceBackoffMap.delete(k);
      }
    }
  }
}

function clearInvoiceSyncRecord(invoiceId: string) {
  invoiceBackoffMap.delete(invoiceId);
}

async function syncShamCashInvoiceStatus(
  invoiceId: string,
  force = false
): Promise<{
  found: boolean;
  status?: string;
  synced?: "approved" | "rejected" | "pending";
}> {
  const cleanInvoiceId = String(invoiceId || "").trim();
  if (!cleanInvoiceId) return { found: false };
  await ensureDepositsTelegramMessageColumn();

  const [dep] = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.transactionId, cleanInvoiceId))
    .limit(1);
  if (!dep) return { found: false };
  if (dep.status !== "pending") return { found: true, status: dep.status, synced: dep.status as any };

  // Circuit breaker check (bypassed only if force is explicitly true)
  if (!force && Date.now() < samApiCircuitBreaker.openUntil) {
    return { found: true, status: dep.status, synced: "pending" };
  }

  // Per-invoice exponential backoff check
  if (!force && !canAttemptInvoiceSync(cleanInvoiceId)) {
    return { found: true, status: dep.status, synced: "pending" };
  }

  const dbSettings = await getShamCashSettings().catch(() => null);
  const apiBaseUrl = (
    dbSettings?.apiBaseUrl ||
    process.env.SAM_API_BASE_URL ||
    "https://www.sam-api.pro/api"
  ).replace(/\/+$/, "");

  const apiKey = (
    dbSettings?.apiKey ||
    process.env.SAM_API_KEY ||
    ""
  ).trim();

  // SAM API invoice status endpoint: GET /api/pay/{invoiceId} (confirmed returns 200 OK + JSON)
  const url = `${apiBaseUrl}/pay/${encodeURIComponent(cleanInvoiceId)}`;

  let payResp: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    payResp = await fetch(url, {
      method: "GET",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}`, "X-Api-Key": apiKey } : {}),
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (netErr: any) {
    recordInvoiceSyncAttempt(cleanInvoiceId);
    recordSamApiFailure(`Network error: ${netErr?.message || netErr}`);
    return { found: true, status: dep.status, synced: "pending" };
  }

  // Fail-Safe: Check Content-Type before parsing JSON
  const contentType = payResp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await payResp.text().catch(() => "");
    const state = invoiceBackoffMap.get(cleanInvoiceId);
    if (!state?.loggedNonJson) {
      logger.warn(
        {
          invoiceId: cleanInvoiceId,
          status: payResp.status,
          contentType,
          htmlPreview: text.substring(0, 200),
        },
        "[syncShamCashInvoiceStatus] Non-JSON response from SAM API"
      );
      if (state) state.loggedNonJson = true;
    }
    recordInvoiceSyncAttempt(cleanInvoiceId);
    recordSamApiFailure(`Non-JSON response (${payResp.status}, content-type: ${contentType})`);
    return { found: true, status: dep.status, synced: "pending" };
  }

  let payJson: any = null;
  try {
    payJson = await payResp.json();
  } catch (jsonErr: any) {
    logger.warn(
      { invoiceId: cleanInvoiceId, error: jsonErr?.message },
      "[syncShamCashInvoiceStatus] Failed to parse JSON from SAM API invoice endpoint"
    );
    recordInvoiceSyncAttempt(cleanInvoiceId);
    recordSamApiFailure(`JSON parse error: ${jsonErr?.message}`);
    return { found: true, status: dep.status, synced: "pending" };
  }

  recordSamApiSuccess();

  const invoiceData = payJson?.data || payJson?.invoice || payJson;
  const samStatus = String(invoiceData?.status || "").toLowerCase().trim();

  if (samStatus === "paid" || samStatus === "completed" || samStatus === "success") {
    const rawTxRef = normalizeShamCashTransactionRef(
      invoiceData?.transactionRef ||
      invoiceData?.transaction_ref ||
      payJson?.transactionRef ||
      payJson?.transaction_ref
    );
    const hasPaidAt = Boolean(invoiceData?.paidAt || payJson?.paidAt);

    // GET وحده بدون transactionRef وبدون paidAt لا يُعتمد تلقائياً لحماية الأموال
    if (rawTxRef && hasPaidAt) {
      const isUsed = await isShamCashTransactionRefUsed(rawTxRef);
      if (!isUsed) {
        const atomicRes = await approveShamCashDepositAtomic({
          depositId: dep.id,
          transactionRef: rawTxRef,
          invoiceId: cleanInvoiceId,
          approvedVia: "get_sync",
          verifyData: invoiceData,
        });
        if (atomicRes.success) {
          clearInvoiceSyncRecord(cleanInvoiceId);
          return { found: true, status: samStatus, synced: "approved" };
        }
      }
    }

    logger.info(
      { invoiceId: cleanInvoiceId, samStatus, rawTxRef, hasPaidAt },
      "[syncShamCashInvoiceStatus] GET shows paid but lacks unused transactionRef or paidAt — waiting for verify or webhook"
    );
    recordInvoiceSyncAttempt(cleanInvoiceId);
    return { found: true, status: samStatus, synced: "pending" };
  }

  if (samStatus === "expired" || samStatus === "cancelled" || samStatus === "failed") {
    await applyDepositStatusChangeAuto(dep.id, "rejected");
    clearInvoiceSyncRecord(cleanInvoiceId);
    return { found: true, status: samStatus, synced: "rejected" };
  }

  // Invoice is still pending
  recordInvoiceSyncAttempt(cleanInvoiceId);
  return { found: true, status: samStatus || "pending", synced: "pending" };
}

async function syncPendingShamCashDepositsForUser(userId: number): Promise<void> {
  if (!isShamCashSyncEnabled()) {
    return;
  }
  if (Date.now() < samApiCircuitBreaker.openUntil) {
    return;
  }

  const pending = await db
    .select({ transactionId: depositsTable.transactionId })
    .from(depositsTable)
    .where(and(eq(depositsTable.userId, userId), eq(depositsTable.method, "sham_cash_auto"), eq(depositsTable.status, "pending")))
    .orderBy(desc(depositsTable.id))
    .limit(10);

  for (const dep of pending) {
    try {
      await syncShamCashInvoiceStatus(String(dep.transactionId || ""), false);
    } catch (error) {
      console.error("ShamCash pending sync failed:", error);
    }
  }
}

function rowToDeposit(d: typeof depositsTable.$inferSelect) {
  let mappedStatus: "pending" | "approved" | "rejected" = "pending";
  const st = String(d.status || "").toLowerCase().trim();
  if (st === "approved" || st === "accept" || st === "completed") {
    mappedStatus = "approved";
  } else if (st === "rejected" || st === "reject" || st === "cancelled" || st === "expired" || st === "failed") {
    mappedStatus = "rejected";
  } else {
    mappedStatus = "pending";
  }

  const curr = String(d.currency || "USD").toUpperCase();
  const validCurrency: "USD" | "SYP" = curr === "SYP" ? "SYP" : "USD";

  return {
    id: String(d.id),
    amountUsd: Number(d.amountUsd || 0),
    amountSyp: d.amountSyp != null ? Number(d.amountSyp) : undefined,
    currency: validCurrency,
    method: String(d.method || "manual"),
    methodLabel: String(d.methodLabel || d.method || "Deposit"),
    transactionId: String(d.transactionId || `DEP-${d.id}`),
    status: mappedStatus,
    createdAt: (d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt || Date.now())).toISOString(),
  };
}

router.get("/deposits", async (req, res) => {
  const user = await getOrCreateCurrentUserStrict(req);
  await ensureDepositsTelegramMessageColumn();
  await syncPendingShamCashDepositsForUser(user.id);
  const status = typeof req.query.status === "string" ? req.query.status.trim() : undefined;
  const method = typeof req.query.method === "string" ? req.query.method.trim() : undefined;
  const conds = [eq(depositsTable.userId, user.id)];

  // فلترة الحالة - استبعاد "all" والقيم الفارغة بشكل صريح
  if (status && typeof status === "string" && status !== "all" && status !== "") {
    const s = status.toLowerCase();
    if (s === "approved" || s === "accept" || s === "completed") {
      conds.push(or(eq(depositsTable.status, "approved"), eq(depositsTable.status, "accept"), eq(depositsTable.status, "completed")));
    } else if (s === "rejected" || s === "reject" || s === "cancelled" || s === "expired") {
      conds.push(or(eq(depositsTable.status, "rejected"), eq(depositsTable.status, "reject"), eq(depositsTable.status, "cancelled"), eq(depositsTable.status, "expired"), eq(depositsTable.status, "failed")));
    } else if (s === "pending" || s === "wait") {
      conds.push(or(eq(depositsTable.status, "pending"), eq(depositsTable.status, "wait")));
    } else {
      conds.push(eq(depositsTable.status, status));
    }
  }

  if (method && typeof method === "string" && method !== "all" && method !== "") {
    conds.push(eq(depositsTable.method, method));
  }

  const rows = await db
    .select()
    .from(depositsTable)
    .where(and(...conds))
    .orderBy(desc(depositsTable.createdAt));
  res.json(ListMyDepositsResponse.parse(rows.map(rowToDeposit)));
});

router.get("/deposits/summary", async (_req, res) => {
  const user = await getOrCreateCurrentUserStrict(_req);
  await ensureDepositsTelegramMessageColumn();
  await syncPendingShamCashDepositsForUser(user.id);
  const all = await db
    .select({
      total: sql<number>`coalesce(sum(case when status in ('approved', 'accept', 'completed') then amount_usd else 0 end), 0)::float`,
      pendingCount: sql<number>`count(*) filter (where status in ('pending', 'wait'))::int`,
      approvedCount: sql<number>`count(*) filter (where status in ('approved', 'accept', 'completed'))::int`,
      totalCount: sql<number>`count(*)::int`,
    })
    .from(depositsTable)
    .where(eq(depositsTable.userId, user.id));
  const r = all[0]!;
  res.json(
    GetDepositsSummaryResponse.parse({
      totalApprovedUsd: Number(r.total),
      pendingCount: r.pendingCount,
      approvedCount: r.approvedCount,
      totalCount: r.totalCount,
    }),
  );
});

router.get("/deposits/shamcash/invoice/:invoiceId", async (req, res) => {
  try {
    const user = await getOrCreateCurrentUserStrict(req);
    await ensureDepositsTelegramMessageColumn();
    const invoiceId = String(req.params.invoiceId || "").trim();
    if (!invoiceId) {
      res.status(400).json({ error: "invoiceId is required" });
      return;
    }

    const [dep] = await db
      .select()
      .from(depositsTable)
      .where(and(eq(depositsTable.userId, user.id), eq(depositsTable.transactionId, invoiceId)))
      .limit(1);

    if (!dep) {
      res.status(404).json({ error: "deposit_not_found_for_invoice" });
      return;
    }

    const syncRes = await syncShamCashInvoiceStatus(invoiceId, true);

    // Refresh dep from DB in case status changed during sync
    const [refreshedDep] = await db
      .select()
      .from(depositsTable)
      .where(eq(depositsTable.id, dep.id))
      .limit(1);

    const currentDep = refreshedDep || dep;

    res.json({
      ok: true,
      invoiceId,
      depositId: currentDep.id,
      status: currentDep.status, // "pending" | "approved" | "rejected"
      amountUsd: Number(currentDep.amountUsd),
      amountSyp: currentDep.amountSyp != null ? Number(currentDep.amountSyp) : null,
      currency: currentDep.currency,
      createdAt: currentDep.createdAt,
      syncedStatus: syncRes.status,
    });
  } catch (error: any) {
    console.error("ShamCash invoice query failed:", error);
    res.status(500).json({ error: error?.message || "invoice_query_failed" });
  }
});

router.post("/deposits/shamcash/:invoiceId/sync", async (req, res) => {
  try {
    const user = await getOrCreateCurrentUserStrict(req);
    await ensureDepositsTelegramMessageColumn();
    const invoiceId = String(req.params.invoiceId || "").trim();
    if (!invoiceId) {
      res.status(400).json({ error: "invoiceId is required" });
      return;
    }

    const [dep] = await db
      .select()
      .from(depositsTable)
      .where(and(eq(depositsTable.userId, user.id), eq(depositsTable.transactionId, invoiceId)))
      .limit(1);
    if (!dep) {
      res.status(404).json({ error: "deposit_not_found_for_invoice" });
      return;
    }

    const result = await syncShamCashInvoiceStatus(invoiceId, true);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("ShamCash manual sync failed:", error);
    res.status(500).json({ error: error?.message || "sync_failed" });
  }
});

router.post("/deposits", async (req, res) => {
  await ensureDepositsTelegramMessageColumn();
  const body = CreateDepositBody.parse(req.body);
  const transactionId = String(body.transactionId || "").trim();
  if (!/^\d+$/.test(transactionId)) {
    res.status(400).json({ error: "رقم العملية يجب أن يحتوي على أرقام فقط" });
    return;
  }
  const proofImage =
    typeof (req.body as any)?.proofImage === "string" && (req.body as any).proofImage.trim().length > 0
      ? String((req.body as any).proofImage)
      : null;
  const user = await getOrCreateCurrentUserStrict(req);
  const m = (await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.code, body.method)).limit(1))[0];
  const methodLabel = m?.name ?? body.method;
  const amountUsd =
    body.currency === "USD" ? body.amount : body.amount / 119;
  const amountSyp = body.currency === "SYP" ? body.amount : body.amount * 119;
  const inserted = await db
    .insert(depositsTable)
    .values({
      userId: user.id,
      amountUsd: String(amountUsd.toFixed(4)),
      amountSyp: String(amountSyp.toFixed(2)),
      currency: body.currency,
      method: body.method,
      methodLabel,
      transactionId,
      status: "pending",
    })
    .returning();
  const dep = inserted[0]!;
  try {
    await notifyAdminsAboutDeposit({
      depositId: dep.id,
      amount: body.amount,
      currency: body.currency,
      telegramId: user.telegramId,
      username: user.username,
      transactionId,
      proofImage,
    });
    const pendingMessageId = await notifyUserDepositPending({
      telegramId: user.telegramId,
      operationNumber: String(dep.id),
      amount: body.amount,
      currency: body.currency,
    });
    if (pendingMessageId) {
      await db
        .update(depositsTable)
        .set({ telegramMessageId: pendingMessageId })
        .where(eq(depositsTable.id, dep.id));
    }
  } catch (error) {
    console.error("Notify admins about deposit failed:", error);
  }
  res.json(CreateDepositResponse.parse(rowToDeposit(dep)));
});

async function authenticate(req: any, res: any, next: any) {
  try {
    console.log("[Auth] Authenticating deposit request...");
    const bodyIdentity = {
      telegramId: String(req.body?.telegramId || "").trim(),
      telegramUsername: String(req.body?.telegramUsername || "").trim(),
      telegramFirstName: String(req.body?.telegramFirstName || "").trim(),
      telegramLastName: String(req.body?.telegramLastName || "").trim(),
      telegramInitData: String(req.body?.telegramInitData || "").trim(),
      tgWebAppData: String(req.body?.tgWebAppData || "").trim(),
    };

    const reqWithFallbackHeaders: any = {
      ...req,
      headers: {
        ...req.headers,
        ...(req.headers["x-telegram-id"] ? {} : (bodyIdentity.telegramId ? { "x-telegram-id": bodyIdentity.telegramId } : {})),
        ...(req.headers["x-telegram-username"] ? {} : (bodyIdentity.telegramUsername ? { "x-telegram-username": bodyIdentity.telegramUsername } : {})),
        ...(req.headers["x-telegram-first-name"] ? {} : (bodyIdentity.telegramFirstName ? { "x-telegram-first-name": bodyIdentity.telegramFirstName } : {})),
        ...(req.headers["x-telegram-last-name"] ? {} : (bodyIdentity.telegramLastName ? { "x-telegram-last-name": bodyIdentity.telegramLastName } : {})),
        ...(req.headers["x-telegram-init-data"] ? {} : (bodyIdentity.telegramInitData || bodyIdentity.tgWebAppData ? { "x-telegram-init-data": bodyIdentity.telegramInitData || bodyIdentity.tgWebAppData } : {})),
      },
    };

    const user = await getOrCreateCurrentUserStrict(reqWithFallbackHeaders);
    if (!user) {
      console.warn("[Auth] ⚠️ User authentication returned empty user");
      return res.status(401).json({ error: "غير مصرح", message: "يجب تسجيل الدخول أولاً" });
    }
    console.log("[Auth] ✅ User authenticated:", user.id, `(${user.username || user.telegramId})`);
    req.user = user;
    next();
  } catch (err: any) {
    console.error("[Auth] ❌ User authentication failed:", err.message);
    return res.status(401).json({ error: "غير مصرح", message: "فشل التحقق من هوية المستخدم" });
  }
}

async function handleShamCashInvoiceCreate(req: any, res: any) {
  try {
    await ensureDepositsTelegramMessageColumn();
    const { amount, currency } = req.body;
    const user = (req as any).user || (await getOrCreateCurrentUserStrict(req));
    const userId = user.id;

    console.log("[API] 📝 Received invoice request:", { userId, amount, currency });

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "المبلغ غير صالح", message: "المبلغ غير صالح" });
    }

    const result = await createShamCashInvoice({
      amount: Number(amount),
      currency: currency || "USD",
      userId,
    });

    console.log("[API] ✅ Invoice created successfully:", result.invoiceId);

    // Record the deposit in DB for verification & history
    let depositId: number | undefined;
    try {
      const numAmount = Number(amount);
      const curr = (currency || "USD").toUpperCase();
      const amountUsd = curr === "USD" ? numAmount : numAmount / 119;
      const amountSyp = curr === "SYP" ? numAmount : numAmount * 119;

      const [methodRow] = await db
        .select()
        .from(paymentMethodsTable)
        .where(eq(paymentMethodsTable.code, "sham_cash_auto"))
        .limit(1);

      const [dep] = await db
        .insert(depositsTable)
        .values({
          userId,
          amountUsd: String(amountUsd.toFixed(4)),
          amountSyp: String(amountSyp.toFixed(2)),
          currency: curr,
          method: "sham_cash_auto",
          methodLabel: methodRow?.name || "شام كاش تلقائي",
          transactionId: String(result.invoiceId),
          status: "pending",
        })
        .returning();

      depositId = dep?.id;

      if (depositId) {
        try {
          const pendingMessageId = await notifyUserDepositPending({
            telegramId: user.telegramId,
            operationNumber: String(result.invoiceId),
            amount: numAmount,
            currency: curr as "USD" | "SYP",
          });
          if (pendingMessageId) {
            await db
              .update(depositsTable)
              .set({ telegramMessageId: pendingMessageId })
              .where(eq(depositsTable.id, depositId));
          }
        } catch (notifyErr: any) {
          console.error("[API] ⚠️ notifyUserDepositPending failed:", notifyErr.message);
        }
      }
    } catch (dbErr: any) {
      console.error("[API] ⚠️ DB insert deposit record failed:", dbErr.message);
    }

    return res.json({
      success: true,
      ok: true,
      invoiceId: result.invoiceId,
      depositId,
      paymentUrl: result.paymentUrl,
      walletAddress: result.walletAddress,
      expiresAt: result.expiresAt,
      amount: result.amount,
      currency: result.currency,
    });
  } catch (error: any) {
    console.error("[API] ❌ Invoice creation failed:", error.message);
    return res.status(500).json({
      error: error.message || "حدث خطأ أثناء فتح الفاتورة، يرجى المحاولة لاحقاً",
      message: error.message || "حدث خطأ أثناء فتح الفاتورة، يرجى المحاولة لاحقاً",
      success: false,
      ok: false,
    });
  }
}

router.post("/deposits/shamcash/invoice", (req, res, next) => {
  console.log("========== [/deposits/shamcash/invoice] REQUEST RECEIVED ==========");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("Auth Header:", req.headers.authorization ? "present" : "MISSING");
  next();
}, authenticate, handleShamCashInvoiceCreate);

router.post("/deposit/shamcash/create-invoice", (req, res, next) => {
  console.log("========== [/deposit/shamcash/create-invoice] REQUEST RECEIVED ==========");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("Auth Header:", req.headers.authorization ? "present" : "MISSING");
  next();
}, authenticate, handleShamCashInvoiceCreate);

router.post("/deposits/shamcash/verify", async (req, res) => {
  try {
    await ensureDepositsTelegramMessageColumn();

    const user = await getOrCreateCurrentUserStrict(req);
    const invoiceId = String(req.body?.invoiceId || "").trim();
    const transactionRef = normalizeShamCashTransactionRef(req.body?.transactionRef);
    if (!invoiceId || !transactionRef) {
      res.status(400).json({ error: "invoiceId and transactionRef are required" });
      return;
    }

    // 1. فحص صحة تنسيق رقم العملية (بين 4 و100 محرف أبجدي رقمي)
    if (!isValidShamCashTransactionRef(transactionRef)) {
      res.status(400).json({
        ok: false,
        verified: false,
        message: "رقم العملية غير صالح. يجب أن يتكون من 4 إلى 100 خانة رقمية أو أبجدية.",
        code: "INVALID_TRANSACTION_REF",
      });
      return;
    }

    const [dep] = await db
      .select()
      .from(depositsTable)
      .where(and(eq(depositsTable.userId, user.id), eq(depositsTable.transactionId, invoiceId)))
      .limit(1);

    if (!dep) {
      res.status(404).json({ error: "deposit_not_found_for_invoice" });
      return;
    }

    if (dep.status === "approved") {
      res.json({ ok: true, verified: true, alreadyProcessed: true, message: "تم شحن هذا الإيداع وتأكيده مسبقًا" });
      return;
    }

    // الشرط 1: transactionRef لم يُستخدم في فاتورة أو إيداع آخر معتمد
    const existingRef = await db
      .select()
      .from(depositsTable)
      .where(
        and(
          eq(depositsTable.transactionRef, transactionRef),
          ne(depositsTable.id, dep.id),
          eq(depositsTable.status, "approved")
        )
      )
      .limit(1);

    if (existingRef.length > 0) {
      logger.warn(
        {
          depositId: dep.id,
          ref: transactionRef,
          existingDepositId: existingRef[0].id,
        },
        "⚠️ transactionRef already used in another approved deposit"
      );
      res.status(409).json({
        ok: false,
        verified: false,
        reason: "ref_already_used",
        code: "TRANSACTION_REF_ALREADY_USED",
        message: "رقم العملية غير صالح أو تم استخدامه مسبقًا في عملية أخرى.",
      });
      return;
    }

    if (await isShamCashTransactionRefUsed(transactionRef)) {
      logger.warn(
        {
          depositId: dep.id,
          ref: transactionRef,
        },
        "⚠️ transactionRef already used in shamcash_used_transaction_refs"
      );
      res.status(409).json({
        ok: false,
        verified: false,
        reason: "ref_already_used",
        code: "TRANSACTION_REF_ALREADY_USED",
        message: "رقم العملية غير صالح أو تم استخدامه مسبقًا في عملية أخرى.",
      });
      return;
    }

    const dbSettings = await getShamCashSettings().catch(() => null);
    const apiBaseUrl = (
      dbSettings?.apiBaseUrl ||
      process.env.SAM_API_BASE_URL ||
      "https://www.sam-api.pro/api"
    ).replace(/\/+$/, "");

    // الإصلاح 1: Verify URL الصحيح (https://www.sam-api.pro/api/pay/{id}/verify) بدون Authorization header
    const verifyUrl = `${apiBaseUrl}/pay/${encodeURIComponent(invoiceId)}/verify`;
    const verifyBody = { transactionRef: String(transactionRef) };

    console.log("[ShamCash Verify] 📤 URL:", verifyUrl);
    console.log("[ShamCash Verify] 📤 Body:", JSON.stringify(verifyBody));

    let verifyResp: Response | null = null;
    let verifyJson: any = {};
    let responseText = "";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          // ملاحظة مهمة: الوثائق تنص على أن هذا الـ endpoint لا يتطلب أي مصادقة (No Authorization header)
        },
        body: JSON.stringify(verifyBody),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      verifyResp = resp;
      responseText = await resp.text();
      console.log("[ShamCash Verify] 📥 Status:", resp.status);
      console.log("[ShamCash Verify] 📥 Body:", responseText);

      try {
        verifyJson = JSON.parse(responseText);
      } catch {
        verifyJson = {};
      }
    } catch (fetchErr: any) {
      console.error("[ShamCash Verify] ❌ Network/Fetch error:", fetchErr.message);
    }

    // الإصلاح 3: معالجة 410 (EXPIRED) بحكمة — الفحص عبر GET قبل الرفض لاحتمال السداد في آخر لحظة
    if (verifyResp?.status === 410) {
      logger.warn({ invoiceId }, "[ShamCash Verify] 410 EXPIRED received from verify endpoint — checking GET for late payment");
      try {
        const checkResp = await fetch(
          `${apiBaseUrl}/pay/${encodeURIComponent(invoiceId)}`,
          { headers: { Accept: "application/json" } }
        );
        if (checkResp.ok) {
          const checkData: any = await checkResp.json().catch(() => ({}));
          const checkStatus = String(checkData?.status || "").toLowerCase().trim();

          // إذا كانت الفاتورة مدفوعة ولديها تاريخ سداد paidAt
          if (checkStatus === "paid" && checkData?.paidAt) {
            // الشرط 2: مطابقة المبلغ والعملة
            const paidAmount = Number(checkData?.amount || 0);
            const paidCurrency = String(checkData?.currency || "").toUpperCase();
            const expectedAmount = Number(dep.currency === "SYP" ? (dep.amountSyp || dep.amountUsd) : dep.amountUsd);
            const expectedCurrency = String(dep.currency || "USD").toUpperCase();

            if (paidAmount > 0 && expectedAmount > 0) {
              const tolerance = 0.01;
              const amountMatches = Math.abs(paidAmount - expectedAmount) / expectedAmount <= tolerance;
              if (!amountMatches) {
                logger.error({
                  depositId: dep.id,
                  expected: expectedAmount,
                  paid: paidAmount,
                  diff: paidAmount - expectedAmount,
                }, "🚨 Amount mismatch in 410 late payment check");
                res.status(400).json({
                  ok: false,
                  verified: false,
                  reason: "amount_mismatch",
                  message: "المبلغ المدفوع لا يطابق قيمة الإيداع المطلوبة",
                });
                return;
              }
            }

            if (paidCurrency && expectedCurrency && paidCurrency !== expectedCurrency) {
              logger.error({ depositId: dep.id, expectedCurrency, paidCurrency }, "🚨 Currency mismatch in 410 check");
              res.status(400).json({
                ok: false,
                verified: false,
                reason: "currency_mismatch",
                message: "عملة الحوالة لا تطابق عملة الإيداع",
              });
              return;
            }

            // الشرط 3: الاعتماد الذري (Atomic Idempotency)
            const atomicRes = await approveShamCashDepositAtomic({
              depositId: dep.id,
              transactionRef,
              invoiceId,
              approvedVia: "verify_late_410",
              verifyData: checkData,
            });

            if (!atomicRes.success) {
              if (atomicRes.error === "duplicate_ref" || atomicRes.error === "ref_already_used") {
                res.status(409).json({
                  ok: false,
                  verified: false,
                  message: atomicRes.message,
                  code: "TRANSACTION_REF_ALREADY_USED",
                });
                return;
              }
              res.status(400).json({
                ok: false,
                verified: false,
                message: (atomicRes as any).message || "فشلت عملية التحقق",
              });
              return;
            }

            res.json({
              ok: true,
              verified: true,
              alreadyProcessed: atomicRes.alreadyProcessed,
              message: "تم التحقق من الدفع المتأخر وشحن الرصيد بنجاح",
            });
            return;
          }
        }
      } catch (checkErr: any) {
        logger.warn({ invoiceId, err: checkErr?.message }, "[ShamCash Verify] Failed GET check after 410");
      }

      // إذا لم تكن الفاتورة مدفوعة -> رفض الإيداع
      logger.warn({ invoiceId }, "410 EXPIRED - no payment found, marking deposit rejected");
      await applyDepositStatusChangeAuto(dep.id, "rejected");
      res.status(410).json({
        ok: false,
        verified: false,
        code: "INVOICE_EXPIRED",
        message: "انتهت صلاحية الفاتورة ولم يتم العثور على دفعة مكتملة.",
      });
      return;
    }

    // النجاح عند استدعاء نقطة التحقق (200 OK + verified: true)
    if (verifyResp?.ok && verifyJson?.verified === true) {
      // الشرط 2: paidAmount و currency يطابقان الفاتورة
      const verifyData = verifyJson?.data || verifyJson;
      const paidAmount = Number(verifyData.paidAmount ?? verifyData.amount ?? 0);
      const paidCurrency = String(verifyData.currency || "").toUpperCase();

      const expectedAmount = Number(dep.currency === "SYP" ? (dep.amountSyp || dep.amountUsd) : dep.amountUsd);
      const expectedCurrency = String(dep.currency || "USD").toUpperCase();

      // التسامح: 1% لفرق العمولة
      if (paidAmount > 0 && expectedAmount > 0) {
        const tolerance = 0.01;
        const amountMatches = Math.abs(paidAmount - expectedAmount) / expectedAmount <= tolerance;
        if (!amountMatches) {
          logger.error({
            depositId: dep.id,
            expected: expectedAmount,
            paid: paidAmount,
            diff: paidAmount - expectedAmount,
          }, "🚨 Amount mismatch in verify");
          res.status(400).json({
            ok: false,
            verified: false,
            reason: "amount_mismatch",
            message: "المبلغ المدفوع لا يطابق قيمة الإيداع المطلوبة",
          });
          return;
        }
      }

      if (paidCurrency && expectedCurrency && paidCurrency !== expectedCurrency) {
        logger.error({
          depositId: dep.id,
          expectedCurrency,
          paidCurrency,
        }, "🚨 Currency mismatch in verify");
        res.status(400).json({
          ok: false,
          verified: false,
          reason: "currency_mismatch",
          message: "عملة الحوالة لا تطابق عملة الإيداع",
        });
        return;
      }

      // الشرط 3: الاعتماد الذري (Atomic Idempotency)
      const atomicRes = await approveShamCashDepositAtomic({
        depositId: dep.id,
        transactionRef,
        invoiceId,
        approvedVia: "verify",
        verifyData,
      });

      if (!atomicRes.success) {
        if (atomicRes.error === "duplicate_ref" || atomicRes.error === "ref_already_used") {
          res.status(409).json({
            ok: false,
            verified: false,
            message: atomicRes.message,
            code: "TRANSACTION_REF_ALREADY_USED",
          });
          return;
        }
        res.status(400).json({
          ok: false,
          verified: false,
          message: (atomicRes as any).message || "فشلت عملية التحقق",
        });
        return;
      }

      res.json({
        ok: true,
        verified: true,
        alreadyProcessed: atomicRes.alreadyProcessed,
        message: verifyJson?.message || "تم التحقق من الدفع وشحن الرصيد بنجاح",
      });
      return;
    }

    // إذا أرجع المزود صراحة عدم التحقق أو رسالة خطأ (مثال: 422 مع { verified: false, message: ... })
    if (verifyJson?.verified === false || verifyJson?.message) {
      res.status(400).json({
        ok: false,
        verified: false,
        message: verifyJson.message || "رقم العملية غير موجود في سجل المحفظة",
        code: verifyJson.code || "VERIFY_FAILED",
      });
      return;
    }

    // Fallback: فحص سجل الحوالات الواردة مع تطبيق الشروط الثلاثة
    const fallbackTx = await findIncomingShamCashTransactionByRef(
      SAM_SHAMCASH_IDENTIFIER,
      transactionRef,
    );
    if (fallbackTx.found) {
      const depExpectedAmount = Number(dep.currency === "SYP" ? (dep.amountSyp || dep.amountUsd) : dep.amountUsd);
      const txAmount = Number(fallbackTx.amount || 0);
      const txCurrency = String(fallbackTx.currency || "").toUpperCase();
      const expectedCurrency = String(dep.currency || "USD").toUpperCase();
      const sameCurrency = !txCurrency || txCurrency === expectedCurrency;

      const tolerance = 0.01;
      const amountMatches =
        Number.isFinite(depExpectedAmount) &&
        Number.isFinite(txAmount) &&
        (txAmount >= depExpectedAmount || (depExpectedAmount > 0 && Math.abs(txAmount - depExpectedAmount) / depExpectedAmount <= tolerance));

      if (sameCurrency && amountMatches) {
        const atomicRes = await approveShamCashDepositAtomic({
          depositId: dep.id,
          transactionRef,
          invoiceId,
          approvedVia: "transactions_fallback",
          verifyData: { amount: fallbackTx.amount, currency: fallbackTx.currency },
        });

        if (!atomicRes.success) {
          if (atomicRes.error === "duplicate_ref" || atomicRes.error === "ref_already_used") {
            res.status(409).json({
              ok: false,
              verified: false,
              message: atomicRes.message,
              code: "TRANSACTION_REF_ALREADY_USED",
            });
            return;
          }
          res.status(400).json({
            ok: false,
            verified: false,
            message: (atomicRes as any).message || "فشلت عملية التحقق",
          });
          return;
        }

        res.json({
          ok: true,
          verified: true,
          alreadyProcessed: atomicRes.alreadyProcessed,
          message: "تم التحقق من العملية عبر سجل معاملات شام كاش وإضافة الرصيد.",
          via: "transactions_fallback",
        });
        return;
      }
    }

    res.status(400).json({
      ok: false,
      verified: false,
      message: !verifyResp
        ? "تعذر الوصول إلى مزود التحقق حالياً. حاول مرة أخرى بعد قليل."
        : (verifyJson?.message || "تعذر التحقق من رقم العملية. تأكد من الرقم وحاول مجددًا."),
      code: verifyJson?.code || (!verifyResp ? "VERIFY_UPSTREAM_UNREACHABLE" : null),
      upstreamStatus: verifyResp?.status || null,
    });
  } catch (error: any) {
    console.error("ShamCash verify failed:", error);
    res.status(500).json({ error: error?.message || "verify_failed" });
  }
});

function safeTimingEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function handleShamCashWebhook(req: any, res: any) {
  try {
    await ensureDepositsTelegramMessageColumn();

    // P0-4: Fail-closed secret verification strictly from header
    const configuredSecret = process.env.SAM_WEBHOOK_SECRET || SAM_WEBHOOK_SECRET;
    const secretHeader = String(req.headers["x-webhook-secret"] || "");

    if (!configuredSecret || !secretHeader || !safeTimingEqual(secretHeader, configuredSecret)) {
      res.status(401).json({ error: "invalid_webhook_secret" });
      return;
    }

    const event = String(req.body?.event || "");
    const invoiceId = String(req.body?.invoiceId || "").trim();
    if (!invoiceId) {
      res.status(400).json({ error: "invoiceId is required" });
      return;
    }

    const [dep] = await db
      .select()
      .from(depositsTable)
      .where(eq(depositsTable.transactionId, invoiceId))
      .limit(1);

    if (!dep) {
      res.status(200).json({ ok: true, ignored: "deposit_not_found" });
      return;
    }

    if (event === "invoice.paid") {
      // P0-4: اعتماده فقط إذا كانت حالته pending
      if (dep.status !== "pending") {
        res.status(200).json({ ok: true, ignored: "deposit_already_processed", currentStatus: dep.status });
        return;
      }

      // P0-4: تحقق من المبلغ والعملة مقابل الإيداع (بهامش 1% تفاوت عمولة)
      const valCheck = validateDepositAmountAndCurrency(dep, req.body);
      if (!valCheck.valid) {
        logger.error({ invoiceId, reason: valCheck.reason }, "🚨 Webhook amount or currency mismatch");
        res.status(400).json({ error: valCheck.reason });
        return;
      }

      const transactionRef = normalizeShamCashTransactionRef(req.body?.transactionRef);

      // إذا وُجد transactionRef: فحص سريع أولي لمنع التكرار
      if (transactionRef && (await isShamCashTransactionRefUsed(transactionRef))) {
        if (dep.status === "pending") {
          await applyDepositStatusChangeAuto(dep.id, "rejected");
        }
        res.status(200).json({ ok: true, ignored: "transaction_ref_already_used" });
        return;
      }

      const atomicRes = await approveShamCashDepositAtomic({
        depositId: dep.id,
        transactionRef: transactionRef || null,
        invoiceId,
        approvedVia: "webhook",
        verifyData: req.body,
      });

      if (!atomicRes.success) {
        if (atomicRes.error === "duplicate_ref") {
          if (dep.status === "pending") {
            await applyDepositStatusChangeAuto(dep.id, "rejected");
          }
          res.status(200).json({ ok: true, ignored: "transaction_ref_already_used" });
          return;
        }
        res.status(400).json({ error: (atomicRes as any).message || "approval_failed" });
        return;
      }

      res.status(200).json({ ok: true, status: "approved" });
      return;
    }

    if (event === "invoice.expired") {
      if (dep.status === "pending") {
        await applyDepositStatusChangeAuto(dep.id, "rejected");
      }
      res.status(200).json({ ok: true, status: "expired" });
      return;
    }

    res.status(200).json({ ok: true, ignored: "unsupported_event" });
  } catch (error: any) {
    console.error("ShamCash webhook failed:", error);
    res.status(500).json({ error: error?.message || "webhook_failed" });
  }
}

router.post("/webhooks/shamcash", handleShamCashWebhook);

// ==========================================
// 🚀 Binance Pay Deposit Endpoints
// ==========================================

// 1. POST /deposits/binance/create
router.post("/deposits/binance/create", async (req, res) => {
  try {
    await ensureDepositsTelegramMessageColumn();
    const user = await getOrCreateCurrentUserStrict(req);
    const amount = Number(req.body?.amount);
    const currency = String(req.body?.currency || "USDT").toUpperCase();

    if (!amount || isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: "المبلغ غير صالح" });
      return;
    }

    const [methodRow] = await db
      .select()
      .from(paymentMethodsTable)
      .where(eq(paymentMethodsTable.code, "binance_pay"))
      .limit(1);

    const methodLabel = methodRow?.name || "Binance Pay";
    // USDT is equivalent to USD
    const amountUsd = currency === "SYP" ? amount / 119 : amount;
    const amountSyp = currency === "SYP" ? amount : amount * 119;
    const tempTxId = `BINANCE_PENDING_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const [inserted] = await db
      .insert(depositsTable)
      .values({
        userId: user.id,
        amountUsd: String(amountUsd.toFixed(4)),
        amountSyp: String(amountSyp.toFixed(2)),
        currency,
        method: "binance_pay",
        methodLabel,
        transactionId: tempTxId,
        status: "pending",
      })
      .returning();

    res.json({
      success: true,
      depositId: inserted.id,
      invoiceId: inserted.id,
      amountUsd: Number(inserted.amountUsd),
      currency: inserted.currency,
      status: inserted.status,
    });
  } catch (error: any) {
    console.error("Binance pay deposit create error:", error);
    res.status(500).json({ error: error?.message || "فشل إنشاء سجل إيداع بينانس" });
  }
});

// 2. POST /deposits/binance/submit-ref
router.post("/deposits/binance/submit-ref", async (req, res) => {
  try {
    await ensureDepositsTelegramMessageColumn();
    const user = await getOrCreateCurrentUserStrict(req);
    const depositId = Number(req.body?.depositId);
    const transactionRef = String(req.body?.transactionRef || "").trim();

    if (!depositId || isNaN(depositId)) {
      res.status(400).json({ error: "معرف الإيداع غير صالح" });
      return;
    }

    if (!transactionRef) {
      res.status(400).json({ error: "يرجى إدخال رقم العملية" });
      return;
    }

    const [dep] = await db
      .select()
      .from(depositsTable)
      .where(and(eq(depositsTable.id, depositId), eq(depositsTable.userId, user.id)))
      .limit(1);

    if (!dep) {
      res.status(404).json({ error: "طلب الإيداع غير موجود" });
      return;
    }

    // Update transactionId with actual Binance transaction reference
    const [updated] = await db
      .update(depositsTable)
      .set({
        transactionId: transactionRef,
      })
      .where(eq(depositsTable.id, dep.id))
      .returning();

    // Notify admins via Telegram about this deposit request
    try {
      await notifyAdminsAboutDeposit({
        depositId: updated.id,
        amount: Number(updated.amountUsd),
        currency: updated.currency,
        telegramId: user.telegramId,
        username: user.username,
        transactionId: transactionRef,
      });

      const pendingMessageId = await notifyUserDepositPending({
        telegramId: user.telegramId,
        operationNumber: String(updated.id),
        amount: Number(updated.amountUsd),
        currency: updated.currency,
      });

      if (pendingMessageId) {
        await db
          .update(depositsTable)
          .set({ telegramMessageId: pendingMessageId })
          .where(eq(depositsTable.id, updated.id));
      }
    } catch (notifyErr) {
      console.error("Telegram notification error for Binance deposit:", notifyErr);
    }

    res.json({
      success: true,
      depositId: updated.id,
      status: updated.status,
    });
  } catch (error: any) {
    console.error("Binance pay submit-ref error:", error);
    res.status(500).json({ error: error?.message || "فشل إرسال رقم العملية" });
  }
});

// 3. GET /deposits/:id/status
router.get("/deposits/:id/status", async (req, res) => {
  try {
    const user = await getOrCreateCurrentUserStrict(req);
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      res.status(400).json({ error: "معرف غير صالح" });
      return;
    }

    const [dep] = await db
      .select()
      .from(depositsTable)
      .where(and(eq(depositsTable.id, id), eq(depositsTable.userId, user.id)))
      .limit(1);

    if (!dep) {
      res.status(404).json({ error: "الإيداع غير موجود" });
      return;
    }

    res.json({
      id: dep.id,
      status: dep.status, // "pending" | "approved" | "rejected"
      amountUsd: Number(dep.amountUsd),
      currency: dep.currency,
      transactionId: dep.transactionId,
      createdAt: dep.createdAt,
    });
  } catch (error: any) {
    console.error("Get deposit status error:", error);
    res.status(500).json({ error: error?.message || "فشل جلب حالة الإيداع" });
  }
});

export default router;
