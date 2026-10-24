/*
 * Server actions module Chi phí (DATA-MODEL §4.31).
 * Khi PAID → sinh FeeEntry{type: COST} trong cùng transaction (quyết định #18).
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertManagerOrRole } from "@/lib/permissions";
import { nextSequenceCode } from "@/lib/code-generator";
import {
  expenseCreateSchema,
  expenseIdSchema,
  expenseListFilterSchema,
  expensePaySchema,
  expenseRejectSchema,
  expenseUpdateSchema
} from "./schemas";

type Actor = { id: string; role: string };

function assertManager(actor: Actor) {
  assertManagerOrRole(actor.role, "ADMIN", "OWNER", "MANAGER");
}

function assertOwner(actor: Actor, claim: { claimantUserId: string }) {
  if (claim.claimantUserId !== actor.id) assertManager(actor);
}

async function loadExpense(id: string) {
  const claim = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!claim || claim.deletedAt) throw new Error("[ERROR] Expense - phiếu chi không tồn tại - id không đúng hoặc đã xoá");
  return claim;
}

function buildFilterWhere(filter: z.infer<typeof expenseListFilterSchema>, actor: Actor): Prisma.ExpenseClaimWhereInput {
  const where: Prisma.ExpenseClaimWhereInput = { deletedAt: null };
  const manager = actor.role === "ADMIN" || actor.role === "OWNER" || actor.role === "MANAGER" || actor.role === "FINANCE";
  if (!manager) where.claimantUserId = actor.id;
  if (filter.status) where.status = filter.status;
  if (filter.category) where.category = filter.category;
  if (filter.claimantUserId) where.claimantUserId = filter.claimantUserId;
  if (filter.matterId) where.matterId = filter.matterId;
  if (filter.search) where.title = { contains: filter.search, mode: "insensitive" };
  return where;
}

export async function listExpenses(input?: z.input<typeof expenseListFilterSchema>) {
  const session = await requireSession();
  const filter = expenseListFilterSchema.parse(input ?? {});
  const where = buildFilterWhere(filter, session.user);

  const [rows, total] = await prisma.$transaction([
    prisma.expenseClaim.findMany({
      where,
      include: {
        claimantUser: { select: { id: true, name: true } },
        matter: { select: { id: true, title: true, internalCode: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize
    }),
    prisma.expenseClaim.count({ where })
  ]);
  return { rows, total, page: filter.page, pageSize: filter.pageSize };
}

export async function getExpense(id: string) {
  await requireSession();
  const { id: claimId } = expenseIdSchema.parse({ id });
  const claim = await prisma.expenseClaim.findFirst({
    where: { id: claimId, deletedAt: null },
    include: {
      claimantUser: { select: { id: true, name: true } },
      matter: { select: { id: true, title: true, internalCode: true } }
    }
  });
  if (!claim) throw new Error("[ERROR] Expense Read - phiếu chi không tồn tại");
  return claim;
}

export async function createExpense(input: z.input<typeof expenseCreateSchema>) {
  const session = await requireSession();
  const data = expenseCreateSchema.parse(input);
  const code = await nextSequenceCode("EXP");

  const claim = await prisma.expenseClaim.create({ data: expenseCreateData(data, code, session.user.id) });

  await audit({ userId: session.user.id, action: "CREATE", targetType: "ExpenseClaim", targetId: claim.id, detail: { code } });
  revalidatePath("/expenses");
  return claim;
}

export async function updateExpense(input: z.input<typeof expenseUpdateSchema>) {
  const session = await requireSession();
  const data = expenseUpdateSchema.parse(input);
  const current = await loadExpense(data.id);
  assertOwner(session.user, current);
  if (current.status !== "DRAFT") throw new Error("[ERROR] Expense Update - chỉ sửa phiếu ở trạng thái nháp");

  await prisma.expenseClaim.update({ where: { id: data.id }, data: expenseUpdateData(data) });
  await audit({ userId: session.user.id, action: "UPDATE", targetType: "ExpenseClaim", targetId: data.id });
  revalidatePath("/expenses");
}

export async function deleteExpense(id: string) {
  const session = await requireSession();
  const { id: claimId } = expenseIdSchema.parse({ id });
  const current = await loadExpense(claimId);
  assertOwner(session.user, current);
  await prisma.expenseClaim.update({ where: { id: claimId }, data: { deletedAt: new Date() } });
  await audit({ userId: session.user.id, action: "DELETE", targetType: "ExpenseClaim", targetId: claimId });
  revalidatePath("/expenses");
}

export async function submitExpense(id: string) {
  const session = await requireSession();
  const { id: claimId } = expenseIdSchema.parse({ id });
  const current = await loadExpense(claimId);
  assertOwner(session.user, current);
  await prisma.expenseClaim.update({
    where: { id: claimId },
    data: { status: "SUBMITTED", submittedById: session.user.id }
  });
  await audit({ userId: session.user.id, action: "SUBMIT", targetType: "ExpenseClaim", targetId: claimId });
  revalidatePath("/expenses");
}

export async function approveExpense(id: string) {
  const session = await requireSession();
  assertManager(session.user);
  const { id: claimId } = expenseIdSchema.parse({ id });
  await loadExpense(claimId);
  await prisma.expenseClaim.update({
    where: { id: claimId },
    data: { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date() }
  });
  await audit({ userId: session.user.id, action: "APPROVE", targetType: "ExpenseClaim", targetId: claimId });
  revalidatePath("/expenses");
}

export async function rejectExpense(input: z.input<typeof expenseRejectSchema>) {
  const session = await requireSession();
  assertManager(session.user);
  const data = expenseRejectSchema.parse(input);
  await loadExpense(data.id);
  await prisma.expenseClaim.update({
    where: { id: data.id },
    data: { status: "REJECTED", note: data.reason, approvedById: session.user.id, approvedAt: new Date() }
  });
  await audit({ userId: session.user.id, action: "REJECT", targetType: "ExpenseClaim", targetId: data.id });
  revalidatePath("/expenses");
}

/** Duyệt chi: APPROVED → PAID; nếu gắn dự án thì sinh FeeEntry COST cùng transaction. */
export async function payExpense(input: z.input<typeof expensePaySchema>) {
  const session = await requireSession();
  assertManager(session.user);
  const data = expensePaySchema.parse(input);
  const current = await loadExpense(data.id);
  if (current.status !== "APPROVED") throw new Error("[ERROR] Expense Pay - chỉ chi phiếu đã duyệt - duyệt trước khi chi");

  await prisma.$transaction(async (tx) => {
    await tx.expenseClaim.update({ where: { id: data.id }, data: { status: "PAID", paidAt: data.paidAt ?? new Date() } });
    if (current.matterId) {
      await tx.feeEntry.create({ data: costFeeEntryData(current, session.user.id, data.cashAccountId) });
    }
  });

  await audit({ userId: session.user.id, action: "PAY", targetType: "ExpenseClaim", targetId: data.id });
  revalidatePath("/expenses");
}

function expenseCreateData(data: z.infer<typeof expenseCreateSchema>, code: string, claimantUserId: string) {
  return {
    code,
    title: data.title,
    category: data.category,
    amount: new Prisma.Decimal(data.amount),
    occurredAt: data.occurredAt,
    matterId: data.matterId,
    receiptDocId: data.receiptDocId,
    vendor: data.vendor,
    note: data.note,
    claimantUserId
  };
}

function expenseUpdateData(data: z.infer<typeof expenseUpdateSchema>) {
  return {
    title: data.title,
    category: data.category,
    amount: new Prisma.Decimal(data.amount),
    occurredAt: data.occurredAt,
    matterId: data.matterId,
    receiptDocId: data.receiptDocId,
    vendor: data.vendor,
    note: data.note
  };
}

function costFeeEntryData(claim: { matterId: string | null; amount: Prisma.Decimal; vendor: string | null; title: string; code: string }, actorId: string, cashAccountId?: string) {
  return {
    matterId: claim.matterId as string,
    type: "COST" as const,
    amount: claim.amount,
    occurredAt: new Date(),
    payerOrPayee: claim.vendor ?? claim.title,
    note: `Chi phí ${claim.code}`,
    accountId: cashAccountId,
    recordedById: actorId
  };
}
