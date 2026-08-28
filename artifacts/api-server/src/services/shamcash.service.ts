import { db, settingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function getShamCashSettings() {
  const rows = await db.select().from(settingsTable);
  const settingsMap: Record<string, any> = {};
  for (const r of rows) {
    settingsMap[r.key] = r.value;
  }

  const apiBaseUrl =
    settingsMap["shamcash_api_base_url"]?.url ||
    settingsMap["shamcash_api_base_url"] ||
    process.env.SAM_API_BASE_URL ||
    "https://sam-api.pro/api";

  const apiKey =
    settingsMap["shamcash_api_key"]?.key ||
    settingsMap["shamcash_api_key"] ||
    process.env.SAM_API_KEY ||
    "";

  const shamcashIdentifier =
    settingsMap["shamcash_shamcash_identifier"]?.identifier ||
    settingsMap["shamcash_shamcash_identifier"] ||
    process.env.SAM_SHAMCASH_IDENTIFIER ||
    "";

  const webhookSecret =
    settingsMap["shamcash_webhook_secret"]?.secret ||
    settingsMap["shamcash_webhook_secret"] ||
    process.env.SAM_WEBHOOK_SECRET ||
    "";

  const publicApiBaseUrl =
    settingsMap["public_api_base_url"]?.url ||
    settingsMap["public_api_base_url"] ||
    process.env.PUBLIC_API_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "";

  const expiryMinutes = Number(
    settingsMap["shamcash_invoice_expiry_minutes"]?.minutes ||
    settingsMap["shamcash_invoice_expiry_minutes"] ||
    15
  );

  return {
    apiBaseUrl: String(apiBaseUrl).trim(),
    payBaseUrl: String(apiBaseUrl).trim().replace(/\/api\/?$/i, ""),
    apiKey: String(apiKey).trim(),
    shamcashIdentifier: String(shamcashIdentifier).trim(),
    webhookSecret: String(webhookSecret).trim(),
    publicApiBaseUrl: String(publicApiBaseUrl).trim(),
    expiryMinutes: Number.isFinite(expiryMinutes) ? expiryMinutes : 15,
  };
}

export async function createShamCashInvoice(args: {
  amount: number;
  currency: string;
  walletAddress?: string;
  orderId?: string;
  telegramId?: string;
}) {
  const settings = await getShamCashSettings();
  if (!settings.apiKey || !settings.shamcashIdentifier || !settings.publicApiBaseUrl) {
    throw {
      statusCode: 500,
      error: "SAM config missing",
      message: "Missing required server configuration for ShamCash auto invoice.",
      required: ["shamcash_api_key", "shamcash_shamcash_identifier", "public_api_base_url"],
    };
  }

  const webhookSecretPath = settings.webhookSecret ? `/${encodeURIComponent(settings.webhookSecret)}` : "";
  const webhookUrl = `${settings.publicApiBaseUrl.replace(/\/+$/, "")}/api/webhooks/shamcash${webhookSecretPath}`;

  const res = await fetch(`${settings.apiBaseUrl.replace(/\/+$/, "")}/v1/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "X-Api-Key": settings.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method: "shamcash",
      identifier: args.walletAddress || settings.shamcashIdentifier,
      amount: String(args.amount),
      currency: args.currency.toUpperCase(),
      webhookUrl,
      ...(args.orderId ? { orderId: args.orderId } : {}),
    }),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json?.invoiceId || !json?.paymentUrl) {
    throw {
      statusCode: 502,
      error: "SAM_INVOICE_CREATE_FAILED",
      message: json?.message || "Sam API rejected invoice creation.",
      details: json,
    };
  }

  return {
    invoiceId: String(json.invoiceId),
    paymentUrl: String(json.paymentUrl),
    expiresAt: json.expiresAt || null,
  };
}
