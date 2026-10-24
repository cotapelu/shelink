/*
 * Server actions module Quỹ (CashAccount) — DATA-MODEL §4.31, PRD M6/M10.
 * Phân quyền:
 *  - Xem quỹ + số dư: quản lý (ADMIN/PRINCIPAL_LAWYER) và FINANCE.
 *  - Tạo/sửa/bật-tắt: chỉ quản lý.
 * Số dư tính tại chỗ (openingBalance + Σ thu − Σ chi), không lưu bảng số dư.
 * Mọi hàm ≤20 dòng (GOAL §3.1).
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { FeeEntryType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { isManager } from "@/lib/permissions";
import { cashBalance, groupFlowsByAccount } from "./balance";
import {
  cashAccountCreateSchema,
  cashAccountIdSchema,
  cashAccountUpdateSchema,
  type CashAccountCreateInput
} from "./schemas";

const CASH_PATH = "/settings/cash-accounts";

function assertCanManage(role: string) {
  if (!isManager(role)) throw new Error("Không đủ quyền quản lý quỹ");
}

function assertCanViewFinance(role: string) {
  if (!isManager(role) && role !== "FINANCE") {
    throw new Error("Chỉ quản lý hoặc kế toán xem được số dư quỹ");
  }
}

function toDecimalInput(data: CashAccountCreateInput) {
  return {
    name: data.name,
    type: data.type,
    currency: data.currency,
    openingBalance: new Prisma.Decimal(data.openingBalance),
    bankName: data.bankName || null,
    accountNoMasked: data.accountNoMasked || null,
    note: data.note || null
  };
}

/** Chuyển kết quả groupBy của feeEntry thành input cho helper tính số dư (bỏ qua accountId rỗng). */
function toFlowInputs(flows: { accountId: string | null; type: FeeEntryType; _sum: { amount: Prisma.Decimal | null } }[]) {
  return flows
    .filter((f): f is typeof f & { accountId: string } => Boolean(f.accountId))
    .map((f) => ({ accountId: f.accountId, type: f.type, amount: Number(f._sum.amount ?? 0) }));
}

/** Danh sách quỹ kèm số dư hiện tại (gộp groupBy để tránh N+1). */
export async function listCashAccountsWithBalance() {
  const session = await requireSession();
  assertCanViewFinance(session.user.role);

  const accounts = await prisma.cashAccount.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] });
  const flows = await prisma.feeEntry.groupBy({ by: ["accountId", "type"], where: { accountId: { in: accounts.map((a) => a.id) } }, _sum: { amount: true } });
  const grouped = groupFlowsByAccount(toFlowInputs(flows));

  return accounts.map((a) => ({ ...a, balance: cashBalance(Number(a.openingBalance), grouped.get(a.id) ?? []) }));
}

export async function createCashAccount(input: z.input<typeof cashAccountCreateSchema>) {
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = cashAccountCreateSchema.parse(input);

  const created = await prisma.cashAccount.create({ data: toDecimalInput(data) });
  await audit({ userId: session.user.id, action: "CREATE", targetType: "CashAccount", targetId: created.id, detail: { name: data.name, type: data.type } });
  revalidatePath(CASH_PATH);
  return created;
}

export async function updateCashAccount(input: z.input<typeof cashAccountUpdateSchema>) {
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = cashAccountUpdateSchema.parse(input);

  await prisma.cashAccount.update({
    where: { id: data.id },
    data: { ...toDecimalInput(data), active: data.active ?? true }
  });
  await audit({ userId: session.user.id, action: "UPDATE", targetType: "CashAccount", targetId: data.id, detail: { name: data.name } });
  revalidatePath(CASH_PATH);
}

export async function setCashAccountActive(id: string, active: boolean) {
  const session = await requireSession();
  assertCanManage(session.user.role);
  const { id: accountId } = cashAccountIdSchema.parse({ id });

  await prisma.cashAccount.update({ where: { id: accountId }, data: { active } });
  await audit({ userId: session.user.id, action: active ? "ACTIVATE" : "ARCHIVE", targetType: "CashAccount", targetId: accountId });
  revalidatePath(CASH_PATH);
}
