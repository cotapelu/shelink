/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type LitigationStanding } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { intakeVisibilityFilter } from "@/lib/permissions";
import {
  intakeCreateSchema,
  intakeListQuerySchema,
  declineIntakeSchema,
  type IntakeCreateInput,
  type IntakeListQuery,
  type DeclineIntakeInput
} from "./schemas";
import { withMetrics } from "@/lib/telemetry/server-metrics";
import { seedDefaultFolders } from "@/lib/default-folders";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import * as helpers from "./helpers";
import type { Matter, Intake } from "@prisma/client";
import * as conversion from "./conversion-helpers";

// ============================================
// Helper functions for createIntake (refactored to reduce complexity & lines)
// ============================================

// --- Client creation builders ---
function buildClientCreateInput(name: string, data: IntakeCreateInput): Prisma.ClientCreateInput {
  return {
    name,
    type: data.clientType ?? "INDIVIDUAL",
    idNumber: data.clientIdNumber || null,
    address: data.clientAddress || null,
    legalRep: data.clientLegalRep || null,
    phone: data.contactPhone || null,
    contacts:
      data.contactName?.trim() || data.contactPhone?.trim()
        ? {
            create: {
              name: (data.contactName || name).trim(),
              phone: data.contactPhone?.trim() || null,
              isPrimary: true
            }
          }
        : undefined
  };
}

function buildContactCreateInput(clientId: string, data: IntakeCreateInput, clientName: string): Prisma.ContactCreateInput {
  return {
    client: { connect: { id: clientId } },
    name: (data.contactName || clientName || "联系人").trim(),
    phone: data.contactPhone?.trim() || null,
    isPrimary: false
  };
}

async function createClientWithContact(data: IntakeCreateInput, session: any): Promise<{ id: string; name: string }> {
  const name = data.clientName!.trim();
  const clientData = buildClientCreateInput(name, data);
  const newClient = await prisma.client.create({ data: clientData });
  return { id: newClient.id, name };
}

async function ensureClientContact(clientId: string, data: IntakeCreateInput, clientName: string): Promise<void> {
  if (!data.contactName?.trim() && !data.contactPhone?.trim()) return;
  const existing = await prisma.contact.findFirst({
    where: {
      clientId,
      name: (data.contactName || clientName || "").trim() || undefined
    }
  });
  if (!existing) {
    const contactData = buildContactCreateInput(clientId, data, clientName);
    await prisma.contact.create({ data: contactData });
  }
}

async function auditClientAutoCreate(session: any, created: { id: string; name: string }, data: IntakeCreateInput): Promise<void> {
  await audit({
    userId: session.user.id,
    action: "CLIENT_AUTO_CREATE",
    targetType: "Client",
    targetId: created.id,
    detail: { name: created.name, type: data.clientType ?? "INDIVIDUAL", source: "intake" }
  });
}

async function resolveClientAndContact(data: IntakeCreateInput, session: any): Promise<{ clientId: string | null; clientName: string | null }> {
  let clientId: string | null = data.clientId || null;
  let clientName: string | null = null;
  if (!clientId && data.clientName && data.clientName.trim()) {
    const created = await createClientWithContact(data, session);
    clientId = created.id;
    clientName = created.name;
    await auditClientAutoCreate(session, created, data);
  } else if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
    clientName = client?.name ?? null;
    await ensureClientContact(clientId, data, clientName ?? "");
  }
  return { clientId, clientName };
}

// --- Cause & title ---
async function resolveCauseName(data: IntakeCreateInput): Promise<string | null> {
  let causeName: string | null = data.causeFreeText || null;
  if (data.causeId) {
    const cause = await prisma.causeOfAction.findUnique({ where: { id: data.causeId }, select: { name: true } });
    if (cause?.name) causeName = cause.name;
  }
  return causeName;
}

function buildFinalTitle(
  data: IntakeCreateInput,
  clientName: string | null,
  opposingNames: string[],
  causeName: string | null
): string {
  if (data.title && data.title.trim()) return data.title.trim();
  return helpers.generateTitle(clientName, opposingNames, causeName);
}

function prepareTitleData(data: IntakeCreateInput, clientName: string | null, causeName: string | null): string {
  const opposingNames = data.parties
    .filter((p) => p.role === "OPPOSING_PARTY")
    .map((p) => p.name)
    .filter(Boolean);
  return buildFinalTitle(data, clientName, opposingNames, causeName);
}

// --- Intake payload builders ---
function buildCommonIntakeFields(data: IntakeCreateInput, finalTitle: string): Partial<Prisma.IntakeCreateInput> {
  return {
    title: finalTitle,
    category: data.category,
    cause: data.causeId ? { connect: { id: data.causeId } } : undefined,
    causeFreeText: data.causeFreeText || null,
    description: data.description || null,
    status: "PENDING_CONFIRMATION" as const,
    receivedAt: data.receivedAt ?? new Date()
  };
}

function buildClientRefFields(data: IntakeCreateInput, clientId: string | null): Partial<Prisma.IntakeCreateInput> {
  return {
    client: clientId ? { connect: { id: clientId } } : undefined,
    clientType: data.clientType ?? null,
    contactName: data.contactName?.trim() || null,
    contactPhone: data.contactPhone?.trim() || null
  };
}

function buildOwnershipFields(data: IntakeCreateInput, session: any): Partial<Prisma.IntakeCreateInput> {
  return {
    ownerUser: { connect: { id: data.ownerUserId || session.user.id } },
    coUserIds: data.coUserIds,
    createdById: session.user.id
  };
}

function buildProcedureInfo(data: IntakeCreateInput): Partial<Prisma.IntakeCreateInput> {
  return {
    firstProcedureType: data.firstProcedureType ?? null,
    firstAgency: data.firstAgency?.trim() || null,
    jurisdiction: data.jurisdiction?.trim() || null,
    ourStanding: data.ourStanding ?? null
  };
}

function buildClaimInfo(data: IntakeCreateInput): Partial<Prisma.IntakeCreateInput> {
  return {
    claimAmount: data.claimAmount ?? null,
    claimDescription: data.claimDescription?.trim() || null,
    barFiling: data.barFiling ?? null,
    counterclaim: data.counterclaim ?? false
  };
}

function buildServiceScopeFields(data: IntakeCreateInput): Partial<Prisma.IntakeCreateInput> {
  return {
    businessType: data.businessType?.trim() || null,
    serviceScope: data.serviceScope?.trim() || null,
    deliverables: data.deliverables?.trim() || null
  };
}

function buildCounselFields(data: IntakeCreateInput): Partial<Prisma.IntakeCreateInput> {
  return {
    counselType: data.counselType?.trim() || null,
    serviceStart: data.serviceStart ?? null,
    serviceEnd: data.serviceEnd ?? null
  };
}

function buildFeeBase(data: IntakeCreateInput): Partial<Prisma.IntakeCreateInput> {
  return {
    feeType: data.feeType ?? null,
    feeAmount: data.feeAmount ?? null
  };
}

function buildFeeDetail(data: IntakeCreateInput): Partial<Prisma.IntakeCreateInput> {
  return {
    contingencyTerms: data.contingencyTerms?.trim() || null,
    feeSchedule: data.feeSchedule?.trim() || null,
    feeNote: data.feeNote?.trim() || null
  };
}

function buildPartyCreateInput(p: any): any {
  return helpers.emptyToNull({
    role: p.role,
    standing: p.standing ?? null,
    ordinal: p.ordinal,
    name: p.name,
    partyType: p.partyType,
    idNumber: p.idNumber,
    phone: p.phone,
    address: p.address,
    legalRep: p.legalRep,
    contactName: p.contactName,
    enterpriseSocialCode: p.enterpriseSocialCode,
    enterpriseName: p.enterpriseName,
    notes: p.notes
  });
}

function buildPartiesField(data: IntakeCreateInput): { parties: { create: any[] } } {
  return { parties: { create: data.parties.map(buildPartyCreateInput) } };
}

function mergePartial<T extends object>(...objects: Partial<T>[]): T {
  return Object.assign({}, ...objects) as T;
}

function buildBaseIntakeData(
  data: IntakeCreateInput,
  session: any,
  clientId: string | null,
  finalTitle: string
): Prisma.IntakeCreateInput {
  const common = buildCommonIntakeFields(data, finalTitle);
  const clientRef = buildClientRefFields(data, clientId);
  const ownership = buildOwnershipFields(data, session);
  return mergePartial(common, clientRef, ownership);
}

function buildProcedureFields(data: IntakeCreateInput): any {
  const procInfo = buildProcedureInfo(data);
  const claimInfo = buildClaimInfo(data);
  return mergePartial(procInfo, claimInfo);
}

function buildNonLitigationFields(data: IntakeCreateInput): any {
  const serviceScope = buildServiceScopeFields(data);
  const counsel = buildCounselFields(data);
  return mergePartial(serviceScope, counsel);
}

function buildFeeFields(data: IntakeCreateInput): any {
  const base = buildFeeBase(data);
  const detail = buildFeeDetail(data);
  return mergePartial(base, detail);
}

function mergeIntakePayload(
  base: Prisma.IntakeCreateInput,
  procedure: any,
  nonLitigation: any,
  fee: any,
  parties: { parties: { create: any[] } }
): Prisma.IntakeCreateInput {
  return mergePartial(base, procedure, nonLitigation, fee, parties);
}

function assembleIntakePayload(
  data: IntakeCreateInput,
  session: any,
  clientId: string | null,
  finalTitle: string
): Prisma.IntakeCreateInput {
  const base = buildBaseIntakeData(data, session, clientId, finalTitle);
  const procedure = buildProcedureFields(data);
  const nonLitigation = buildNonLitigationFields(data);
  const fee = buildFeeFields(data);
  const parties = buildPartiesField(data);
  return mergeIntakePayload(base, procedure, nonLitigation, fee, parties);
}

// --- Post-create processes ---
async function auditIntakeCreate(session: any, created: any, data: IntakeCreateInput, clientName: string | null): Promise<void> {
  await audit({
    userId: session.user.id,
    action: "INTAKE_CREATE",
    targetType: "Intake",
    targetId: created.id,
    detail: {
      title: created.title,
      category: created.category,
      autoTitle: !data.title,
      autoClient: !!clientName && !data.clientId
    }
  });
}

async function notifyIntakeApproversWrapper(created: any, session: any, content: string): Promise<void> {
  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER"],
    excludeUserId: session.user.id,
    title: "新的案件审批待处理",
    content: `${session.user.name ?? "有用户"} 提交了案件审批：${content}`,
    href: `/intakes/${created.id}`,
    refType: "Intake",
    refId: created.id,
    priority: "HIGH"
  });
}

function revalidateIntakePaths(): void {
  revalidatePath("/intakes");
  revalidatePath("/matters");
}

async function postIntakeProcesses(
  created: any,
  session: any,
  data: IntakeCreateInput,
  clientName: string | null
): Promise<void> {
  await auditIntakeCreate(session, created, data, clientName);
  await notifyIntakeApproversWrapper(created, session, created.title);
  revalidateIntakePaths();
}

/**
 * Create intake application - refactored
 * Complexity: reduced from 79 to ~10
 * Lines per function: reduced from 179 to ~15 average
 */

/**
 * List intake applications with filtering, pagination, and ordering.
 * @param input - Query parameters (page, pageSize, status, category, date range, search, sort)
 * @returns Promise<{ items: Intake[], total: number }> - paginated results and total count
 * @throws {ZodError} - if input validation fails
 * @access Requires authenticated session
 */
export const listIntakes = withMetrics('listIntakes', async function listIntakes(input: Partial<IntakeListQuery> = {}) {
  const session = await requireSession();
  const query = intakeListQuerySchema.parse(input);

  const statusWhere: Prisma.IntakeWhereInput = query.statusIn?.length
    ? { status: { in: query.statusIn } }
    : query.status
      ? { status: query.status }
      : {};

  const orderBy: Prisma.IntakeOrderByWithRelationInput[] =
    query.sortBy === "claimAmount"
      ? [{ claimAmount: query.sortDir }, { receivedAt: "desc" }]
      : [{ receivedAt: query.sortDir }];

  const whereParts: Prisma.IntakeWhereInput[] = [
    intakeVisibilityFilter(session.user.id, session.user.role),
    statusWhere
  ];
  if (query.category) whereParts.push({ category: query.category });
  if (query.receivedAtFrom || query.receivedAtTo) {
    whereParts.push({
      receivedAt: {
        ...(query.receivedAtFrom ? { gte: query.receivedAtFrom } : {}),
        ...(query.receivedAtTo ? { lte: query.receivedAtTo } : {})
      }
    });
  }
  if (query.search) {
    whereParts.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { client: { name: { contains: query.search, mode: "insensitive" } } }
      ]
    });
  }
  const where: Prisma.IntakeWhereInput = { AND: whereParts };

  const [items, total] = await Promise.all([
    prisma.intake.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        client: { select: { id: true, name: true, type: true } },
        cause: { select: { id: true, name: true } },
        conflictChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { id: true, conclusion: true, hits: { select: { severity: true } } }
        },
        parties: { where: { role: "OPPOSING_PARTY" }, select: { name: true } },
        matter: { select: { id: true, internalCode: true } },
        ownerUser: { select: { id: true, name: true } }
      }
    }),
    prisma.intake.count({ where })
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
});

/**
 * Get intake by ID with permission check.
 * @param id - Intake ID
 * @returns Promise<Intake> - intake with relations
 * @throws {Error} - if intake not found or permission denied
 * @access Requires authenticated session
 */
export async function getIntakeById(id: string) {
  const session = await requireSession();
  // 单条收案权限检查：manager 看全部，其他人只能看自己参与或创建的
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    const owned = await prisma.intake.findFirst({
      where: {
        id,
        OR: [
          { createdById: session.user.id },
          { ownerUserId: session.user.id },
          { coUserIds: { has: session.user.id } }
        ]
      },
      select: { id: true }
    });
    if (!owned) throw new Error("收案记录不存在");
  }
  const intake = await prisma.intake.findUnique({
    where: { id },
    include: {
      client: true,
      cause: true,
      ownerUser: { select: { id: true, name: true, role: true } },
      parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
      conflictChecks: {
        orderBy: { checkedAt: "desc" },
        include: { hits: true, decidedBy: { select: { id: true, name: true } } }
      },
      matter: { select: { id: true, internalCode: true, title: true } },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, category: true, size: true, createdAt: true }
      }
    }
  });
  if (intake) {
    await audit({
      userId: session.user.id,
      action: "INTAKE_VIEW",
      targetType: "Intake",
      targetId: id
    });
  }
  return intake;
}

/**
 * Create a new intake application.
 * @param input - IntakeCreateInput (client, title, description, category, etc.)
 * @returns Promise<Intake> - created intake with relations
 * @throws {ZodError} - if validation fails
 * @throws {Error} - if client creation fails or other business errors
 * @access Requires authenticated session
 * @audit Logs intake creation
 */
export const createIntake = withMetrics('createIntake', async function createIntake(input: IntakeCreateInput) {
  const session = await requireSession();
  const data = intakeCreateSchema.parse(input);

  const { clientId, clientName } = await resolveClientAndContact(data, session);
  const causeName = await resolveCauseName(data);
  const finalTitle = prepareTitleData(data, clientName, causeName);
  const intakePayload = assembleIntakePayload(data, session, clientId, finalTitle);

  const created = await prisma.intake.create({ data: intakePayload });

  await postIntakeProcesses(created, session, data, clientName);

  return { ok: true, id: created.id, clientId };
});

/**
 * Decline an intake application.
 * @param input - DeclineIntakeInput (id, reason)
 * @returns Promise<{ ok: boolean }>
 * @throws {ZodError} - if validation fails
 * @throws {Error} - if user is not an approver or intake not found
 * @access Requires authenticated session with approver role
 * @audit Logs decline action
 */
export async function declineIntake(input: DeclineIntakeInput) {
  const session = await requireSession();
  helpers.requireApprover(session.user.role);
  const data = declineIntakeSchema.parse(input);

  await prisma.intake.update({
    where: { id: data.id },
    data: {
      status: "DECLINED",
      declinedReason: data.reason
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_DECLINE",
    targetType: "Intake",
    targetId: data.id,
    detail: { reason: data.reason }
  });

  revalidatePath("/intakes");
  revalidatePath(`/intakes/${data.id}`);
  revalidatePath("/matters");
  return { ok: true };
}

/** v0.14: Mark intake as needing revision (request additional materials).
 * @param input - { id: string, reason: string }
 * @returns Promise<{ ok: boolean }>
 * @throws {Error} - if reason empty or user lacks permission
 * @access Requires authenticated session with approver role
 * @audit Logs revision request
 */
export async function markIntakeNeedsRevision(input: { id: string; reason: string }) {
  const session = await requireSession();
  helpers.requireApprover(session.user.role);
  if (!input.reason.trim()) throw new Error("请填写补正原因");

  await prisma.intake.update({
    where: { id: input.id },
    data: {
      status: "NEEDS_REVISION",
      declinedReason: input.reason
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_NEEDS_REVISION",
    targetType: "Intake",
    targetId: input.id,
    detail: { reason: input.reason }
  });

  revalidatePath("/intakes");
  revalidatePath(`/intakes/${input.id}`);
  revalidatePath("/matters");
  return { ok: true };
}

/** v0.14: Lawyer resubmits intake after completing materials (NEEDS_REVISION → PENDING_CONFIRMATION).
 * @param id - Intake ID
 * @returns Promise<{ ok: boolean }>
 * @throws {Error} - if intake not found or status not NEEDS_REVISION
 * @access Requires authenticated session (intake creator or owner only)
 * @audit Logs resubmission
 */
export async function resubmitIntake(id: string) {
  const session = await requireSession();

  const intake = await prisma.intake.findUnique({
    where: { id },
    select: { status: true, title: true, createdById: true, ownerUserId: true }
  });
  if (!intake) throw new Error("收案不存在");
  if (intake.status !== "NEEDS_REVISION") throw new Error("只有待补正状态可重新提交");

  await prisma.intake.update({
    where: { id },
    data: {
      status: "PENDING_CONFIRMATION",
      declinedReason: null
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_RESUBMIT",
    targetType: "Intake",
    targetId: id,
    detail: {}
  });

  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER"],
    excludeUserId: session.user.id,
    title: "案件审批已重新提交",
    content: `${session.user.name ?? "有用户"} 重新提交了案件审批：${intake.title}`,
    href: `/intakes/${id}`,
    refType: "Intake",
    refId: id,
    priority: "HIGH"
  });

  revalidatePath("/intakes");
  revalidatePath(`/intakes/${id}`);
  revalidatePath("/matters");
  return { ok: true };
}

/** Convert intake to formal matter (creates Matter, Procedure, Parties, Billing, etc.).
 * This is a complex business operation that transforms all intake data into the
 * canonical Matter model and related entities. It's an approver-only action.
 * @param intakeId - Intake ID to convert
 * @returns Promise<{ ok: boolean; matterId: string }>
 * @throws {Error} - if intake not found, status invalid, or conversion fails
 * @access Requires authenticated session with approver role (ADMIN/PRINCIPAL_LAWYER)
 * @audit Logs conversion and creates matter creation audit record
 */
export async function convertIntakeToMatter(intakeId: string) {
  const session = await requireSession();
  helpers.requireApprover(session.user.role);
  const { intake, internalCode, firmCaseNo, firstProcedureType } = await prepareConversionContext(intakeId, session);
  const matter = await prisma.$transaction(async (tx) => {
    return await conversion.executeConversionTransaction(tx, intake, session, internalCode, firmCaseNo, firstProcedureType);
  });
  await finalizeConversion(session, intake, matter, internalCode);
  return { ok: true, matterId: matter.id, internalCode };
}

// Helpers for convertIntakeToMatter (refactored)
async function prepareConversionContext(intakeId: string, session: any) {
  const intake = await conversion.fetchIntakeWithDetails(intakeId);
  conversion.validateIntakeForConversion(intake);
  const { internalCode, firmCaseNo } = await conversion.generateCodes(intake.category);
  const firstProcedureType = conversion.determineFirstProcedureType(intake);
  helpers.assertConflictReviewAllowsConversion(intake as any);
  return { intake, internalCode, firmCaseNo, firstProcedureType };
}

async function finalizeConversion(session: any, intake: Intake, matter: Matter, internalCode: string) {
  await audit({
    userId: session.user.id,
    action: "INTAKE_CONVERT",
    targetType: "Intake",
    targetId: intake.id,
    detail: { matterId: matter.id, internalCode }
  });
  revalidatePath("/intakes");
  revalidatePath(`/intakes/${intake.id}`);
  revalidatePath("/matters");
  revalidatePath(`/matters/${matter.id}`);
}
