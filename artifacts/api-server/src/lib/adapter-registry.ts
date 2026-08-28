import { type ProviderAdapter } from "./provider-adapters.js";
import { MersalAdapter } from "./mersal-adapter.js";
import { CustomAdapter } from "./custom-adapter.js";

const adapters: Map<string, ProviderAdapter> = new Map();

export function registerAdapters() {
  // تفادي التسجيل المتكرر
  if (adapters.size > 0) return;
  
  // تسجيل المحولات
  const mersal = new MersalAdapter();
  const custom = new CustomAdapter();

  adapters.set("mersal", mersal);
  adapters.set("alkasr", mersal);
  adapters.set("gold", mersal);
  adapters.set("custom", custom);
  adapters.set("manual", custom);
  
  console.log("✅ [AdapterRegistry] Registered adapters:", Array.from(adapters.keys()));
}

export function getAdapter(type: string | undefined | null): ProviderAdapter {
  registerAdapters();
  
  const key = (type || "custom").toLowerCase().trim() || "custom";
  const adapter = adapters.get(key);
  
  if (adapter) {
    return adapter;
  }
  
  // في حال كان نوع المزود غير معروف، يتم إرجاع المحول المخصص (CustomAdapter) كافتراضي لعدم إيقاف النظام
  console.log(`ℹ️ [AdapterRegistry] Unknown providerType "${type}", returning CustomAdapter.`);
  return adapters.get("custom") || new CustomAdapter();
}

export function listAdapterTypes(): string[] {
  registerAdapters();
  return Array.from(adapters.keys());
}
