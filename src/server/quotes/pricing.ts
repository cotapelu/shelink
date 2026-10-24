/**
 * Tính tiền báo giá — hàm thuần duy nhất của module (DATA-MODEL §4.28, quyết định #16).
 * Không rải logic tính tiền vào UI hay server action.
 *
 * Công thức:
 *   subtotal = Σ quantity × unitPrice
 *   total    = subtotal × (1 − discountPercent/100) × (1 + taxPercent/100)
 */

export interface PricingInput {
  /** quantity × unitPrice đã tính sẵn cho từng dòng; nếu không truyền thì dùng quantity×unitPrice */
  items: Array<{ quantity: number; unitPrice: number; amount?: number }>;
  discountPercent: number;
  taxPercent: number;
}

export interface PricingResult {
  subtotal: number;
  discountPercent: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
}

/** Làm tròn 2 chữ số thập phân, tránh lệch float (money integer-tenth of cent) */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineAmount(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice);
}

export function computeQuotePricing({ items, discountPercent, taxPercent }: PricingInput): PricingResult {
  const subtotal = round2(
    items.reduce((sum, it) => sum + round2(it.amount ?? it.quantity * it.unitPrice), 0)
  );
  const discountPercentSafe = clampPercent(discountPercent);
  const taxPercentSafe = clampPercent(taxPercent);
  const afterDiscount = round2(subtotal * (1 - discountPercentSafe / 100));
  const taxAmount = round2(afterDiscount * (taxPercentSafe / 100));
  const total = round2(afterDiscount + taxAmount);
  return { subtotal, discountPercent: discountPercentSafe, taxPercent: taxPercentSafe, taxAmount, total };
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 100) return 100;
  return n;
}
