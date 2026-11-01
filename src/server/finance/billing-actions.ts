"use server";

/*
 * Billing / FeeEntry (thu chi + tự chia hoa hồng) / CommissionPlan.
 * Tách từ finance/actions.ts (R-refactor AUTO-64) để mỗi file ≤300 dòng.
 * LƯU Ý: module "use server" KHÔNG hỗ trợ re-export (Next 16/Turbopack) —
 * consumer import TRỰC TIẾP từ file này.
 */

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter, isManager } from "@/lib/permissions";
import {
  billingCreateSchema,
  feeEntryCreateSchema,
  commissionPlanSetSchema,
  type BillingCreateInput,
  type FeeEntryCreateInput,
  type CommissionPlanSetInput
} from "./schemas";
import {
  buildCommissionData,
  buildFeeEntryData,
  feeReceivedTimelineData,
  shouldSplitCommission
} from "./fee-entry-lib";

// ============ Billing ============

/** Payload tạo Billing từ input đã validate. */
function toBillingCreateData(data: BillingCreateInput) {
  return {
    matterId: data.matterId,
    title: data.title,
    contractAmount: new Prisma.Decimal(data.contractAmount),
    schedule: data.schedule || null,
    status: data.status,
    signedAt: data.signedAt
  };
}

export async function createBilling(input: BillingCreateInput) {
  const session = await requireSession();
  const data = billingCreateSchema.parse(input);
  await assertMatterWritable(data.matterId, { allowFinanceRole: true });
  const created = await prisma.billing.create({ data: toBillingCreateData(data) });
  await audit({
    userId: session.user.id,
    action: "BILLING_CREATE",
    targetType: "Billing",
    targetId: created.id,
    detail: { matterId: data.matterId }
  });
  revalidatePath(`/matters/${data.matterId}`);
  return { ok: true, id: created.id };
}

export async function deleteBilling(id: string) {
  const session = await requireSession();
  const billing = await prisma.billing.findUnique({
    where: { id },
    select: { matterId: true }
  });
  if (!billing) return { ok: false };

  if (session.user.role === "FINANCE") {
    await assertMatterWritable(billing.matterId, { allowFinanceRole: true });
  } else {
    await assertMatterWritable(billing.matterId);
    await assertCanLeadMatter(session.user.id, billing.matterId, "Chỉ chủ trì / hợp tác viên của vụ hoặc Tài chính mới được xóa hợp đồng");
  }

  await prisma.billing.delete({ where: { id } });
  await audit({ userId: session.user.id, action: "BILLING_DELETE", targetType: "Billing", targetId: id });
  revalidatePath(`/matters/${billing.matterId}`);
  return { ok: true };
}

/** Tạo các dòng COMMISSION con theo plan (bỏ qua plan có phần chia ≤0). */
async function createCommissionChildren(
  tx: Prisma.TransactionClient,
  plans: Array<{ id: string; userId: string; percent: Prisma.Decimal; label: string | null }>,
  ctx: { amount: number; parentId: string; recordedById: string; matterId: string; billingId: string | null; occurredAt: Date }
): Promise<void> {
  for (const plan of plans) {
    const row = buildCommissionData({ plan, amount: ctx.amount, parentId: ctx.parentId, recordedById: ctx.recordedById, matterId: ctx.matterId, billingId: ctx.billingId, occurredAt: ctx.occurredAt });
    if (!row) continue;
    await tx.feeEntry.create({ data: { ...row, amount: new Prisma.Decimal(row.amount) } });
  }
}

/** Thân transaction tạo thu chi: dòng chính + hoa hồng tự động + sự kiện dòng thời gian. */
async function runFeeEntryCreation(tx: Prisma.TransactionClient, data: FeeEntryCreateInput, recordedById: string) {
  const entryData = buildFeeEntryData(data, recordedById);
  const entry = await tx.feeEntry.create({ data: { ...entryData, amount: new Prisma.Decimal(entryData.amount) } });

  // Tự động chia hoa hồng khi thu tiền (pure logic đã tách sang fee-entry-lib)
  if (shouldSplitCommission(data.type, data.amount)) {
    const plans = await tx.commissionPlan.findMany({ where: { matterId: data.matterId, active: true } });
    const ctx = { amount: data.amount, parentId: entry.id, recordedById, matterId: data.matterId, billingId: data.billingId || null, occurredAt: data.occurredAt };
    await createCommissionChildren(tx, plans, ctx);
  }

  // Sự kiện thu tiền thực tế ghi vào dòng thời gian
  if (data.type === "RECEIVED") {
    await tx.timelineEvent.create({ data: feeReceivedTimelineData(data) });
  }
  return entry;
}

// ============ FeeEntry + tự động chia hoa hồng ============

/**
 * Tạo một bản ghi thu chi.
 * - Khi tạo RECEIVED thì tự động sinh các dòng con COMMISSION theo CommissionPlan (mỗi người hưởng một dòng)
 * - parent / children liên kết qua parentFeeEntryId
 */
export async function createFeeEntry(input: FeeEntryCreateInput) {
  const session = await requireSession();
  const data = feeEntryCreateSchema.parse(input);
  await assertMatterWritable(data.matterId, { allowFinanceRole: true });

  const created = await prisma.$transaction((tx) => runFeeEntryCreation(tx, data, session.user.id));

  await audit({
    userId: session.user.id,
    action: "FEE_ENTRY_CREATE",
    targetType: "FeeEntry",
    targetId: created.id,
    detail: { matterId: data.matterId, type: data.type, amount: data.amount }
  });

  revalidatePath(`/matters/${data.matterId}`);
  revalidatePath("/finance");
  return { ok: true, id: created.id };
}

/** Xóa dòng cha + dòng con hoa hồng tự sinh (cùng transaction). */
async function deleteFeeEntryCascade(
  tx: Prisma.TransactionClient,
  id: string,
  childIds: string[]
): Promise<void> {
  if (childIds.length > 0) {
    await tx.feeEntry.deleteMany({ where: { id: { in: childIds } } });
  }
  await tx.feeEntry.delete({ where: { id } });
}

/** Ghi audit + revalidate sau khi xóa bản ghi thu chi. */
async function recordFeeEntryDeletion(
  userId: string,
  id: string,
  entry: { matterId: string; commissionChildren: unknown[] }
): Promise<void> {
  await audit({
    userId,
    action: "FEE_ENTRY_DELETE",
    targetType: "FeeEntry",
    targetId: id,
    detail: { matterId: entry.matterId, cascadedChildren: entry.commissionChildren.length }
  });
  revalidatePath(`/matters/${entry.matterId}`);
  revalidatePath("/finance");
}

/**
 * Xóa bản ghi thu chi: kéo theo các dòng hoa hồng tự sinh + audit + revalidate.
 * Tách khỏi action để action chỉ còn phân quyền (R-refactor AUTO-62).
 */
async function runFeeEntryDeletion(userId: string, id: string): Promise<boolean> {
  const entry = await prisma.feeEntry.findUnique({
    where: { id },
    include: { commissionChildren: { select: { id: true } } }
  });
  if (!entry) return false;
  await assertMatterWritable(entry.matterId, { allowFinanceRole: true });
  await prisma.$transaction((tx) =>
    deleteFeeEntryCascade(tx, id, entry.commissionChildren.map((c) => c.id))
  );
  await recordFeeEntryDeletion(userId, id, entry);
  return true;
}

export async function deleteFeeEntry(id: string) {
  const session = await requireSession();
  if (!isManager(session.user.role) && session.user.role !== "FINANCE") {
    throw new Error("Chỉ quản trị, luật sư chủ trì hoặc Tài chính mới được xóa bản ghi thu chi");
  }
  const ok = await runFeeEntryDeletion(session.user.id, id);
  return { ok };
}

// ============ CommissionPlan ============

/** Ghi audit + revalidate sau khi thay thế phương án hoa hồng. */
async function recordCommissionPlanAudit(userId: string, matterId: string, itemCount: number): Promise<void> {
  await audit({
    userId,
    action: "COMMISSION_PLAN_SET",
    targetType: "Matter",
    targetId: matterId,
    detail: { itemCount }
  });
  revalidatePath(`/matters/${matterId}`);
}

/** Thay thế toàn bộ phương án chia hoa hồng của vụ (xóa hết → tạo mới). */
async function runCommissionPlanReplace(userId: string, data: CommissionPlanSetInput): Promise<void> {
  await assertMatterWritable(data.matterId);
  await assertCanLeadMatter(userId, data.matterId, "Chỉ chủ trì / hợp tác viên của vụ mới được đặt phương án chia hoa hồng");
  await prisma.$transaction([
    prisma.commissionPlan.deleteMany({ where: { matterId: data.matterId } }),
    prisma.commissionPlan.createMany({
      data: data.items.map((it) => ({
        matterId: data.matterId,
        userId: it.userId,
        percent: new Prisma.Decimal(it.percent),
        label: it.label || null,
        active: true
      }))
    })
  ]);
  await recordCommissionPlanAudit(userId, data.matterId, data.items.length);
}

/**
 * Thay thế toàn bộ phương án chia hoa hồng của vụ.
 * Cách đơn giản: xóa mọi plan hiện có, tạo mới theo items.
 */
export async function setCommissionPlan(input: CommissionPlanSetInput) {
  const session = await requireSession();
  const data = commissionPlanSetSchema.parse(input);
  await runCommissionPlanReplace(session.user.id, data);
  return { ok: true };
}
