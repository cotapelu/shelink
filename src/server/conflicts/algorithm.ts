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
/**
 * Thuật toán kiểm tra xung đột (V2)
 *
 * Khác biệt chính so với V1:
 *   - V1 coi "cùng tên trong client library" cũng là hit và đánh dấu HIGH, dẫn đến ảo giác "tự mình xung đột".
 *     (Có client档案 trùng tên ≠ xung đột lợi ích).
 *   - V2 định nghĩa chặt "xung đột lợi ích": Candidate party có vai trò trong Matter cũ tương tác với
 *     candidate vai trò lần này. Hit chỉ rơi vào Matter, không vào Client.
 *   - Client档案 trùng tên riêng ra thành sameNameClients hint, không nhuộm màu, không tính vào hits.
 *   - Số ID card nhất quán → riêng ra thành idMatchedClients (strong hint, mở ra xác minh thủ công).
 *
 * Xác định mức độ:
 *   Candidate CLIENT_PARTY × Lịch sử OPPOSING_PARTY → HIGH        Đối thủ cũ trở thành người ủy thác
 *   Candidate OPPOSING_PARTY × Lịch sử CLIENT_PARTY    → BLOCKING    Bên được dự kiến từng là khách hàng của firm
 *   Candidate OPPOSING_PARTY × Lịch sử OPPOSING_PARTY → LOW         Gợi ý lịch sử đối đầu, có thể tiếp tục
 *   Candidate CLIENT_PARTY  ×  Lịch sử CLIENT_PARTY    → LOW         Khách hàng quen quay lại
 *   Candidate THIRD_PARTY    ×  Bất kỳ                → MEDIUM
 *   ID card giống nhau → tăng 1 cấp trên mức độ cơ bản (BLOCKING là cao nhất)
 */

import type { Prisma, PartyRole, LitigationStanding, MatterCategory, MatterStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type QueryItem = {
  role: PartyRole;
  name: string;
  idNumber?: string;
};

export type MatterInfoForHit = {
  matterId: string;
  internalCode: string;
  title: string;
  category: MatterCategory;
  status: MatterStatus;
  intakeDate: Date | null;
  causeText: string | null;
  ownerName: string | null;
  partyRole: PartyRole;
  partyStanding: LitigationStanding | null;
};

const matterInfoSelect = {
  id: true,
  internalCode: true,
  title: true,
  category: true,
  status: true,
  intakeDate: true,
  cause: { select: { name: true } },
  causeFreeText: true,
  owner: { select: { name: true } }
} as const;

export type SelectedMatterInfo = Prisma.MatterGetPayload<{ select: typeof matterInfoSelect }>;

export function toMatterInfo(
  matter: SelectedMatterInfo,
  partyRole: PartyRole,
  partyStanding: LitigationStanding | null
): MatterInfoForHit {
  return {
    matterId: matter.id,
    internalCode: matter.internalCode,
    title: matter.title,
    category: matter.category,
    status: matter.status,
    intakeDate: matter.intakeDate,
    causeText: matter.cause?.name ?? matter.causeFreeText ?? null,
    ownerName: matter.owner?.name ?? null,
    partyRole,
    partyStanding
  };
}

export type ConflictHitDraft = {
  hitType: "HISTORICAL_PARTY";
  targetType: "Matter";
  targetId: string;
  matchedName: string;
  matchedField: "name" | "idNumber";
  matchedValue: string;
  matchedRatio: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";
  reason: string;
  matterInfo: MatterInfoForHit;
};

export type SameNameClient = {
  clientId: string;
  name: string;
};

export type IdMatchedClient = {
  clientId: string;
  name: string;
  idNumber: string;
};

export type ConflictCheckResult = {
  hits: ConflictHitDraft[];
  sameNameClients: SameNameClient[];
  idMatchedClients: IdMatchedClient[];
};

const SEV_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2, BLOCKING: 3 } as const;
const SEV_BY_ORDER = ["LOW", "MEDIUM", "HIGH", "BLOCKING"] as const;

function bumpSeverity(s: ConflictHitDraft["severity"]): ConflictHitDraft["severity"] {
  return SEV_BY_ORDER[Math.min(SEV_ORDER[s] + 1, 3)];
}

function pickSeverity(
  candidateRole: PartyRole,
  historyRole: PartyRole
): ConflictHitDraft["severity"] {
  if (candidateRole === "THIRD_PARTY" || historyRole === "THIRD_PARTY") return "MEDIUM";
  if (candidateRole === "OPPOSING_PARTY" && historyRole === "CLIENT_PARTY") return "BLOCKING";
  if (candidateRole === "CLIENT_PARTY" && historyRole === "OPPOSING_PARTY") return "HIGH";
  if (candidateRole === "OPPOSING_PARTY" && historyRole === "OPPOSING_PARTY") return "LOW";
  if (candidateRole === "CLIENT_PARTY" && historyRole === "CLIENT_PARTY") return "LOW";
  return "MEDIUM";
}

export async function runConflictCheck(queries: QueryItem[]): Promise<ConflictCheckResult> {
  const hits: ConflictHitDraft[] = [];
  const sameNameClients = new Map<string, SameNameClient>();
  const idMatchedClients = new Map<string, IdMatchedClient>();

  for (const q of queries) {
    const name = q.name.trim();
    const idNumber = q.idNumber?.trim() || null;
    if (!name && !idNumber) continue;

    // v0.16: Trùng tên khách hàng / số ID không còn được coi là conflict hint
    //  (User feedback: không liên quan đến conflict check; vẫn giữ sameNameClients/idMatchedClients
    //  data structure để tương thích với lịch sử ConflictCheck, nhưng search mới luôn rỗng)

    // ============ Lịch sử Party matching ============
    const partyWhere: Prisma.PartyWhereInput[] = [];
    if (name) partyWhere.push({ name });
    if (idNumber) partyWhere.push({ idNumber });
    if (partyWhere.length === 0) continue;

    const partiesExact = await prisma.party.findMany({
      where: {
        OR: partyWhere,
        matterId: { not: null },
        matter: { deletedAt: null }
      },
      select: {
        id: true,
        name: true,
        idNumber: true,
        role: true,
        standing: true,
        matter: {
          select: matterInfoSelect
        }
      }
    });

    for (const p of partiesExact) {
      if (!p.matter) continue;
      const matterInfo = toMatterInfo(p.matter, p.role, p.standing);

      // ID card giống nhau → tăng 1 cấp trên severity cơ bản
      if (idNumber && p.idNumber && p.idNumber === idNumber) {
        const base = pickSeverity(q.role, p.role);
        const sev = bumpSeverity(base);
        hits.push({
          hitType: "HISTORICAL_PARTY",
          targetType: "Matter",
          targetId: p.matter.id,
          matchedName: p.name,
          matchedField: "idNumber",
          matchedValue: idNumber,
          matchedRatio: 1,
          severity: sev,
          reason: `Số ID card / mã số thuế của案件「${p.matter.internalCode}」trong ${roleLabel(p.role)}「${p.name}」giống nhau`,
          matterInfo
        });
      }
      if (name && p.name === name) {
        const sev = pickSeverity(q.role, p.role);
        hits.push({
          hitType: "HISTORICAL_PARTY",
          targetType: "Matter",
          targetId: p.matter.id,
          matchedName: p.name,
          matchedField: "name",
          matchedValue: name,
          matchedRatio: 1,
          severity: sev,
          reason: `Trùng tên với ${roleLabel(p.role)}「${p.name}」trong案件「${p.matter.internalCode}」`,
          matterInfo
        });
      }
    }

    // Party name fuzzy match (yêu cầu >= 3 ký tự, tránh false positive với chữ đơn)
    if (name && name.length >= 3) {
      const partiesFuzzy = await prisma.party.findMany({
        where: {
          matterId: { not: null },
          matter: { deletedAt: null },
          name: { contains: name, mode: "insensitive" },
          NOT: { name }
        },
        select: {
          id: true,
          name: true,
          role: true,
          standing: true,
          matter: {
            select: matterInfoSelect
          }
        },
        take: 20
      });
      for (const p of partiesFuzzy) {
        if (!p.matter) continue;
        hits.push({
          hitType: "HISTORICAL_PARTY",
          targetType: "Matter",
          targetId: p.matter.id,
          matchedName: p.name,
          matchedField: "name",
          matchedValue: name,
          matchedRatio: name.length / p.name.length,
          severity: "LOW",
          reason: `Tên tương tự với ${roleLabel(p.role)}「${p.name}」trong案件「${p.matter.internalCode}」`,
          matterInfo: toMatterInfo(p.matter, p.role, p.standing)
        });
      }
    }

    // ============ v0.43: Tìm kiếm từ Client archive → liên kết Matter (fix漏报) ============
    // Các vụ án cũ thường chỉ ghi client trong Matter.primaryClient / clientLinks, bảng Party trống.
    // Party search trên sẽ bỏ sót. Làm client của một案件 với vai trò CLIENT_PARTY là tín hiệu xung đột thực tế.
    // Vì vậy, tìm theo tên/số ID Client, rồi backtrack các Matter liên kết để tạo hit.
    // Không lọc status (cả archived/in progress đều cần cảnh báo); client độc lập (không có Matter nào) không tạo hit.
    const clientWhere: Prisma.ClientWhereInput[] = [];
    if (name) clientWhere.push({ name });
    if (idNumber) clientWhere.push({ idNumber });
    if (name && name.length >= 3) clientWhere.push({ name: { contains: name, mode: "insensitive" } });

    if (clientWhere.length > 0) {
      const clients = await prisma.client.findMany({
        where: { deletedAt: null, OR: clientWhere },
        select: {
          id: true,
          name: true,
          idNumber: true,
          matters: { where: { deletedAt: null }, select: matterInfoSelect },
          matterLinks: {
            where: { matter: { deletedAt: null } },
            select: { matter: { select: matterInfoSelect } }
          }
        }
      });

      for (const c of clients) {
        // Tất cả Matter liên kết đến client này (primaryClient + clientLinks), dedup theo id
        const matters = [...c.matters, ...c.matterLinks.map((l) => l.matter)].filter(
          (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
        );

        const idHit = !!(idNumber && c.idNumber && c.idNumber === idNumber);
        const nameExact = !!(name && c.name === name);
        const nameFuzzy = !!(name && !nameExact && name.length >= 3);

        for (const m of matters) {
          const matterInfo = toMatterInfo(m, "CLIENT_PARTY", null);

          if (idHit) {
            const sev = bumpSeverity(pickSeverity(q.role, "CLIENT_PARTY"));
            hits.push({
              hitType: "HISTORICAL_PARTY",
              targetType: "Matter",
              targetId: m.id,
              matchedName: c.name,
              matchedField: "idNumber",
              matchedValue: idNumber!,
              matchedRatio: 1,
              severity: sev,
              reason: `Số ID card / mã số thuế trùng với khách hàng「${c.name}」của案件「${m.internalCode}」`,
              matterInfo
            });
          }
          if (nameExact) {
            hits.push({
              hitType: "HISTORICAL_PARTY",
              targetType: "Matter",
              targetId: m.id,
              matchedName: c.name,
              matchedField: "name",
              matchedValue: name,
              matchedRatio: 1,
              severity: pickSeverity(q.role, "CLIENT_PARTY"),
              reason: `Trùng tên với khách hàng「${c.name}」của案件「${m.internalCode}」`,
              matterInfo
            });
          } else if (nameFuzzy) {
            hits.push({
              hitType: "HISTORICAL_PARTY",
              targetType: "Matter",
              targetId: m.id,
              matchedName: c.name,
              matchedField: "name",
              matchedValue: name,
              matchedRatio: name.length / c.name.length,
              severity: "LOW",
              reason: `Tên tương tự với khách hàng「${c.name}」của案件「${m.internalCode}」`,
              matterInfo
            });
          }
        }
      }
    }
  }

  // 去重：同一 (targetId,matchedField,matchedValue) 保留最高严重度
  const dedup = new Map<string, ConflictHitDraft>();
  for (const h of hits) {
    const key = `${h.targetId}|${h.matchedField}|${h.matchedValue}`;
    const existing = dedup.get(key);
    if (!existing || SEV_ORDER[h.severity] > SEV_ORDER[existing.severity]) {
      dedup.set(key, h);
    }
  }
  const sortedHits = Array.from(dedup.values()).sort(
    (a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity]
  );

  return {
    hits: sortedHits,
    sameNameClients: Array.from(sameNameClients.values()),
    idMatchedClients: Array.from(idMatchedClients.values())
  };
}

function roleLabel(role: PartyRole) {
  switch (role) {
    case "CLIENT_PARTY":
      return "委托方";
    case "OPPOSING_PARTY":
      return "对方";
    case "THIRD_PARTY":
      return "第三人";
    case "CO_LITIGANT":
      return "共同诉讼人";
    case "AGENT":
      return "代理人";
    case "WITNESS":
      return "证人";
    default:
      return "当事人";
  }
}
