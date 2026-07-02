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

  // ----- 解析客户：已选 / 自由输入新建 -----
  let resolvedClientId: string | null = data.clientId || null;
  let resolvedClientName: string | null = null;

  if (!resolvedClientId && data.clientName && data.clientName.trim()) {
    const name = data.clientName.trim();
    const newClient = await prisma.client.create({
      data: {
        name,
        type: data.clientType ?? "INDIVIDUAL",
        idNumber: data.clientIdNumber || null,
        address: data.clientAddress || null,
        legalRep: data.clientLegalRep || null,
        phone: data.contactPhone || null,
        // 同步建一个主联系人
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
      }
    });
    resolvedClientId = newClient.id;
    resolvedClientName = name;
    await audit({
      userId: session.user.id,
      action: "CLIENT_AUTO_CREATE",
      targetType: "Client",
      targetId: newClient.id,
      detail: { name, type: newClient.type, source: "intake" }
    });
  } else if (resolvedClientId) {
    const c = await prisma.client.findUnique({
      where: { id: resolvedClientId },
      select: { name: true }
    });
    resolvedClientName = c?.name ?? null;

    // 已有客户也补一条联系人（如果填了且现有不存在同名联系人）
    if (data.contactName?.trim() || data.contactPhone?.trim()) {
      const existing = await prisma.contact.findFirst({
        where: {
          clientId: resolvedClientId,
          name: (data.contactName || resolvedClientName || "").trim() || undefined
        }
      });
      if (!existing) {
        await prisma.contact.create({
          data: {
            clientId: resolvedClientId,
            name: (data.contactName || resolvedClientName || "联系人").trim(),
            phone: data.contactPhone?.trim() || null,
            isPrimary: false
          }
        });
      }
    }
  }

  // ----- 案由名（用于自动 title）-----
  let causeName: string | null = data.causeFreeText || null;
  if (data.causeId) {
    const cause = await prisma.causeOfAction.findUnique({
      where: { id: data.causeId },
      select: { name: true }
    });
    causeName = cause?.name ?? causeName;
  }

  const opposingNames = data.parties
    .filter((p) => p.role === "OPPOSING_PARTY")
    .map((p) => p.name)
    .filter(Boolean);

  const finalTitle =
    data.title && data.title.trim()
      ? data.title.trim()
      : helpers.generateTitle(resolvedClientName, opposingNames, causeName);

  const created = await prisma.intake.create({
    data: {
      title: finalTitle,
      category: data.category,
      causeId: data.causeId || null,
      causeFreeText: data.causeFreeText || null,
      description: data.description || null,
      status: "PENDING_CONFIRMATION",
      receivedAt: data.receivedAt ?? new Date(),

      clientId: resolvedClientId,
      clientType: data.clientType ?? null,
      contactName: data.contactName?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,

      firstProcedureType: data.firstProcedureType ?? null,
      firstAgency: data.firstAgency?.trim() || null,
      jurisdiction: data.jurisdiction?.trim() || null,
      ourStanding: data.ourStanding ?? null,
      claimAmount: data.claimAmount ?? null,
      claimDescription: data.claimDescription?.trim() || null,
      barFiling: data.barFiling ?? null,
      counterclaim: data.counterclaim ?? false,

      businessType: data.businessType?.trim() || null,
      serviceScope: data.serviceScope?.trim() || null,
      deliverables: data.deliverables?.trim() || null,
      counselType: data.counselType?.trim() || null,
      serviceStart: data.serviceStart ?? null,
      serviceEnd: data.serviceEnd ?? null,

      feeType: data.feeType ?? null,
      feeAmount: data.feeAmount ?? null,
      contingencyTerms: data.contingencyTerms?.trim() || null,
      feeSchedule: data.feeSchedule?.trim() || null,
      feeNote: data.feeNote?.trim() || null,

      ownerUserId: data.ownerUserId || session.user.id,
      coUserIds: data.coUserIds,

      createdById: session.user.id,
      parties: {
        create: data.parties.map((p) =>
          helpers.emptyToNull({
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
          })
        )
      }
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_CREATE",
    targetType: "Intake",
    targetId: created.id,
    detail: {
      title: created.title,
      category: created.category,
      autoTitle: !data.title,
      autoClient: !!resolvedClientName && !data.clientId
    }
  });

  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER"],
    excludeUserId: session.user.id,
    title: "新的案件审批待处理",
    content: `${session.user.name ?? "有用户"} 提交了案件审批：${created.title}`,
    href: `/intakes/${created.id}`,
    refType: "Intake",
    refId: created.id,
    priority: "HIGH"
  });

  revalidatePath("/intakes");
  revalidatePath("/matters");
  return { ok: true, id: created.id, clientId: resolvedClientId };
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
  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    include: {
      client: true,
      parties: true,
      conflictChecks: {
        orderBy: { checkedAt: "desc" },
        take: 1,
        select: {
          conclusion: true,
          note: true,
          queryPayload: true,
          hits: { select: { severity: true } }
        }
      },
      documents: { select: { id: true } }
    }
  });
  if (!intake) throw new Error("Intake 不存在");
  if (intake.status === "CONVERTED") throw new Error("此 Intake 已转化");
  helpers.assertConflictReviewAllowsConversion(intake);

  const { generateInternalCode, generateFirmCaseNo } = await import("@/server/matters/code-generator");
  const internalCode = await generateInternalCode(intake.category);
  const firmCaseNo = await generateFirmCaseNo(intake.category);

  // 首程序类型：优先用 intake 选的，缺失按案件类别推断
  const firstProcedureType =
    intake.firstProcedureType ??
    (intake.category === "CIVIL_COMMERCIAL" ||
    intake.category === "CRIMINAL" ||
    intake.category === "ADMINISTRATIVE"
      ? "FIRST_INSTANCE"
      : "NON_LITIGATION_PHASE");

  const matter = await prisma.$transaction(async (tx) => {
    const ownerId = intake.ownerUserId ?? session.user.id;

    const m = await tx.matter.create({
      data: {
        internalCode,
        firmCaseNo,
        title: intake.title,
        category: intake.category,
        ownerId,
        causeId: intake.causeId,
        causeFreeText: intake.causeFreeText,
        primaryClientId: intake.clientId,
        intakeId: intake.id,
        intakeDate: intake.receivedAt,
        ourStanding: intake.ourStanding,
        claimAmount: intake.claimAmount,
        // 是否反诉：按我方地位推断角色（被告提反诉→反诉原告；原告被反诉→反诉被告）
        counterclaimAsPlaintiff:
          !!intake.counterclaim &&
          (intake.ourStanding === "DEFENDANT" || intake.ourStanding === "JOINT_DEFENDANT"),
        counterclaimAsDefendant:
          !!intake.counterclaim &&
          (intake.ourStanding === "PLAINTIFF" || intake.ourStanding === "JOINT_PLAINTIFF"),
        barFiling: intake.barFiling,
        // v0.35: 非诉/顾问/专项 专属字段带入
        businessType: intake.businessType,
        serviceScope: intake.serviceScope,
        deliverables: intake.deliverables,
        counselType: intake.counselType,
        serviceStart: intake.serviceStart,
        serviceEnd: intake.serviceEnd,
        // 主办自动作为 LEAD；coUserIds 作为 CO_LEAD
        members: {
          create: [
            { userId: ownerId, role: "LEAD" },
            ...intake.coUserIds
              .filter((uid) => uid !== ownerId)
              .map((uid) => ({ userId: uid, role: "CO_LEAD" as const }))
          ]
        },
        clientLinks: intake.clientId
          ? { create: { clientId: intake.clientId, isPrimary: true, label: "主要委托方" } }
          : undefined,
      }
    });

    const procedurePartyRows: { partyId: string; standing: LitigationStanding; ordinal: number }[] = [];
    let nextProcedurePartyOrdinal = 1;

    if (intake.client && intake.ourStanding) {
      const clientParty = await tx.party.create({
        data: {
          matterId: m.id,
          role: "CLIENT_PARTY",
          standing: intake.ourStanding,
          ordinal: 1,
          name: intake.client.name,
          partyType: helpers.clientTypeToPartyType(intake.client.type),
          idNumber: intake.client.type === "INDIVIDUAL" ? intake.client.idNumber : null,
          phone: intake.client.phone,
          address: intake.client.address,
          legalRep: intake.client.legalRep,
          contactName: intake.contactName,
          enterpriseSocialCode: intake.client.type === "INDIVIDUAL" ? null : intake.client.idNumber,
          enterpriseName: intake.client.type === "INDIVIDUAL" ? null : intake.client.name,
          notes: "由收案委托方自动带入首程序"
        },
        select: { id: true }
      });
      procedurePartyRows.push({
        partyId: clientParty.id,
        standing: intake.ourStanding,
        ordinal: nextProcedurePartyOrdinal++
      });
    }

    for (const p of intake.parties) {
      const party = await tx.party.create({
        data: {
          matterId: m.id,
          role: p.role,
          standing: p.standing,
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
        },
        select: { id: true }
      });
      if (p.standing) {
        procedurePartyRows.push({
          partyId: party.id,
          standing: p.standing,
          ordinal: nextProcedurePartyOrdinal++
        });
      }
    }

    const firstProcedure = await tx.matterProcedure.create({
      data: {
        matterId: m.id,
        type: firstProcedureType,
        engagement: "ENGAGED",
        order: 1,
        status: "IN_PROGRESS",
        handlingAgency: intake.firstAgency,
        // 程序级信息从收案带入首程序（原先丢失）
        jurisdiction: intake.jurisdiction,
        ourStanding: intake.ourStanding
      },
      select: { id: true }
    });

    if (procedurePartyRows.length > 0) {
      await tx.procedureParty.createMany({
        data: procedurePartyRows.map((row) => ({
          procedureId: firstProcedure.id,
          partyId: row.partyId,
          standing: row.standing,
          ordinal: row.ordinal
        })),
        skipDuplicates: true
      });
    }

    // 律师费 → Billing
    if (intake.feeAmount && intake.feeType) {
      const feeTypeLabel: Record<string, string> = {
        FIXED: "固定收费",
        CONTINGENCY: "风险代理"
      };
      await tx.billing.create({
        data: {
          matterId: m.id,
          title: `委托代理合同 - ${feeTypeLabel[intake.feeType] ?? intake.feeType}`,
          contractAmount: intake.feeAmount,
          schedule: intake.feeSchedule,
          status: "ACTIVE"
        }
      });
    }

    // 把 Intake 上传的合同回填 matterId（保留 intakeId 溯源）
    if (intake.documents.length > 0) {
      await tx.document.updateMany({
        where: { intakeId: intake.id },
        data: { matterId: m.id }
      });
    }

    await tx.intake.update({
      where: { id: intake.id },
      data: { status: "CONVERTED" }
    });

    await tx.timelineEvent.create({
      data: {
        matterId: m.id,
        eventType: "MATTER_CREATED",
        title: `案件已创建（来自 Intake）`,
        occurredAt: new Date()
      }
    });

    // v0.8: 默认卷宗
    await seedDefaultFolders(tx, m.id, intake.category);

    return m;
  });

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
  return { ok: true, matterId: matter.id, internalCode };
}
