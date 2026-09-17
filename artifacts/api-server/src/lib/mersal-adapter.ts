import { ProviderAdapter, ProviderProduct, ProviderOrderResult, ProviderCheckResult } from "./provider-adapters";
import { parseProviderQuantityValues } from "./pricing.js";

export function mapParamToKey(param: string): string {
  const clean = param.trim().toLowerCase();
  
  if (
    clean === "player id" ||
    clean === "playerid" ||
    clean === "player_id" ||
    clean.includes("معرف اللاعب") ||
    clean.includes("معرف الحساب") ||
    clean.includes("ايدي اللاعب") ||
    clean.includes("آيدي اللاعب") ||
    clean === "id"
  ) {
    return "playerId";
  }

  if (
    clean === "zone id" ||
    clean === "zoneid" ||
    clean === "zone_id" ||
    clean.includes("سيرفر") ||
    clean.includes("منطقة") ||
    clean.includes("زون")
  ) {
    return "zoneId";
  }

  if (
    clean === "server id" ||
    clean === "serverid" ||
    clean === "server_id"
  ) {
    return "serverId";
  }

  if (
    clean.includes("هاتف") ||
    clean.includes("موبايل") ||
    clean.includes("جوال") ||
    clean.includes("خط") ||
    clean === "phone" ||
    clean === "phone number" ||
    clean === "phonenumber"
  ) {
    return "phoneNumber";
  }

  if (
    clean.includes("بريد") ||
    clean.includes("إيميل") ||
    clean.includes("ايميل") ||
    clean === "email"
  ) {
    return "email";
  }

  if (
    clean.includes("كلمة المرور") ||
    clean.includes("باسورد") ||
    clean === "password"
  ) {
    return "password";
  }

  if (
    clean.includes("شخصية") ||
    clean.includes("اسم اللاعب") ||
    clean === "character name" ||
    clean === "character"
  ) {
    return "characterName";
  }

  if (
    clean.includes("هدية") ||
    clean.includes("كود") ||
    clean === "gift code" ||
    clean === "giftcode"
  ) {
    return "giftCode";
  }

  return param
    .replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, idx) => (idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join("");
}

const DEFAULT_API_URL = "https://api.mersal-card.com";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      const err = new Error('انتهت مهلة الاتصال بمزود الخدمة (Timeout - 408). يرجى المحاولة لاحقاً.');
      (err as any).code = 'ECONNABORTED';
      throw err;
    }
    throw error;
  }
}

export class MersalAdapter implements ProviderAdapter {
  name = "mersal";

  private getUrl(apiUrl?: string): string {
    return apiUrl || DEFAULT_API_URL;
  }

  async getProfile(apiKey: string, apiUrl?: string): Promise<any> {
    const res = await fetchWithTimeout(`${this.getUrl(apiUrl)}/client/api/profile`, {
      headers: { "api-token": apiKey },
    }, 60000);
    if (!res.ok) throw new Error(`Mersal profile error: ${res.status}`);
    return res.json();
  }

  async fetchProducts(apiKey: string, apiUrl?: string): Promise<ProviderProduct[]> {
    const res = await fetchWithTimeout(`${this.getUrl(apiUrl)}/client/api/products`, {
      headers: { "api-token": apiKey },
    }, 60000);
    if (!res.ok) throw new Error(`Mersal products error: ${res.status}`);
    
    const data = await res.json() as any[];
    return data.map((p: any) => {
      const quantityInfo = parseProviderQuantityValues(p.qty_values);
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        basePrice: p.base_price,
        categoryName: p.category_name,
        categoryImage: p.category_img,
        available: p.available,
        minQty: quantityInfo.minQuantity,
        maxQty: quantityInfo.maxQuantity ?? undefined,
        quantityType: quantityInfo.quantityType,
        quantityValues: quantityInfo.quantityValues ?? null,
        productType: p.product_type,
        params: Array.isArray(p.params) ? p.params : undefined,
        description: p.params?.join(", "),
        rawData: p,
      };
    });
  }

  async placeOrder(
    apiKey: string,
    apiUrl: string | undefined,
    productId: number | string,
    quantity: number,
    playerId: string,
    orderUuid: string,
    extraParams?: Record<string, string>
  ): Promise<ProviderOrderResult> {
    const url = new URL(`${this.getUrl(apiUrl)}/client/api/newOrder/${productId}/params`);
    url.searchParams.set("qty", quantity.toString());
    url.searchParams.set("playerId", playerId);
    url.searchParams.set("order_uuid", orderUuid);
    
    if (extraParams && typeof extraParams === "object") {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v == null) return;
        const valStr = String(v).trim();
        if (!valStr) return;
        const mappedKey = mapParamToKey(k);
        url.searchParams.set(mappedKey, valStr);
        if (mappedKey !== k) {
          url.searchParams.set(k, valStr);
        }
      });
    }

    const res = await fetchWithTimeout(url.toString(), {
      headers: { "api-token": apiKey },
    }, 60000);
    
    if (!res.ok) {
      const text = await res.text();
      return { success: false, status: "error", error: `HTTP ${res.status}: ${text}` };
    }
    
    const data = (await res.json()) as any;
    return {
      success: data.status === "OK",
      providerOrderId: data.data?.order_id,
      status: data.data?.status || "wait",
      price: data.data?.price,
      rawResponse: data,
      replayApi: data.data?.replay_api,
    };
  }

  async checkOrders(
    apiKey: string,
    apiUrl: string | undefined,
    orderIds: string[],
    byUuid?: boolean
  ): Promise<ProviderCheckResult> {
    const idsParam = orderIds.join(",");
    const url = new URL(`${this.getUrl(apiUrl)}/client/api/check`);
    url.searchParams.set("orders", `[${idsParam}]`);
    if (byUuid) url.searchParams.set("uuid", "1");

    const res = await fetchWithTimeout(url.toString(), {
      headers: { "api-token": apiKey },
    }, 60000);
    if (!res.ok) throw new Error(`Mersal check error: ${res.status}`);
    
    const data = (await res.json()) as any;
    return {
      orders: (data.data || []).map((o: any) => ({
        providerOrderId: o.order_id,
        status: o.status,
        quantity: o.quantity,
        replayApi: o.replay_api,
        rawData: o,
      })),
    };
  }
}
