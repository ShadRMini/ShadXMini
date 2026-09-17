const SCALE = 8;
const FACTOR = 10n ** BigInt(SCALE);

export type QuantityType = "fixed" | "range" | "list";

export type ProviderQuantityInfo = {
  minQuantity: number;
  maxQuantity?: number | null;
  quantityType: QuantityType;
  quantityValues?: number[] | null;
};

export function decimalToScaled(value: unknown): bigint {
  const raw = String(value ?? "0").trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error(`Invalid decimal: ${raw}`);

  const negative = raw.startsWith("-");
  const clean = negative ? raw.slice(1) : raw;
  const [whole = "0", fraction = ""] = clean.split(".");
  const padded = (fraction + "0".repeat(SCALE)).slice(0, SCALE);
  const scaled = BigInt(whole || "0") * FACTOR + BigInt(padded || "0");
  return negative ? -scaled : scaled;
}

export function scaledToDecimal(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / FACTOR;
  const fraction = (abs % FACTOR).toString().padStart(SCALE, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export function addUnitPrices(providerUnitPrice: unknown, storeProfitPerUnit: unknown): string {
  return scaledToDecimal(decimalToScaled(providerUnitPrice) + decimalToScaled(storeProfitPerUnit));
}

export function subtractUnitPrices(finalUnitPrice: unknown, providerUnitPrice: unknown): string {
  return scaledToDecimal(decimalToScaled(finalUnitPrice) - decimalToScaled(providerUnitPrice));
}

export function multiplyUnitPriceByQuantity(finalUnitPrice: unknown, quantity: unknown): string {
  const qty = decimalToScaled(quantity);
  return scaledToDecimal((decimalToScaled(finalUnitPrice) * qty) / FACTOR);
}

export function calculateVipFixedDiscount(
  originalUnitPrice: unknown,
  providerUnitPrice: unknown,
  discountFixedAmount: unknown,
  discountPercent?: unknown
): {
  finalUnitPrice: string;
  appliedDiscount: string;
  discountFixedAmount: string;
  discountPercent: number;
} {
  const baseScaled = decimalToScaled(originalUnitPrice);
  const providerScaled = decimalToScaled(providerUnitPrice || "0");
  const fixedScaled = decimalToScaled(discountFixedAmount || "0");
  const pct = Math.max(0, Math.min(100, Number(discountPercent) || 0));

  let discountScaled = 0n;

  if (fixedScaled > 0n) {
    discountScaled = fixedScaled;
  } else if (pct > 0) {
    const pctBigInt = BigInt(Math.round(pct * 1000000));
    discountScaled = (baseScaled * pctBigInt) / 100000000n;
  }

  if (discountScaled <= 0n) {
    return {
      finalUnitPrice: scaledToDecimal(baseScaled),
      appliedDiscount: "0.00000000",
      discountFixedAmount: "0.00000000",
      discountPercent: 0,
    };
  }

  // Golden Rule: Final unit price must never drop below provider unit price
  const targetScaled = baseScaled - discountScaled;
  const finalScaled = targetScaled < providerScaled ? providerScaled : targetScaled;
  const actualDiscountScaled = baseScaled - finalScaled;

  return {
    finalUnitPrice: scaledToDecimal(finalScaled),
    appliedDiscount: scaledToDecimal(actualDiscountScaled > 0n ? actualDiscountScaled : 0n),
    discountFixedAmount: scaledToDecimal(fixedScaled),
    discountPercent: pct,
  };
}

export function calculateVipDiscountedPrice(
  originalUnitPrice: unknown,
  discountPercent: unknown,
  providerUnitPrice?: unknown
): {
  finalUnitPrice: string;
  discountAmount: string;
  discountPercent: number;
} {
  const res = calculateVipFixedDiscount(
    originalUnitPrice,
    providerUnitPrice || "0",
    "0",
    discountPercent
  );
  return {
    finalUnitPrice: res.finalUnitPrice,
    discountAmount: res.appliedDiscount,
    discountPercent: res.discountPercent,
  };
}

export function parseProviderQuantityValues(qtyValues: unknown): ProviderQuantityInfo {
  if (qtyValues == null) {
    return { minQuantity: 1, quantityType: "fixed", quantityValues: null };
  }

  if (Array.isArray(qtyValues)) {
    const values = qtyValues
      .map((x) => Number(String(x).trim()))
      .filter((x) => Number.isInteger(x) && x > 0)
      .sort((a, b) => a - b);
    return {
      minQuantity: values[0] ?? 1,
      maxQuantity: values.length ? values[values.length - 1] : null,
      quantityType: "list",
      quantityValues: values,
    };
  }

  if (typeof qtyValues === "object") {
    const raw = qtyValues as Record<string, unknown>;
    const min = Number(raw.min ?? raw.minimum ?? 1);
    const max = Number(raw.max ?? raw.maximum ?? 0);
    return {
      minQuantity: Number.isInteger(min) && min > 0 ? min : 1,
      maxQuantity: Number.isInteger(max) && max > 0 ? max : null,
      quantityType: "range",
      quantityValues: null,
    };
  }

  return { minQuantity: 1, quantityType: "fixed", quantityValues: null };
}

export function validateRequestedQuantity(args: {
  quantityType: QuantityType;
  requestedQuantity: number;
  minQuantity: number;
  maxQuantity?: number | null;
  quantityValues?: unknown;
}): { ok: true } | { ok: false; code: 106; message: string } {
  const requested = Number(args.requestedQuantity);
  const min = Number(args.minQuantity || 1);
  const max = args.maxQuantity == null ? null : Number(args.maxQuantity);

  if (!Number.isInteger(requested) || requested <= 0) {
    return { ok: false, code: 106, message: "quantity must be a positive integer" };
  }

  if (args.quantityType === "fixed" && requested !== min) {
    return { ok: false, code: 106, message: `fixed quantity must be ${min}` };
  }

  if (args.quantityType === "list") {
    const values = Array.isArray(args.quantityValues)
      ? args.quantityValues.map((x) => Number(x)).filter((x) => Number.isInteger(x))
      : [];
    if (!values.includes(requested)) {
      return { ok: false, code: 106, message: "quantity is not allowed for this product" };
    }
  }

  if (requested < min) {
    return { ok: false, code: 106, message: `minimum quantity is ${min}` };
  }

  if (max != null && Number.isFinite(max) && requested > max) {
    return { ok: false, code: 106, message: `maximum quantity is ${max}` };
  }

  return { ok: true };
}
