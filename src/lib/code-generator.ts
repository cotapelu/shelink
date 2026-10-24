/*
 * Sinh mã nội bộ cho module thương mại (báo giá / hợp đồng / chi phí).
 * Đếm nguyên tử qua SystemSetting trong transaction serializable —
 * cùng pattern với src/server/matters/code-generator.ts.
 *
 * Định dạng: `{PREFIX}-{NĂM}-{NNNN}` (vd: QT-2026-0001, CT-2026-0001, EXP-2026-0001)
 */

import { prisma } from "@/lib/prisma";

export async function nextSequenceCode(prefix: string, year = new Date().getFullYear()): Promise<string> {
  const seq = await prisma.$transaction(
    async (tx) => {
      const key = `${prefix.toLowerCase()}-code-counter-${year}`;
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const current = (existing?.value as { value?: number })?.value ?? 0;
      const incremented = current + 1;
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: { value: incremented } },
        create: { key, value: { value: incremented } }
      });
      return incremented;
    },
    { isolationLevel: "Serializable" }
  );
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
