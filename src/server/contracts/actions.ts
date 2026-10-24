/*
 * Server actions module Hợp đồng (DATA-MODEL §4.29, PRD §10.4).
 * Phân quyền: ADMIN/OWNER/MANAGER toàn quyền; STAFF chỉ đọc của mình.
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
  CONTRACT_EDITABLE_STATUSES,
  contractCreateSchema,
  contractEventCreateSchema,
  contractIdSchema,
  contractListFilterSchema,
  contractRenewSchema,
  contractUpdateSchema
} from "./schemas";

type Actor = { id: string; role: string };

function assertCanManage(actor: Actor) {
  assertManagerOrRole(actor.role, "ADMIN", "OWNER", "MANAGER");
}

function assertCanEdit(actor: Actor, contract: { createdById: string | null }) {
  if (contract.createdById !== actor.id) assertCanManage(actor);
}

async function loadContract(id: string) {
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract || contract.deletedAt) throw new Error("[ERROR] Contract - hợp đồng không tồn tại - id không đúng hoặc đã xoá");
  return contract;
}

function buildFilterWhere(filter: z.infer<typeof contractListFilterSchema>): Prisma.ContractWhereInput {
  const where: Prisma.ContractWhereInput = { deletedAt: null };
  if (filter.status) where.status = filter.status;
  if (filter.clientId) where.clientId = filter.clientId;
  if (filter.expiringWithinDays) {
    const until = new Date(Date.now() + filter.expiringWithinDays * 86400000);
    where.AND = [{ expiresAt: { not: null } }, { expiresAt: { lte: until } }, { status: { in: ["SIGNED", "ACTIVE", "RENEWED"] } }];
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { code: { contains: filter.search, mode: "insensitive" } }
    ];
  }
  return where;
}

export async function listContracts(input?: z.input<typeof contractListFilterSchema>) {
  await requireSession();
  const filter = contractListFilterSchema.parse(input ?? {});
  const where = buildFilterWhere(filter);

  const [rows, total] = await prisma.$transaction([
    prisma.contract.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize
    }),
    prisma.contract.count({ where })
  ]);
  return { rows, total, page: filter.page, pageSize: filter.pageSize };
}

export async function getContract(id: string) {
  await requireSession();
  const { id: contractId } = contractIdSchema.parse({ id });
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, deletedAt: null },
    include: {
      client: { select: { id: true, name: true } },
      quote: { select: { id: true, code: true } },
      matter: { select: { id: true, title: true, internalCode: true } },
      events: { orderBy: { occurredAt: "desc" }, include: { actorUser: { select: { name: true } } } }
    }
  });
  if (!contract) throw new Error("[ERROR] Contract Read - không tìm thấy hợp đồng - kiểm tra id hoặc đã bị xoá");
  return contract;
}

export async function createContract(input: z.input<typeof contractCreateSchema>) {
  const session = await requireSession();
  assertCanManage(session.user);
  const data = contractCreateSchema.parse(input);
  const code = await nextSequenceCode("CT");

  const contract = await prisma.$transaction(async (tx) => {
    const created = await tx.contract.create({
      data: { ...data, code, createdById: session.user.id, ownerUserId: session.user.id, amount: new Prisma.Decimal(data.amount) }
    });
    await tx.contractEvent.create({
      data: { contractId: created.id, kind: "CREATED", actorUserId: session.user.id }
    });
    return created;
  });

  await audit({ userId: session.user.id, action: "CREATE", targetType: "Contract", targetId: contract.id, detail: { code } });
  revalidatePath("/contracts");
  return contract;
}

export async function updateContract(input: z.input<typeof contractUpdateSchema>) {
  const session = await requireSession();
  const data = contractUpdateSchema.parse(input);
  const current = await loadContract(data.id);
  assertCanEdit(session.user, current);
  if (!CONTRACT_EDITABLE_STATUSES.includes(current.status as "DRAFT")) {
    throw new Error("[ERROR] Contract Update - chỉ sửa hợp đồng ở trạng thái nháp/review");
  }

  await prisma.contract.update({
    where: { id: data.id },
    data: { ...data, amount: new Prisma.Decimal(data.amount) }
  });
  await audit({ userId: session.user.id, action: "UPDATE", targetType: "Contract", targetId: data.id });
  revalidatePath("/contracts");
}

export async function deleteContract(id: string) {
  const session = await requireSession();
  const { id: contractId } = contractIdSchema.parse({ id });
  const current = await loadContract(contractId);
  assertCanEdit(session.user, current);
  await prisma.contract.update({ where: { id: contractId }, data: { deletedAt: new Date() } });
  await audit({ userId: session.user.id, action: "DELETE", targetType: "Contract", targetId: contractId });
  revalidatePath("/contracts");
}

export async function transitionContract(id: string, to: "REVIEW" | "SIGNED" | "ACTIVE") {
  const session = await requireSession();
  assertCanManage(session.user);
  const { id: contractId } = contractIdSchema.parse({ id });
  const current = await loadContract(contractId);

  const patch = contractTransitionPatch(current, to);
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: contractId }, data: patch.contract });
    if (patch.event) await tx.contractEvent.create({ data: { contractId, actorUserId: session.user.id, ...patch.event } });
  });

  await audit({ userId: session.user.id, action: "TRANSITION", targetType: "Contract", targetId: contractId, detail: { from: current.status, to } });
  revalidatePath("/contracts");
}

function contractTransitionPatch(
  current: { status: string },
  to: "REVIEW" | "SIGNED" | "ACTIVE"
): { contract: Prisma.ContractUpdateInput; event: { kind: "SENT" | "SIGNED" | "ACTIVATED"; detail?: string } | null } {
  if (to === "REVIEW") return { contract: { status: "REVIEW" }, event: { kind: "SENT", detail: "Chuyển sang review" } };
  if (to === "SIGNED") return { contract: { status: "SIGNED", signedAt: new Date() }, event: { kind: "SIGNED" } };
  return { contract: { status: "ACTIVE", effectiveAt: new Date() }, event: { kind: "ACTIVATED" } };
}

/** Gia hạn: ghi event RENEWED + cập nhật expiresAt (không xoá dữ liệu cũ). */
export async function renewContract(input: z.input<typeof contractRenewSchema>) {
  const session = await requireSession();
  assertCanManage(session.user);
  const data = contractRenewSchema.parse(input);
  await loadContract(data.id);

  await prisma.$transaction((tx) => renewInTx(tx, data, session.user.id));

  await audit({ userId: session.user.id, action: "RENEW", targetType: "Contract", targetId: data.id, detail: { expiresAt: data.expiresAt } });
  revalidatePath("/contracts");
}

export async function terminateContract(id: string, reason?: string) {
  const session = await requireSession();
  assertCanManage(session.user);
  const { id: contractId } = contractIdSchema.parse({ id });
  await loadContract(contractId);

  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: contractId }, data: { status: "TERMINATED" } });
    await tx.contractEvent.create({
      data: { contractId, kind: "TERMINATED", actorUserId: session.user.id, detail: reason ?? "Chấm dứt" }
    });
  });

  await audit({ userId: session.user.id, action: "TERMINATE", targetType: "Contract", targetId: contractId });
  revalidatePath("/contracts");
}

export async function listContractsDueForRenewal(days = 30) {
  await requireSession();
  return prisma.contract.findMany({
    where: buildFilterWhere({ expiringWithinDays: days } as never),
    include: { client: { select: { id: true, name: true } } },
    orderBy: { expiresAt: "asc" },
    take: 50
  });
}

export async function addContractEvent(input: z.input<typeof contractEventCreateSchema>) {
  const session = await requireSession();
  const data = contractEventCreateSchema.parse(input);
  await prisma.contractEvent.create({
    data: { contractId: data.id, kind: data.kind, actorUserId: session.user.id, detail: data.detail }
  });
  await audit({ userId: session.user.id, action: "EVENT", targetType: "Contract", targetId: data.id });
  revalidatePath("/contracts");
}

async function renewInTx(tx: Prisma.TransactionClient, data: { id: string; expiresAt: Date; note?: string }, actorId: string) {
  await tx.contract.update({ where: { id: data.id }, data: { status: "RENEWED", expiresAt: data.expiresAt } });
  await tx.contractEvent.create({
    data: {
      contractId: data.id,
      kind: "RENEWED",
      actorUserId: actorId,
      detail: data.note ?? `Gia hạn đến ${data.expiresAt.toISOString().slice(0, 10)}`
    }
  });
}
