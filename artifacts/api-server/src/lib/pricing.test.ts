import assert from "node:assert/strict";
import test from "node:test";
import {
  addUnitPrices,
  multiplyUnitPriceByQuantity,
  subtractUnitPrices,
  calculateVipFixedDiscount,
  parseProviderQuantityValues,
  validateRequestedQuantity,
} from "./pricing.js";

test("unit price is provider unit price plus store profit per unit", () => {
  assert.equal(addUnitPrices("0.00010", "0.00011"), "0.00021000");
});

test("total price is final unit price multiplied by requested quantity", () => {
  assert.equal(multiplyUnitPriceByQuantity("0.00021", 3000), "0.63000000");
});

test("profit can be derived from final unit price without adding provider twice", () => {
  assert.equal(subtractUnitPrices("0.00011000", "0.00010000"), "0.00001000");
  assert.equal(addUnitPrices("0.00010000", "0.00001000"), "0.00011000");
});

test("range quantity validation respects provider minimum and admin maximum", () => {
  const info = parseProviderQuantityValues({ min: "3000", max: "500000" });

  assert.deepEqual(
    validateRequestedQuantity({
      quantityType: info.quantityType,
      requestedQuantity: 2000,
      minQuantity: info.minQuantity,
      maxQuantity: 50000,
    }),
    { ok: false, code: 106, message: "minimum quantity is 3000" },
  );

  assert.deepEqual(
    validateRequestedQuantity({
      quantityType: info.quantityType,
      requestedQuantity: 40000,
      minQuantity: info.minQuantity,
      maxQuantity: 50000,
    }),
    { ok: true },
  );
});

test("fixed quantity rejects anything except the fixed minimum quantity", () => {
  const info = parseProviderQuantityValues(null);

  assert.deepEqual(
    validateRequestedQuantity({
      quantityType: info.quantityType,
      requestedQuantity: 2,
      minQuantity: info.minQuantity,
    }),
    { ok: false, code: 106, message: "fixed quantity must be 1" },
  );
});

test("admin maximum overrides provider maximum", () => {
  const info = parseProviderQuantityValues({ min: "3000", max: "500000" });

  assert.deepEqual(
    validateRequestedQuantity({
      quantityType: info.quantityType,
      requestedQuantity: 25000,
      minQuantity: info.minQuantity,
      maxQuantity: 20000,
    }),
    { ok: false, code: 106, message: "maximum quantity is 20000" },
  );

  assert.deepEqual(
    validateRequestedQuantity({
      quantityType: info.quantityType,
      requestedQuantity: 15000,
      minQuantity: info.minQuantity,
      maxQuantity: 20000,
    }),
    { ok: true },
  );
});

test("calculateVipFixedDiscount subtracts fixed amount per unit accurately", () => {
  const result = calculateVipFixedDiscount("1.08000000", "0.90000000", "0.01000000");
  assert.equal(result.finalUnitPrice, "1.07000000");
  assert.equal(result.appliedDiscount, "0.01000000");
});

test("calculateVipFixedDiscount respects the Golden Rule and never drops below provider unit price", () => {
  // Provider is 1.00, original is 1.02, VIP discount is 0.05
  // Price cannot drop below 1.00, so discount is capped at 0.02
  const result = calculateVipFixedDiscount("1.02000000", "1.00000000", "0.05000000");
  assert.equal(result.finalUnitPrice, "1.00000000");
  assert.equal(result.appliedDiscount, "0.02000000");
});

test("calculateVipFixedDiscount with 8 decimals micro-pricing", () => {
  // Original: 0.00010800, Provider: 0.00010000, VIP discount: 0.00000500
  const result = calculateVipFixedDiscount("0.00010800", "0.00010000", "0.00000500");
  assert.equal(result.finalUnitPrice, "0.00010300");
  assert.equal(result.appliedDiscount, "0.00000500");
});
