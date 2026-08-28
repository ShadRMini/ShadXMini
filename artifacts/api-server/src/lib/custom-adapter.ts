import { 
  type ProviderAdapter, 
  type ProviderProduct, 
  type ProviderOrderResult, 
  type ProviderCheckResult 
} from "./provider-adapters.js";

/**
 * CustomAdapter: محول افتراضي للمزودين اليدويين أو المخصصين
 * يسمح بإضافة المنتجات والمزودين بدون الحاجة للاتصال بخادم خارجي إلزامي.
 */
export class CustomAdapter implements ProviderAdapter {
  name = "custom";

  async getProfile(_apiKey: string, _apiUrl?: string): Promise<any> {
    return {
      success: true,
      balance: 0,
      currency: "USD",
      name: "Custom Manual Provider",
    };
  }

  async fetchProducts(_apiKey: string, _apiUrl?: string): Promise<ProviderProduct[]> {
    // المزود اليدوي لا يعتمد على واجهة برمجية خارجية لجلب المنتجات
    return [];
  }

  async placeOrder(
    _apiKey: string,
    _apiUrl: string | undefined,
    _productId: number | string,
    _quantity: number,
    _playerId: string,
    orderUuid: string,
    _extraParams?: Record<string, string>
  ): Promise<ProviderOrderResult> {
    return {
      success: true,
      providerOrderId: `CUSTOM-${orderUuid.replace(/-/g, "").slice(0, 12)}`,
      status: "wait",
      rawResponse: { message: "Manual / Custom provider order pending fulfillment" },
    };
  }

  async checkOrders(
    _apiKey: string,
    _apiUrl: string | undefined,
    orderIds: string[],
    _byUuid?: boolean
  ): Promise<ProviderCheckResult> {
    return {
      orders: orderIds.map((id) => ({
        providerOrderId: id,
        status: "wait",
      })),
    };
  }
}
