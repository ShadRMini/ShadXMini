import { db, settingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * استخراج قيمة نصية من أي شكل مخزّن في قاعدة البيانات:
 * - إذا كانت string → يعيدها مباشرة
 * - إذا كانت object → يجرّب المفاتيح الشائعة (key, value, apiKey, identifier, url, secret, text)
 * - وإلا → يعيد ""
 */
export function extractStringValue(value: any): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidates = ["key", "value", "apiKey", "identifier", "url", "secret", "text"];
    for (const k of candidates) {
      if (typeof value[k] === "string" && value[k].trim()) {
        return value[k].trim();
      }
    }
  }
  return "";
}

export async function getShamCashSettings() {
  const rows = await db.select().from(settingsTable);
  const settingsMap: Record<string, any> = {};
  for (const r of rows) {
    settingsMap[r.key] = r.value;
  }

  const apiBaseUrl =
    extractStringValue(settingsMap["shamcash_api_base_url"]) ||
    process.env.SAM_API_BASE_URL ||
    "https://www.sam-api.pro/api";

  const apiKey =
    extractStringValue(settingsMap["shamcash_api_key"]) ||
    process.env.SAM_API_KEY ||
    "";

  const shamcashIdentifier =
    extractStringValue(settingsMap["shamcash_shamcash_identifier"]) ||
    process.env.SAM_SHAMCASH_IDENTIFIER ||
    "";

  const webhookSecret =
    extractStringValue(settingsMap["shamcash_webhook_secret"]) ||
    process.env.SAM_WEBHOOK_SECRET ||
    "";

  const publicApiBaseUrl =
    extractStringValue(settingsMap["public_api_base_url"]) ||
    process.env.PUBLIC_API_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "";

  const rawExpiry = settingsMap["shamcash_invoice_expiry_minutes"];
  const expiryMinutes = Number(
    typeof rawExpiry === "object" && rawExpiry !== null
      ? rawExpiry.minutes || rawExpiry.value || 15
      : rawExpiry || 15
  );

  let cleanApiBaseUrl = String(apiBaseUrl).trim();
  if (cleanApiBaseUrl.startsWith("https://sam-api.pro")) {
    cleanApiBaseUrl = cleanApiBaseUrl.replace("https://sam-api.pro", "https://www.sam-api.pro");
  }

  return {
    apiBaseUrl: cleanApiBaseUrl,
    payBaseUrl: cleanApiBaseUrl.replace(/\/api\/?$/i, ""),
    apiKey: String(apiKey).trim(),
    shamcashIdentifier: String(shamcashIdentifier).trim(),
    webhookSecret: String(webhookSecret).trim(),
    publicApiBaseUrl: String(publicApiBaseUrl).trim(),
    expiryMinutes: Number.isFinite(expiryMinutes) ? expiryMinutes : 15,
  };
}

const SAM_API_BASE_URL = process.env.SAM_API_BASE_URL || "https://www.sam-api.pro/api";
const SAM_API_KEY = process.env.SAM_API_KEY || "";
const SAM_SHAMCASH_IDENTIFIER = process.env.SAM_SHAMCASH_IDENTIFIER || "";
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL || "";

export async function createShamCashInvoice({
  amount,
  currency,
  userId,
  walletAddress,
  orderId,
  telegramId,
}: {
  amount: number;
  currency: string;
  userId?: number;
  walletAddress?: string;
  orderId?: string;
  telegramId?: string;
}) {
  let apiKey = SAM_API_KEY;
  let walletIdentifier = SAM_SHAMCASH_IDENTIFIER;
  let baseUrl = SAM_API_BASE_URL;
  let publicBaseUrl = PUBLIC_API_BASE_URL;

  // Fallback to database settings if environment variables are not set
  if (!apiKey || !walletIdentifier) {
    try {
      const dbSettings = await getShamCashSettings();
      if (!apiKey && dbSettings.apiKey) apiKey = dbSettings.apiKey;
      if (!walletIdentifier && dbSettings.shamcashIdentifier) walletIdentifier = dbSettings.shamcashIdentifier;
      if ((!baseUrl || baseUrl === "https://sam-api.pro/api" || baseUrl === "https://www.sam-api.pro/api") && dbSettings.apiBaseUrl) baseUrl = dbSettings.apiBaseUrl;
      if (!publicBaseUrl && dbSettings.publicApiBaseUrl) publicBaseUrl = dbSettings.publicApiBaseUrl;
    } catch (err: any) {
      console.warn("[ShamCash] ⚠️ Failed to load settings from DB fallback:", err.message);
    }
  }

  // ============ 1. التحقق من الإعدادات ============
  console.log("========== [ShamCash] START ==========");
  console.log("[ShamCash] BASE_URL:", baseUrl);
  console.log("[ShamCash] API_KEY (first 15):", apiKey ? apiKey.substring(0, 15) + "..." : "(empty)");
  console.log("[ShamCash] WALLET:", walletAddress || walletIdentifier);
  console.log("[ShamCash] AMOUNT:", amount, "CURRENCY:", currency);

  if (!apiKey || !apiKey.startsWith("sk_")) {
    console.error("[ShamCash] ❌ SAM_API_KEY is missing or invalid");
    throw new Error("مفتاح API غير مهيأ على الخادم");
  }

  const effectiveWalletIdentifier = walletAddress || walletIdentifier;
  if (!effectiveWalletIdentifier) {
    console.error("[ShamCash] ❌ SAM_SHAMCASH_IDENTIFIER is missing");
    throw new Error("عنوان محفظة شام كاش غير مهيأ على الخادم");
  }

  // ============ 2. تجهيز الطلب ============
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const url = `${cleanBaseUrl}/v1/invoices`;

  const requestBody = {
    method: "shamcash",
    identifier: effectiveWalletIdentifier,
    amount: String(amount),
    currency: currency.toUpperCase(),
    webhookUrl: publicBaseUrl
      ? `${publicBaseUrl.replace(/\/+$/, "")}/api/webhooks/shamcash`
      : undefined,
  };

  console.log("[ShamCash] 📤 Request URL:", url);
  console.log("[ShamCash] 📤 Request Body (FULL):", JSON.stringify(requestBody, null, 2));

  // ============ 3. إرسال الطلب ============
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 ثانية

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "x-Api-Key": apiKey, // إضافة كلا الطريقتين للتوافق
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // ============ 4. قراءة الاستجابة الفعلية ============
    const responseText = await response.text();
    console.log("[ShamCash] 📥 Response Status:", response.status);
    console.log("[ShamCash] 📥 Response Headers:", JSON.stringify(Object.fromEntries(response.headers.entries())));
    console.log("[ShamCash] 📥 Response Body (RAW):", responseText);

    // ============ 5. معالجة الخطأ ============
    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }

      const errorCode = errorData.error_code || errorData.code || `HTTP_${response.status}`;
      const errorMessage = errorData.message || errorData.error || responseText || "Unknown error";

      console.error(`[ShamCash] ❌ ERROR CODE: ${errorCode}`);
      console.error(`[ShamCash] ❌ ERROR MESSAGE: ${errorMessage}`);

      const errorMessagesAr: Record<string, string> = {
        MISSING_API_KEY: "مفتاح API مفقود",
        INVALID_API_KEY: "مفتاح API غير صالح",
        VALIDATION_ERROR: `بيانات الطلب غير صحيحة: ${errorMessage}`,
        INVALID_IDENTIFIER: "معرّف المحفظة غير صحيح",
        NOT_FOUND: "المحفظة أو الفاتورة غير موجودة",
        EXPIRED: "انتهت صلاحية الفاتورة",
        WALLET_SESSION_EXPIRED: "انتهت جلسة المحفظة",
        WALLET_UPSTREAM_ERROR: "تعذر الاتصال بمزود المحفظة",
        PROVIDER_ERROR: `رفض المزود العملية: ${errorMessage}`,
      };

      throw new Error(errorMessagesAr[errorCode] || `فشل من المزود [${errorCode}]: ${errorMessage}`);
    }

    // ============ 6. تحليل الاستجابة الناجحة ============
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("[ShamCash] ❌ Failed to parse JSON:", responseText);
      throw new Error("استجابة غير صالحة من مزود الدفع");
    }

    console.log("[ShamCash] ✅ Parsed Response:", JSON.stringify(data));

    // ============ 7. استخراج invoice_id (بجميع الاحتمالات) ============
    const invoiceId =
      data.invoice_id ||
      data.invoiceId ||
      data.id ||
      data.data?.invoice_id ||
      data.data?.invoiceId ||
      data.data?.id;

    if (!invoiceId) {
      console.error("[ShamCash] ❌ No invoice_id found in response");
      throw new Error("لم يتم إرجاع معرف الفاتورة من المزود");
    }

    const payBaseUrl = cleanBaseUrl.replace(/\/api\/?$/i, "");
    const paymentUrl =
      data.payment_url ||
      data.paymentUrl ||
      data.url ||
      data.pay_url ||
      data.data?.payment_url ||
      `${payBaseUrl}/pay/${invoiceId}`;

    const expiresAt =
      data.expires_at ||
      data.expiresAt ||
      data.data?.expires_at ||
      new Date(Date.now() + 15 * 60 * 1000).toISOString();

    console.log("[ShamCash] ✅ SUCCESS! Invoice ID:", invoiceId);
    console.log("========== [ShamCash] END ==========");

    return {
      invoiceId: String(invoiceId),
      paymentUrl,
      walletAddress: effectiveWalletIdentifier,
      expiresAt,
      amount,
      currency,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error("[ShamCash] ❌ REQUEST TIMEOUT after 20s");
      throw new Error("انتهت مهلة الاتصال بمزود الدفع");
    }

    console.error("[ShamCash] ❌ EXCEPTION:", error.message);
    console.error("[ShamCash] ❌ STACK:", error.stack);
    console.log("========== [ShamCash] FAILED ==========");
    throw error;
  }
}
