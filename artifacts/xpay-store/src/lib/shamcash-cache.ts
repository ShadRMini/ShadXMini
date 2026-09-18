const SHAMCASH_CACHE_KEY = "xpay_shamcash_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface CachedShamCashData {
  walletAddress: string;
  qrImageUrl: string;
  methodConfig?: any;
  minAmount?: number;
  maxAmount?: number;
}

export function getCachedShamCash(): CachedShamCashData | null {
  try {
    const raw = localStorage.getItem(SHAMCASH_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (!data) return null;
    if (Date.now() - timestamp > CACHE_TTL) {
      // Expired but return for stale-while-revalidate
      return data;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCachedShamCash(data: CachedShamCashData) {
  try {
    localStorage.setItem(
      SHAMCASH_CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch {}
}
