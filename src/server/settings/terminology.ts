/**
 * Đọc/ghi cấu hình thuật ngữ (SystemSetting key="terminology"). Server-side only.
 */

import { prisma } from "@/lib/prisma";
import {
  resolveTerms,
  terminologySchemaValue,
  type TermKey,
  type TerminologyMap,
  type TerminologyValue
} from "@/lib/terminology";

export async function readTerminologyValue(): Promise<TerminologyValue> {
  const row = await prisma.systemSetting.findUnique({ where: { key: "terminology" } });
  const stored = row?.value as { terms?: TerminologyMap; version?: number } | undefined;
  return stored?.terms ? { terms: stored.terms, version: Number(stored.version ?? 1) } : terminologySchemaValue({});
}

export async function readTerms(): Promise<Record<TermKey, string>> {
  const value = await readTerminologyValue();
  return resolveTerms(value.terms);
}

export async function saveTerms(terms: TerminologyMap): Promise<Record<TermKey, string>> {
  const cleaned: TerminologyMap = {};
  for (const [key, value] of Object.entries(terms)) {
    const trimmed = value?.trim();
    if (trimmed) cleaned[key] = trimmed;
  }
  await prisma.systemSetting.upsert({
    where: { key: "terminology" },
    update: { value: terminologySchemaValue(cleaned) as object },
    create: { key: "terminology", value: terminologySchemaValue(cleaned) as object }
  });
  return resolveTerms(cleaned);
}
