/*
 * Server actions module Báo giá (DATA-MODEL §4.28, PRD §10.4).
 * Phân quyền: ADMIN/OWNER/MANAGER tạo+duyệt; STAFF chỉ nháp của mình.
 * Mọi hàm ≤20 dòng (GOAL §3.1); logic nặng tách sang helper/phần dưới.
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertManagerOrRole, clientVisibilityFilter } from "@/lib/permissions";
import { nextSequenceCode } from "@/lib/code-generator";
import { createMatter } from "@/server/matters/actions";
import { computeQuotePricing, lineAmount } from "./pricing";
import {
  convertQuoteSchema,
  quoteCreateSchema,
  quoteIdSchema,
  quoteListFilterSchema,
  quoteUpdateSchema,
  type QuoteCreateInput
} from "./schemas";

type Actor = { id: string; role: string };

const toDecimal = (n: number) => new Prisma.Decimal(n);

function assertCanManage(actor: Actor) {
  assertManagerOrRole(actor.role, "ADMIN", "OWNER", "MANAGER");
}

function assertCanEditQuote(actor: Actor, quote: { createdById: string | null }) {
  if (quote.createdById !== actor.id) assertCanManage(actor);
}

async function loadEditableQuote(id: string) {
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote || quote.deletedAt) throw new Error("[ERROR] Quote - báo giá không tồn tại - id không đúng hoặc đã xoá");
  return quote;
}

function buildFilterWhere(filter: z.infer<typeof quoteListFilterSchema>, actor: Actor): Prisma.QuoteWhereInput {
  const where: Prisma.QuoteWhereInput = {
    deletedAt: null,
    client: clientVisibilityFilter(actor.id, actor.role)
  };
  if (filter.scope === "mine") where.createdById = actor.id;
  if (filter.status) where.status = filter.status;
  if (filter.clientId) where.clientId = filter.clientId;
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { code: { contains: filter.search, mode: "insensitive" } }
    ];
  }
  return where;
}

function quoteMoneyData(pricing: { subtotal: number; total: number }) {
  return { subtotal: toDecimal(pricing.subtotal), total: toDecimal(pricing.total) };
}

function quoteIdentityData(data: QuoteCreateInput, ctx: { code: string; actor: Actor }) {
  return {
    code: ctx.code,
    title: data.title,
    clientId: data.clientId,
    contactId: data.contactId,
    matterId: data.matterId,
    intakeId: data.intakeId,
    ownerUserId: data.ownerUserId ?? ctx.actor.id,
    createdById: ctx.actor.id
  };
}

function quoteTermsData(data: QuoteCreateInput, pricing: { subtotal: number; total: number }) {
  return {
    currency: data.currency,
    validDays: data.validDays,
    discountPercent: toDecimal(data.discountPercent),
    taxPercent: toDecimal(data.taxPercent),
    ...quoteMoneyData(pricing),
    note: data.note
  };
}

function quoteCreateData(data: QuoteCreateInput, ctx: { code: string; actor: Actor }) {
  const pricing = computeQuotePricing({ items: data.items, discountPercent: data.discountPercent, taxPercent: data.taxPercent });
  return { pricing, data: { ...quoteIdentityData(data, ctx), ...quoteTermsData(data, pricing) } };
}

async function persistItems(tx: Prisma.TransactionClient, quoteId: string, items: QuoteCreateInput["items"]) {
  await tx.quoteItem.deleteMany({ where: { quoteId } });
  await Promise.all(
    items.map((item, index) =>
      tx.quoteItem.create({
        data: {
          quoteId,
          name: item.name,
          description: item.description,
          unit: item.unit,
          quantity: toDecimal(item.quantity),
          unitPrice: toDecimal(item.unitPrice),
          amount: toDecimal(lineAmount(item.quantity, item.unitPrice)),
          orderIndex: index
        }
      })
    )
  );
}

export async function listQuotes(input?: z.input<typeof quoteListFilterSchema>) {
  const session = await requireSession();
  const filter = quoteListFilterSchema.parse(input ?? {});
  const where = buildFilterWhere(filter, session.user);

  const [rows, total] = await prisma.$transaction([
    prisma.quote.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize
    }),
    prisma.quote.count({ where })
  ]);
  return { rows, total, page: filter.page, pageSize: filter.pageSize };
}

export async function getQuote(id: string) {
  await requireSession();
  const { id: quoteId } = quoteIdSchema.parse({ id });
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, deletedAt: null },
    include: {
      items: { orderBy: { orderIndex: "asc" } },
      client: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      matter: { select: { id: true, title: true, internalCode: true } }
    }
  });
  if (!quote) throw new Error("[ERROR] Quote Read - không tìm thấy báo giá - kiểm tra id hoặc đã bị xoá");
  return quote;
}

export async function createQuote(input: z.input<typeof quoteCreateSchema>) {
  const session = await requireSession();
  const data = quoteCreateSchema.parse(input);
  const code = await nextSequenceCode("QT");
  const { pricing, data: createData } = quoteCreateData(data, { code, actor: session.user });

  const quote = await prisma.$transaction(async (tx) => {
    const created = await tx.quote.create({ data: createData });
    await persistItems(tx, created.id, data.items);
    return created;
  });

  await audit({ userId: session.user.id, action: "CREATE", targetType: "Quote", targetId: quote.id, detail: { code, total: pricing.total } });
  revalidatePath("/quotes");
  return quote;
}

export async function updateQuote(input: z.input<typeof quoteUpdateSchema>) {
  const session = await requireSession();
  const data = quoteUpdateSchema.parse(input);
  const current = await loadEditableQuote(data.id);
  assertCanEditQuote(session.user, current);
  if (current.status !== "DRAFT") {
    throw new Error("[ERROR] Quote Update - chỉ sửa báo giá ở trạng thái nháp - hãy tạo báo giá mới khi đã gửi");
  }
  const { data: updateData } = quoteCreateData(data, { code: current.code, actor: session.user });
  delete (updateData as { code?: string }).code;

  await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: data.id }, data: updateData });
    await persistItems(tx, data.id, data.items);
  });

  await audit({ userId: session.user.id, action: "UPDATE", targetType: "Quote", targetId: data.id });
  revalidatePath("/quotes");
}

export async function deleteQuote(id: string) {
  const session = await requireSession();
  const { id: quoteId } = quoteIdSchema.parse({ id });
  const current = await loadEditableQuote(quoteId);
  assertCanEditQuote(session.user, current);
  await prisma.quote.update({ where: { id: quoteId }, data: { deletedAt: new Date() } });
  await audit({ userId: session.user.id, action: "DELETE", targetType: "Quote", targetId: quoteId });
  revalidatePath("/quotes");
}

function quoteStatusPatch(current: { validDays: number }, status: string): Prisma.QuoteUpdateInput {
  if (status === "SENT") {
    return { status: "SENT", issuedAt: new Date(), expiresAt: new Date(Date.now() + current.validDays * 86400000) };
  }
  return { status: status as Prisma.EnumQuoteStatusFilter["equals"] };
}

export async function setQuoteStatus(id: string, status: "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED") {
  const session = await requireSession();
  const { id: quoteId } = quoteIdSchema.parse({ id });
  const current = await loadEditableQuote(quoteId);
  assertCanManage(session.user);

  await prisma.quote.update({ where: { id: quoteId }, data: quoteStatusPatch(current, status) });
  await audit({ userId: session.user.id, action: "STATUS", targetType: "Quote", targetId: quoteId, detail: { from: current.status, to: status } });
  revalidatePath("/quotes");
}

/** Chuyển báo giá thành hợp đồng trong một transaction (DATA-MODEL §4.29). */
export async function convertQuoteToContract(input: z.input<typeof convertQuoteSchema>) {
  const session = await requireSession();
  assertCanManage(session.user);
  const data = convertQuoteSchema.parse(input);
  const quote = await loadEditableQuote(data.id);
  if (quote.status === "CONVERTED") throw new Error("[ERROR] Quote Convert - báo giá đã chuyển trước đó");

  const code = await nextSequenceCode("CT");
  const contract = await prisma.$transaction((tx) =>
    convertQuoteInTx(tx, quote, code, data, session.user.id)
  );

  await audit({ userId: session.user.id, action: "CONVERT", targetType: "Quote", targetId: quote.id, detail: { contractId: contract.id } });
  revalidatePath("/quotes");
  revalidatePath("/contracts");
  return contract;
}

async function convertQuoteInTx(
  tx: Prisma.TransactionClient,
  quote: { id: string; code: string; title: string; clientId: string; total: Prisma.Decimal; currency: string; ownerUserId: string | null },
  code: string,
  data: z.infer<typeof convertQuoteSchema>,
  actorId: string
) {
  const created = await tx.contract.create({ data: contractDataFromQuote(quote, code, actorId, data) });
  await tx.contractEvent.create({
    data: { contractId: created.id, kind: "CREATED", actorUserId: actorId, detail: `Tạo từ báo giá ${quote.code}` }
  });
  await tx.quote.update({ where: { id: quote.id }, data: { status: "CONVERTED", contractId: created.id } });
  return created;
}

function contractDates(data: z.infer<typeof convertQuoteSchema>) {
  return {
    signedAt: data.signedAt,
    effectiveAt: data.effectiveAt,
    expiresAt: data.expiresAt,
    paymentTerms: data.paymentTerms
  };
}

function contractDataFromQuote(
  quote: { id: string; title: string; clientId: string; total: Prisma.Decimal; currency: string; ownerUserId: string | null },
  code: string,
  actorId: string,
  data: z.infer<typeof convertQuoteSchema>
) {
  return {
    code,
    title: data.title ?? quote.title,
    clientId: quote.clientId,
    quoteId: quote.id,
    amount: quote.total,
    currency: quote.currency,
    ...contractDates(data),
    ownerUserId: quote.ownerUserId ?? actorId,
    createdById: actorId
  };
}

/** Chuyển báo giá thành dự án (tái dùng createMatter đã có). */
export async function convertQuoteToMatter(input: z.input<typeof convertQuoteSchema>) {
  const session = await requireSession();
  assertCanManage(session.user);
  const data = convertQuoteSchema.parse(input);
  const quote = await loadEditableQuote(data.id);
  if (quote.status === "CONVERTED") throw new Error("[ERROR] Quote Convert - báo giá đã chuyển trước đó");

  const created = await createMatter(quoteToMatterInput(quote, data.category));
  await prisma.quote.update({ where: { id: quote.id }, data: { status: "CONVERTED", matterId: created.id } });

  await audit({ userId: session.user.id, action: "CONVERT", targetType: "Quote", targetId: quote.id, detail: { matterId: created.id } });
  revalidatePath("/quotes");
  revalidatePath("/matters");
  return created;
}

/** Input tạo dự án từ báo giá (giai đoạn trung lập NON_LITIGATION_PHASE cho mọi ngành). */
function quoteToMatterInput(
  quote: { title: string; clientId: string; total: Prisma.Decimal },
  category: string | undefined
) {
  return {
    title: quote.title,
    category: (category ?? "NON_LITIGATION") as Parameters<typeof createMatter>[0]["category"],
    clientIds: [quote.clientId] as [string],
    claimAmount: Number(quote.total),
    parties: [],
    counterclaimAsPlaintiff: false,
    counterclaimAsDefendant: false,
    firstProcedure: { type: "NON_LITIGATION_PHASE" as const }
  };
}
