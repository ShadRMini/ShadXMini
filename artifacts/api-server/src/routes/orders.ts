import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { db, categoriesTable, ordersTable, productsTable, providersTable, usersTable, vipMembershipsTable } from "@workspace/db";
import {
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderResponse,
  GetOrdersSummaryResponse,
  ListMyOrdersResponse,
} from "@workspace/api-zod";
import { getAdapter } from "../lib/adapter-registry";
import { getOrCreateCurrentUser, getOrCreateCurrentUserStrict } from "../lib/currentUser.js";
import {
  addUnitPrices,
  calculateVipDiscountedPrice,
  calculateVipFixedDiscount,
  decimalToScaled,
  multiplyUnitPriceByQuantity,
  validateRequestedQuantity,
  type QuantityType,
} from "../lib/pricing.js";
import { notifyUserOrderCreated, notifyUserOrderStatusChanged } from "../lib/telegram.js";
import {
  notifyUserOrderAccepted as notifyInternalOrderAccepted,
  notifyUserOrderRejected as notifyInternalOrderRejected,
} from "../lib/notifications.js";
import { updateUserVipLevel } from "../lib/vipHelper.js";

const router: IRouter = Router();

class ValidationError extends Error {
  statusCode = 400;
}

const USD_SCALE = 12;
const USD_FACTOR = 10n ** BigInt(USD_SCALE);

function decimalToScaledBigInt(value: unknown, scale = USD_SCALE): bigint {
  const raw = String(value ?? "0").trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new ValidationError("قيمة السعر غير صالحة");
  }

  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const fraction = fractionPart.padEnd(scale, "0").slice(0, scale);
  const scaled = BigInt(wholePart || "0") * (10n ** BigInt(scale)) + BigInt(fraction || "0");
  return negative ? -scaled : scaled;
}

function scaledBigIntToDecimalString(value: bigint, scale = USD_SCALE): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const factor = 10n ** BigInt(scale);
  const whole = abs / factor;
  const fraction = (abs % factor).toString().padStart(scale, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

function addDecimalStrings(a: unknown, b: unknown): string {
  return scaledBigIntToDecimalString(decimalToScaledBigInt(a) + decimalToScaledBigInt(b));
}

function multiplyDecimalByQuantity(unitPrice: unknown, quantity: unknown): string {
  const priceScaled = decimalToScaledBigInt(unitPrice);
  const quantityScaled = decimalToScaledBigInt(quantity);
  return scaledBigIntToDecimalString((priceScaled * quantityScaled) / USD_FACTOR);
}

function resolveProductQuantityModel(product: typeof productsTable.$inferSelect): {
  quantityType: QuantityType;
  minQuantity: number;
  maxQuantity: number | null;
  quantityValues: unknown;
} {
  if (product.productType === "package") {
    return {
      quantityType: "fixed",
      minQuantity: 1,
      maxQuantity: 1,
      quantityValues: null,
    };
  }
  const oldMin = product.minQty != null ? Number(product.minQty) : 1;
  const oldMax = product.maxQty != null ? Number(product.maxQty) : null;
  const minQuantity = product.minQuantity ?? (Number.isFinite(oldMin) && oldMin > 0 ? Math.floor(oldMin) : 1);
  const maxQuantity = product.maxQuantity ?? (oldMax != null && Number.isFinite(oldMax) ? Math.floor(oldMax) : null);
  let quantityType = (product.quantityType || "fixed") as QuantityType;

  if (quantityType === "fixed" && maxQuantity != null && maxQuantity > minQuantity) {
    quantityType = "range";
  }

  return {
    quantityType,
    minQuantity,
    maxQuantity,
    quantityValues: product.quantityValues,
  };
}

function resolveFinalUnitPrice(product: typeof productsTable.$inferSelect): string {
  if (product.finalUnitPrice != null) return String(product.finalUnitPrice);

  const providerUnitPrice = product.providerUnitPrice ?? product.basePriceUsd ?? "0";
  const storeProfitPerUnit = product.storeProfitPerUnit ?? product.priceUsd ?? "0";
  return addUnitPrices(providerUnitPrice, storeProfitPerUnit);
}

function decimalGte(a: unknown, b: unknown): boolean {
  return decimalToScaledBigInt(a) >= decimalToScaledBigInt(b);
}

function normalizeProviderOrderStatus(status: string | null | undefined): "wait" | "accept" | "reject" {
  const normalized = String(status || "").trim().toLowerCase();
  if (["accept", "accepted", "ok", "success", "completed", "paid", "done"].includes(normalized)) {
    return "accept";
  }
  if (["reject", "rejected", "failed", "cancelled", "canceled", "error"].includes(normalized)) {
    return "reject";
  }
  return "wait";
}

function resolveProviderOrderStatus(result: { success?: boolean; status?: string; error?: string } | null | undefined): "wait" | "accept" | "reject" {
  if (!result) return "wait";
  const normalized = normalizeProviderOrderStatus(result.status);
  if (normalized === "accept") return "accept";
  if (normalized === "reject") return "reject";
  if (result.status === "wait") return "wait";
  if (result.success === false && result.status === "reject") return "reject";
  return "wait";
}

function orderStatusMessage(status: "wait" | "accept" | "reject"): string {
  if (status === "accept") return "✅ تم الشراء وتنفيذ الطلب بنجاح.";
  if (status === "reject") return "❌ تم رفض الطلب من المزود وتم إرجاع المبلغ إلى رصيدك.";
  return "⏳ طلبك قيد الانتظار لدى المزود، سنخبرك تلقائياً عند تحديث الحالة.";
}

async function checkProviderOrderImmediately(args: {
  adapter: NonNullable<ReturnType<typeof getAdapter>>;
  provider: typeof providersTable.$inferSelect;
  providerOrderId?: string;
  orderUuid?: string;
}): Promise<{
  status: "wait" | "accept" | "reject";
  remoteStatus?: string;
  providerOrderId?: string;
  rawData?: any;
  replayApi?: any[];
} | null> {
  const providerOrderId = String(args.providerOrderId || "").trim();
  const orderUuid = String(args.orderUuid || "").trim();
  if ((!providerOrderId && !orderUuid) || !args.adapter.checkOrders || !args.provider.apiKey) return null;

  try {
    const checked = providerOrderId
      ? await args.adapter.checkOrders(args.provider.apiKey, args.provider.apiUrl || undefined, [providerOrderId])
      : await args.adapter.checkOrders(args.provider.apiKey, args.provider.apiUrl || undefined, [orderUuid], true);
    
    const remote = checked.orders.find((item) =>
      providerOrderId ? String(item.providerOrderId) === providerOrderId : true
    );
    if (!remote) return null;

    return {
      status: normalizeProviderOrderStatus(remote.status),
      remoteStatus: remote.status,
      providerOrderId: remote.providerOrderId,
      rawData: remote.rawData || null,
      replayApi: remote.replayApi || undefined,
    };
  } catch (error) {
    console.error(`Immediate provider order check failed for ${providerOrderId || orderUuid}:`, error);
    return null;
  }
}

async function refundRejectedOrderIfNeeded(args: {
  orderId: number;
  userId: number;
  totalUsd: string | number;
  meta: any;
}): Promise<any> {
  if (args.meta?.refund?.refundedAt) return args.meta;

  await db
    .update(usersTable)
    .set({
      balanceUsd: sql`${usersTable.balanceUsd} + ${String(args.totalUsd)}`,
      totalSpent: sql`GREATEST(0, ${usersTable.totalSpent} - ${String(args.totalUsd)})`,
    })
    .where(eq(usersTable.id, args.userId));

  updateUserVipLevel(args.userId).catch((err) => console.warn("[Auto VIP Update Warning]:", err));

  const nextMeta = {
    ...args.meta,
    refund: {
      refunded: true,
      refundedAt: new Date().toISOString(),
      amountUsd: String(args.totalUsd),
    },
  };

  await db.update(ordersTable).set({ meta: nextMeta }).where(eq(ordersTable.id, args.orderId));

  return nextMeta;
}

async function syncPendingProviderOrdersForUser(userId: number): Promise<void> {
  const pendingRows = await db
    .select({
      order: ordersTable,
      product: productsTable,
      provider: providersTable,
      user: usersTable,
    })
    .from(ordersTable)
    .innerJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .innerJoin(usersTable, eq(usersTable.id, ordersTable.userId))
    .leftJoin(providersTable, eq(providersTable.id, productsTable.providerId))
    .where(and(eq(ordersTable.userId, userId), eq(ordersTable.status, "wait")));

  for (const row of pendingRows) {
    const provider = (row as any)?.provider;
    const product = (row as any)?.product;
    const order = (row as any)?.order || ((row as any)?.productId ? row : null);
    const user = (row as any)?.user;
    if (!order) continue;
    const meta = (order.meta || {}) as any;
    const providerOrderId = String(meta?.provider?.providerOrderId || order.providerOrderId || "").trim();
    const orderUuid = String(order.providerOrderUuid || meta?.orderUuid || meta?.provider?.orderUuid || "").trim();

    // Cooldown: skip if checked less than 3 minutes ago
    const lastChecked = meta?.provider?.lastCheckedAt;
    if (lastChecked && (Date.now() - new Date(lastChecked).getTime()) < 3 * 60 * 1000) {
      continue;
    }

    if (!provider?.apiKey || (!providerOrderId && !orderUuid)) continue;

    const adapter = getAdapter((provider as any).providerType || "custom");
    if (!adapter?.checkOrders) continue;

    try {
      const check = providerOrderId
        ? await adapter.checkOrders(provider.apiKey, provider.apiUrl || undefined, [providerOrderId])
        : await adapter.checkOrders(provider.apiKey, provider.apiUrl || undefined, [orderUuid], true);

      const remote = check.orders.find((item) =>
        providerOrderId ? String(item.providerOrderId) === providerOrderId : true
      );

      const nowIso = new Date().toISOString();
      if (!remote) {
        let nextMeta = {
          ...meta,
          provider: {
            ...(meta?.provider || {}),
            lastCheckedAt: nowIso,
          },
        };
        await db.update(ordersTable).set({ meta: nextMeta }).where(eq(ordersTable.id, order.id));
        continue;
      }

      const nextStatus = normalizeProviderOrderStatus(remote.status);
      const foundProviderOrderId = remote.providerOrderId || providerOrderId;

      let nextMeta = {
        ...meta,
        provider: {
          ...(meta?.provider || {}),
          providerOrderId: foundProviderOrderId || meta?.provider?.providerOrderId,
          checkResponse: remote.rawData || null,
          replayApi: remote.replayApi || meta?.provider?.replayApi || null,
          status: remote.status,
          lastCheckedAt: nowIso,
        },
      };

      await db
        .update(ordersTable)
        .set({
          status: nextStatus,
          providerOrderId: foundProviderOrderId || order.providerOrderId || null,
          meta: nextMeta,
        })
        .where(eq(ordersTable.id, order.id));

      if (nextStatus === "reject") {
        nextMeta = await refundRejectedOrderIfNeeded({
          orderId: order.id,
          userId: user.id,
          totalUsd: String(order.totalUsd),
          meta: nextMeta,
        });
      }

      if (nextStatus !== "wait" && nextStatus !== order.status) {
        try {
          await notifyUserOrderStatusChanged({
            telegramId: user.telegramId,
            orderNumber: order.orderNumber,
            productName: product.name,
            status: nextStatus,
            note: orderStatusMessage(nextStatus),
          });

          if (nextStatus === "accept") {
            await notifyInternalOrderAccepted({
              userId: user.id,
              orderNumber: order.orderNumber,
              productName: product.name,
              totalUsd: order.totalUsd,
            });
          } else if (nextStatus === "reject") {
            await notifyInternalOrderRejected({
              userId: user.id,
              orderNumber: order.orderNumber,
              productName: product.name,
              totalUsd: order.totalUsd,
              note: orderStatusMessage(nextStatus),
            });
          }
        } catch (error) {
          console.error("Notify provider order status user failed:", error);
        }
      }
    } catch (error) {
      console.error(`Provider order sync failed for order ${order.id}:`, error);
      try {
        const nextMeta = {
          ...meta,
          provider: {
            ...(meta?.provider || {}),
            lastCheckedAt: new Date().toISOString(),
          },
        };
        await db.update(ordersTable).set({ meta: nextMeta }).where(eq(ordersTable.id, order.id));
      } catch {}
    }
  }
}

export async function syncAllPendingProviderOrders(): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  try {
    const pendingRows = await db
      .select({
        order: ordersTable,
        product: productsTable,
        provider: providersTable,
        user: usersTable,
      })
      .from(ordersTable)
      .innerJoin(productsTable, eq(productsTable.id, ordersTable.productId))
      .innerJoin(usersTable, eq(usersTable.id, ordersTable.userId))
      .leftJoin(providersTable, eq(providersTable.id, productsTable.providerId))
      .where(eq(ordersTable.status, "wait"))
      .orderBy(asc(ordersTable.createdAt))
      .limit(20);

    for (const row of pendingRows) {
      const provider = (row as any)?.provider;
      const product = (row as any)?.product;
      const order = (row as any)?.order || ((row as any)?.productId ? row : null);
      const user = (row as any)?.user;
      if (!order || !user) continue;

      const meta = (order.meta || {}) as any;
      const providerOrderId = String(meta?.provider?.providerOrderId || order.providerOrderId || "").trim();
      const orderUuid = String(order.providerOrderUuid || meta?.orderUuid || meta?.provider?.orderUuid || "").trim();

      // Cooldown: skip if checked less than 3 minutes ago
      const lastChecked = meta?.provider?.lastCheckedAt;
      if (lastChecked && (Date.now() - new Date(lastChecked).getTime()) < 3 * 60 * 1000) {
        continue;
      }

      if (!provider?.apiKey || (!providerOrderId && !orderUuid)) {
        continue;
      }

      const adapter = getAdapter((provider as any).providerType || "custom");
      if (!adapter?.checkOrders) continue;

      try {
        const check = providerOrderId
          ? await adapter.checkOrders(provider.apiKey, provider.apiUrl || undefined, [providerOrderId])
          : await adapter.checkOrders(provider.apiKey, provider.apiUrl || undefined, [orderUuid], true);

        const remote = check.orders.find((item) =>
          providerOrderId ? String(item.providerOrderId) === providerOrderId : true
        );

        const nowIso = new Date().toISOString();
        const orderCreatedAt = order.createdAt instanceof Date ? order.createdAt.getTime() : new Date(order.createdAt || Date.now()).getTime();
        const isStale = (Date.now() - orderCreatedAt > 24 * 60 * 60 * 1000);

        if (!remote) {
          let nextMeta = {
            ...meta,
            provider: {
              ...(meta?.provider || {}),
              lastCheckedAt: nowIso,
            },
          };
          if (isStale && !nextMeta.stale) {
            nextMeta.stale = true;
            nextMeta.staleSince = nowIso;
          }
          await db.update(ordersTable).set({ meta: nextMeta }).where(eq(ordersTable.id, order.id));
          continue;
        }

        const nextStatus = normalizeProviderOrderStatus(remote.status);
        const foundProviderOrderId = remote.providerOrderId || providerOrderId;

        let nextMeta = {
          ...meta,
          provider: {
            ...(meta?.provider || {}),
            providerOrderId: foundProviderOrderId || meta?.provider?.providerOrderId,
            checkResponse: remote.rawData || null,
            replayApi: remote.replayApi || meta?.provider?.replayApi || null,
            status: remote.status,
            lastCheckedAt: nowIso,
          },
        };

        if (isStale && !nextMeta.stale) {
          nextMeta.stale = true;
          nextMeta.staleSince = nowIso;
        }

        await db
          .update(ordersTable)
          .set({
            status: nextStatus,
            providerOrderId: foundProviderOrderId || order.providerOrderId || null,
            meta: nextMeta,
          })
          .where(eq(ordersTable.id, order.id));

        if (nextStatus === "reject") {
          nextMeta = await refundRejectedOrderIfNeeded({
            orderId: order.id,
            userId: user.id,
            totalUsd: String(order.totalUsd),
            meta: nextMeta,
          });
        }

        if (nextStatus !== "wait" && nextStatus !== order.status) {
          synced++;
          try {
            await notifyUserOrderStatusChanged({
              telegramId: user.telegramId,
              orderNumber: order.orderNumber,
              productName: product.name,
              status: nextStatus,
              note: orderStatusMessage(nextStatus),
            });

            if (nextStatus === "accept") {
              await notifyInternalOrderAccepted({
                userId: user.id,
                orderNumber: order.orderNumber,
                productName: product.name,
                totalUsd: order.totalUsd,
              });
            } else if (nextStatus === "reject") {
              await notifyInternalOrderRejected({
                userId: user.id,
                orderNumber: order.orderNumber,
                productName: product.name,
                totalUsd: order.totalUsd,
                note: orderStatusMessage(nextStatus),
              });
            }
          } catch (notifErr) {
            console.error("[Orders Sync] User notification error:", notifErr);
          }
        }
      } catch (orderErr) {
        errors++;
        console.error(`[Orders Sync] Error checking order #${order.id} (${order.orderNumber}):`, orderErr);
        try {
          const nextMeta = {
            ...meta,
            provider: {
              ...(meta?.provider || {}),
              lastCheckedAt: new Date().toISOString(),
            },
          };
          await db.update(ordersTable).set({ meta: nextMeta }).where(eq(ordersTable.id, order.id));
        } catch {}
      }
    }
  } catch (err) {
    console.error("[Orders Sync] Fatal error during syncAllPendingProviderOrders:", err);
    errors++;
  }

  return { synced, errors };
}

function rowToOrder(o: typeof ordersTable.$inferSelect, p: typeof productsTable.$inferSelect | null) {
  let mappedStatus: "wait" | "accept" | "reject" = "wait";
  const st = String(o.status || "").toLowerCase().trim();
  if (st === "accept" || st === "completed" || st === "approved") {
    mappedStatus = "accept";
  } else if (st === "reject" || st === "rejected" || st === "cancelled" || st === "failed") {
    mappedStatus = "reject";
  } else {
    mappedStatus = "wait";
  }

  return {
    id: String(o.id),
    orderNumber: o.orderNumber,
    productId: String(o.productId),
    productName: p?.name ?? "",
    productImage: p?.image ?? undefined,
    quantity: Number(o.quantity),
    userIdentifier: o.userIdentifier ?? undefined,
    totalUsd: Number(o.totalUsd),
    totalSyp: Number(o.totalSyp),
    status: mappedStatus,
    createdAt: (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt || Date.now())).toISOString(),
  };
}

router.get("/orders", async (req, res) => {
  const user = await getOrCreateCurrentUser(req);
  await syncPendingProviderOrdersForUser(user.id);
  const status = typeof req.query.status === "string" ? req.query.status.trim() : undefined;
  const conds = [eq(ordersTable.userId, user.id)];

  // فلترة الحالة - استبعاد "all" والقيم الفارغة بشكل صريح
  if (status && typeof status === "string" && status !== "all" && status !== "") {
    const s = status.toLowerCase();
    if (s === "accept" || s === "completed") {
      conds.push(or(eq(ordersTable.status, "accept"), eq(ordersTable.status, "completed"), eq(ordersTable.status, "approved")));
    } else if (s === "reject" || s === "rejected" || s === "cancelled") {
      conds.push(or(eq(ordersTable.status, "reject"), eq(ordersTable.status, "rejected"), eq(ordersTable.status, "cancelled"), eq(ordersTable.status, "failed")));
    } else if (s === "wait" || s === "pending") {
      conds.push(or(eq(ordersTable.status, "wait"), eq(ordersTable.status, "pending"), eq(ordersTable.status, "processing")));
    } else {
      conds.push(eq(ordersTable.status, status));
    }
  }

  const rows = await db
    .select({ o: ordersTable, p: productsTable })
    .from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .where(and(...conds))
    .orderBy(desc(ordersTable.createdAt));

  res.json(ListMyOrdersResponse.parse(rows.map((r: any) => rowToOrder(r.o || r, r.p || null))));
});

router.get("/orders/summary", async (req, res) => {
  const user = await getOrCreateCurrentUser(req);
  await syncPendingProviderOrdersForUser(user.id);
  const all = await db
    .select({
      total: sql<number>`coalesce(sum(case when status in ('accept', 'completed', 'approved') then total_usd else 0 end), 0)::float`,
      waitCount: sql<number>`count(*) filter (where status in ('wait', 'pending', 'processing'))::int`,
      acceptCount: sql<number>`count(*) filter (where status in ('accept', 'completed', 'approved'))::int`,
      totalCount: sql<number>`count(*)::int`,
    })
    .from(ordersTable)
    .where(eq(ordersTable.userId, user.id));
  const r = all[0]!;

  res.json(
    GetOrdersSummaryResponse.parse({
      totalAcceptedUsd: Number(r.total),
      waitCount: r.waitCount,
      acceptCount: r.acceptCount,
      totalCount: r.totalCount,
    }),
  );
});

router.get("/orders/:id", async (req, res) => {
  const user = await getOrCreateCurrentUser(req);
  await syncPendingProviderOrdersForUser(user.id);
  const id = Number(req.params.id);
  const rows = await db
    .select({ o: ordersTable, p: productsTable })
    .from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, user.id)))
    .limit(1);

  if (!rows.length) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  res.json(GetOrderResponse.parse(rowToOrder(rows[0]!.o, rows[0]!.p)));
});

// P0-5: In-memory Idempotency Store
const idempotencyStore = new Map<string, { timestamp: number; response: any }>();

function getCachedIdempotentResponse(key: string, userId: number): any | null {
  const compositeKey = `${userId}:${key}`;
  const cached = idempotencyStore.get(compositeKey);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > 10 * 60 * 1000) {
    idempotencyStore.delete(compositeKey);
    return null;
  }
  return cached.response;
}

function setCachedIdempotentResponse(key: string, userId: number, response: any): void {
  const compositeKey = `${userId}:${key}`;
  idempotencyStore.set(compositeKey, { timestamp: Date.now(), response });
  if (idempotencyStore.size > 5000) {
    const oldest = idempotencyStore.keys().next().value;
    if (oldest) idempotencyStore.delete(oldest);
  }
}

router.post("/orders", async (req, res) => {
  try {
    const idempotencyKey = String(
      req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || ""
    ).trim();

    const body = CreateOrderBody.parse(req.body);
    const user = await getOrCreateCurrentUserStrict(req);

    if (idempotencyKey) {
      const cached = getCachedIdempotentResponse(idempotencyKey, user.id);
      if (cached) {
        res.json(cached);
        return;
      }
    }

    const product = (
      await db.select().from(productsTable).where(eq(productsTable.id, Number(body.productId))).limit(1)
    )[0];

    if (!product) {
      res.status(404).json({ error: "product_not_found" });
      return;
    }

    if (body.quantity <= 0) {
      res.status(400).json({ error: "الكمية يجب أن تكون أكبر من صفر" });
      return;
    }

    const quantityModel = resolveProductQuantityModel(product);
    const quantityValidation = validateRequestedQuantity({
      ...quantityModel,
      requestedQuantity: body.quantity,
    });
    if (!quantityValidation.ok) {
      res.status(400).json({ error: quantityValidation.message, code: quantityValidation.code });
      return;
    }

    let providerOrderResult: {
      success: boolean;
      providerOrderId?: string;
      status?: string;
      price?: number;
      rawResponse?: any;
      replayApi?: any[];
      error?: string;
    } | null = null;

    let providerForOrder: typeof providersTable.$inferSelect | null = null;
    let adapterForOrder: ReturnType<typeof getAdapter> | null = null;
    let liveProviderUnitPrice: string | null = null;
    let providerAvailable: boolean | null = null;

    if (product.providerId) {
      const [provider] = await db
        .select()
        .from(providersTable)
        .where(eq(providersTable.id, product.providerId))
        .limit(1);

      if (!provider) {
        res.status(400).json({ error: "المزود غير موجود" });
        return;
      }

      const pType = String((provider as any).providerType || "custom").toLowerCase().trim();
      const adapter = getAdapter(pType);

      providerForOrder = provider;
      adapterForOrder = adapter;

      if (pType !== "custom" && pType !== "manual" && provider.apiKey && (product as any).providerProductId) {
        try {
          const providerProducts = await adapter.fetchProducts(provider.apiKey, provider.apiUrl || undefined);
          const providerProduct = providerProducts.find((p) => String(p.id) === String((product as any).providerProductId || ""));

          if (providerProduct) {
            liveProviderUnitPrice = String(providerProduct.price || "0");
            providerAvailable = !!providerProduct.available;
          }
        } catch (error) {
          console.error("Provider live price lookup failed:", error);
        }

        if (providerAvailable === false) {
          res.status(400).json({ error: "المنتج غير متوفر حالياً لدى المزود" });
          return;
        }
      }
    }

    const dashboardMarkupUsd = String(product.storeProfitPerUnit ?? product.priceUsd);
    const storedBaseCostUsd = String(product.providerUnitPrice ?? product.basePriceUsd ?? "0");
    const providerUnitPriceUsd = product.providerId ? liveProviderUnitPrice || storedBaseCostUsd : "0";
    const baseFinalUnitPriceUsd = resolveFinalUnitPrice(product);

    // Apply VIP Discount according to user's VIP level from vipMembershipsTable
    let userVipDiscountFixed = "0.00000000";
    const userVipLevelOrder = Number(user.vipLevel || 1);
    try {
      const [userLevel] = await db
        .select()
        .from(vipMembershipsTable)
        .where(
          or(
            eq(vipMembershipsTable.levelOrder, userVipLevelOrder),
            eq(vipMembershipsTable.id, userVipLevelOrder)
          )
        )
        .limit(1);

      if (userLevel) {
        userVipDiscountFixed = String(userLevel.discountFixedAmount || (userLevel as any).discount_fixed_amount || "0.00000000");
      }
    } catch (vipErr) {
      console.warn("[VIP Discount Lookup Warning]:", vipErr);
    }

    // Default fallback if database fixed discount is 0 or empty for standard levels
    if (decimalToScaled(userVipDiscountFixed) <= 0n) {
      if (userVipLevelOrder === 2) userVipDiscountFixed = "0.01000000";
      else if (userVipLevelOrder === 3) userVipDiscountFixed = "0.02000000";
      else if (userVipLevelOrder === 4) userVipDiscountFixed = "0.03000000";
      else if (userVipLevelOrder >= 5) userVipDiscountFixed = "0.04000000";
    }

    const {
      finalUnitPrice: finalUnitPriceUsd,
      appliedDiscount: unitDiscountUsd,
      discountFixedAmount: appliedVipDiscountFixed,
    } = calculateVipFixedDiscount(
      baseFinalUnitPriceUsd,
      providerUnitPriceUsd,
      userVipDiscountFixed
    );

    if (Number(unitDiscountUsd) > 0) {
      console.log(
        `[Pricing] User #${user.id} (VIP Level ${userVipLevelOrder}): Base $${baseFinalUnitPriceUsd}, Discount Fixed $${appliedVipDiscountFixed}, Final Unit $${finalUnitPriceUsd} (Provider Floor $${providerUnitPriceUsd})`
      );
    }

    const isPackage = product.productType === "package";
    const effectiveQuantity = isPackage ? 1 : body.quantity;

    const totalUsd = multiplyUnitPriceByQuantity(finalUnitPriceUsd, effectiveQuantity);
    const totalSyp = Number(product.priceSyp) * effectiveQuantity;
    const balanceBeforeUsd = String(user.balanceUsd);

    if (decimalToScaledBigInt(totalUsd) <= 0n) {
      res.status(400).json({ error: "سعر الطلب غير صالح" });
      return;
    }

    if (!decimalGte(balanceBeforeUsd, totalUsd)) {
      res.status(400).json({ error: "رصيدك غير كافٍ لإتمام الطلب" });
      return;
    }

    const orderNumber = `ID_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const orderUuid = randomUUID();

    // Resolve primary identifier (playerId/phone/identifier) from userIdentifier or customParams
    let resolvedIdentifier = body.userIdentifier?.trim() || "";
    if (!resolvedIdentifier && body.customParams && typeof body.customParams === "object") {
      const keys = Object.keys(body.customParams);
      const primaryKey = keys.find((k) => {
        const lower = k.toLowerCase();
        return (
          lower.includes("player") ||
          lower.includes("معرف") ||
          lower.includes("id") ||
          lower.includes("phone") ||
          lower.includes("هاتف") ||
          lower.includes("خط")
        );
      }) || keys[0];
      if (primaryKey && body.customParams[primaryKey]) {
        resolvedIdentifier = String(body.customParams[primaryKey]).trim();
      }
    }

    // Check if category or params requires an identifier
    let categoryName = "";
    if (product.categoryId) {
      const [cat] = await db
        .select({ name: categoriesTable.name })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, product.categoryId))
        .limit(1);
      categoryName = cat?.name || "";
    }

    let productParams: string[] = [];
    if (Array.isArray((product as any).params)) {
      productParams = (product as any).params;
    } else if (typeof (product as any).params === "string") {
      try {
        const parsed = JSON.parse((product as any).params);
        if (Array.isArray(parsed)) productParams = parsed;
      } catch {}
    }

    const categoryRequiresId = categoryName.match(/(العاب|التطبيقات|Games|Apps|PUBG|ببجي)/i);
    const requiresPlayerId = productParams.length > 0 || !!categoryRequiresId;

    if (requiresPlayerId && !resolvedIdentifier) {
      res.status(400).json({
        error: "معرّف الحساب (Player ID) مطلوب لإتمام الطلب",
        code: "PLAYER_ID_REQUIRED",
      });
      return;
    }

    const playerId = resolvedIdentifier || `user_${user.id}`;

    const baseMeta: any = {
      orderUuid,
      provider: {
        orderUuid,
      },
      pricing: {
        providerUnitPriceUsd,
        dashboardMarkupUsd,
        baseFinalUnitPriceUsd,
        finalUnitPriceUsd,
        unitDiscountUsd,
        vipLevel: userVipLevelOrder,
        vipDiscountFixed: appliedVipDiscountFixed,
        vipDiscountPercent: null,
      },
    };

    if (body.customParams && typeof body.customParams === "object" && Object.keys(body.customParams).length > 0) {
      baseMeta.customParams = body.customParams;
    }

    // P0-5: Step 1 & 2: Deduct balance in transaction BEFORE contacting provider
    // Using conditional atomic update (balanceUsd >= totalUsd) to prevent race conditions
    const deductionResult = await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(usersTable)
        .set({
          balanceUsd: sql`${usersTable.balanceUsd} - ${String(totalUsd)}`,
          totalSpent: sql`${usersTable.totalSpent} + ${String(totalUsd)}`,
        })
        .where(and(eq(usersTable.id, user.id), sql`${usersTable.balanceUsd} >= ${String(totalUsd)}`))
        .returning();

      if (!updatedUser) {
        return null;
      }

      const [createdOrder] = await tx
        .insert(ordersTable)
        .values({
          orderNumber,
          userId: user.id,
          productId: product.id,
          quantity: String(effectiveQuantity),
          userIdentifier: resolvedIdentifier || null,
          providerOrderUuid: orderUuid,
          totalUsd,
          totalSyp: String(totalSyp),
          status: "wait",
          meta: baseMeta,
        })
        .returning();

      return { updatedUser, order: createdOrder };
    });

    if (!deductionResult) {
      res.status(400).json({ error: "رصيدك غير كافٍ لإتمام الطلب" });
      return;
    }

    const o = deductionResult.order;

    // P0-5: Step 3: Contact provider ONLY after balance deduction succeeds
    if (product.providerId && providerForOrder && adapterForOrder) {
      try {
        providerOrderResult = await adapterForOrder.placeOrder(
          providerForOrder.apiKey!,
          providerForOrder.apiUrl || undefined,
          (product as any).providerProductId!,
          effectiveQuantity,
          playerId,
          orderUuid,
          body.customParams,
        );
      } catch (error: any) {
        console.error("Provider order error (timeout/network):", error);
        // CRITICAL: On network timeout/exception, do NOT reject immediately as the provider may have processed the order.
        // Keep status as "wait" and attempt immediate check by orderUuid.
        providerOrderResult = {
          success: false,
          status: "wait",
          error: error.message || "فشل الاتصال بالمزود، الطلب قيد المتابعة",
        };

        try {
          const timeoutCheck = await checkProviderOrderImmediately({
            adapter: adapterForOrder,
            provider: providerForOrder,
            orderUuid,
          });
          if (timeoutCheck) {
            providerOrderResult = {
              success: timeoutCheck.status === "accept" || timeoutCheck.status === "wait",
              providerOrderId: timeoutCheck.providerOrderId,
              status: timeoutCheck.status,
              rawResponse: timeoutCheck.rawData,
              replayApi: timeoutCheck.replayApi,
            };
          }
        } catch (checkErr) {
          console.error("Check on timeout failed:", checkErr);
        }
      }
    }

    let finalOrderStatus = product.providerId ? resolveProviderOrderStatus(providerOrderResult) : "accept";
    let immediateProviderCheck: Awaited<ReturnType<typeof checkProviderOrderImmediately>> = null;

    if (
      product.providerId &&
      providerForOrder &&
      adapterForOrder &&
      finalOrderStatus === "wait" &&
      (providerOrderResult?.providerOrderId || orderUuid)
    ) {
      immediateProviderCheck = await checkProviderOrderImmediately({
        adapter: adapterForOrder,
        provider: providerForOrder,
        providerOrderId: providerOrderResult?.providerOrderId,
        orderUuid,
      });

      if (immediateProviderCheck?.status && immediateProviderCheck.status !== "wait") {
        finalOrderStatus = immediateProviderCheck.status;
      }
    }

    const resolvedProviderOrderId =
      providerOrderResult?.providerOrderId || immediateProviderCheck?.providerOrderId || null;

    let finalMeta: any = {
      ...baseMeta,
    };

    if (providerOrderResult) {
      finalMeta.provider = {
        ...(finalMeta.provider || {}),
        orderUuid,
        providerOrderId: resolvedProviderOrderId,
        status: providerOrderResult.status,
        rawResponse: providerOrderResult.rawResponse,
        replayApi: providerOrderResult.replayApi,
        error: providerOrderResult.error,
      };

      if (immediateProviderCheck) {
        finalMeta.provider.immediateCheck = {
          status: immediateProviderCheck.remoteStatus,
          providerOrderId: immediateProviderCheck.providerOrderId,
          rawData: immediateProviderCheck.rawData,
          replayApi: immediateProviderCheck.replayApi,
          checkedAt: new Date().toISOString(),
        };
        finalMeta.provider.status = immediateProviderCheck.remoteStatus || finalMeta.provider.status;
        finalMeta.provider.replayApi = immediateProviderCheck.replayApi || finalMeta.provider.replayApi;
        if (immediateProviderCheck.providerOrderId) {
          finalMeta.provider.providerOrderId = immediateProviderCheck.providerOrderId;
        }
      }
    }

    // P0-5: Step 4: If provider failed or rejected, refund balance in transaction
    if (finalOrderStatus === "reject") {
      finalMeta = await refundRejectedOrderIfNeeded({
        orderId: o.id,
        userId: user.id,
        totalUsd,
        meta: finalMeta,
      });
      await db
        .update(ordersTable)
        .set({
          status: "reject",
          providerOrderId: resolvedProviderOrderId,
          meta: finalMeta,
        })
        .where(eq(ordersTable.id, o.id));
    } else {
      await db
        .update(ordersTable)
        .set({
          status: finalOrderStatus,
          providerOrderId: resolvedProviderOrderId,
          meta: finalMeta,
        })
        .where(eq(ordersTable.id, o.id));
      updateUserVipLevel(user.id).catch((err) => console.warn("[Auto VIP Update Warning]:", err));
    }

    const balanceAfterUsd =
      finalOrderStatus === "reject" ? balanceBeforeUsd : addDecimalStrings(balanceBeforeUsd, `-${totalUsd}`);

    try {
      await notifyUserOrderCreated({
        telegramId: user.telegramId,
        productName: product.name,
        priceUsd: Number(totalUsd),
        balanceBefore: Number(balanceBeforeUsd),
        balanceAfter: Number(balanceAfterUsd),
        orderNumber,
        playerId,
        status: finalOrderStatus,
        details: orderStatusMessage(finalOrderStatus),
      });

      if (finalOrderStatus === "accept") {
        await notifyInternalOrderAccepted({
          userId: user.id,
          orderNumber,
          productName: product.name,
          totalUsd,
        });
      } else if (finalOrderStatus === "reject") {
        await notifyInternalOrderRejected({
          userId: user.id,
          orderNumber,
          productName: product.name,
          totalUsd,
          note: orderStatusMessage("reject"),
        });
      }
    } catch (error) {
      console.error("Notify order user failed:", error);
    }

    const responseData = CreateOrderResponse.parse(rowToOrder({ ...o, status: finalOrderStatus, meta: finalMeta }, product));
    if (idempotencyKey) {
      setCachedIdempotentResponse(idempotencyKey, user.id, responseData);
    }

    res.json(responseData);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }
});

export default router;
