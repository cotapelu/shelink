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
 * Pure helper functions for intakes - extracted for testability
 */
import { Prisma, type PartyType } from "@prisma/client";

export type IntakeConflictRole = "CLIENT_PARTY" | "OPPOSING_PARTY" | "THIRD_PARTY";

export type IntakeConflictQuery = {
  role: IntakeConflictRole;
  name: string;
  idNumber: string;
};

export type IntakeConflictGateInput = {
  client: { name: string; idNumber: string | null } | null;
  parties: { role: string; name: string; idNumber: string | null }[];
  conflictChecks: {
    conclusion: string;
    note: string | null;
    queryPayload: Prisma.JsonValue;
    hits: { severity: string }[];
  }[];
};

export function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export function requireApprover(role: string) {
  if (role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error("Chỉ quản trị viên hoặc luật sư chính được duyệt tiếp nhận");
  }
}

export function generateTitle(
  clientName: string | null,
  opposingNames: string[],
  causeName: string | null
): string {
  // Vietnamese: trim từng phần, giữ khoảng trắng bên trong tên (bản cũ xoá sạch \s để hợp tiếng Trung)
  const left = (clientName ?? "").trim() || "Chưa có bên ủy quyền";
  const right = opposingNames.length > 0
    ? opposingNames.map((n) => n.trim()).join(", ")
    : "Chưa có bên đối phương";
  const cause = (causeName ?? "").trim() || "Vụ án";
  return `${left} và ${right} - ${cause}`;
}

export function clientTypeToPartyType(type: "INDIVIDUAL" | "COMPANY" | string): PartyType {
  if (type === "INDIVIDUAL") return "NATURAL_PERSON";
  if (type === "COMPANY") return "COMPANY";
  return "OTHER_ORG";
}

export function normalizeConflictQuery(q: {
  role?: string | null;
  name?: string | null;
  idNumber?: string | null;
}): IntakeConflictQuery | null {
  if (q.role !== "CLIENT_PARTY" && q.role !== "OPPOSING_PARTY" && q.role !== "THIRD_PARTY") {
    return null;
  }
  const name = q.name?.trim() ?? "";
  const idNumber = q.idNumber?.trim() ?? "";
  if (!name && !idNumber) return null;
  return { role: q.role, name, idNumber };
}

export function conflictQueryKey(q: IntakeConflictQuery) {
  return `${q.role}|${q.name}|${q.idNumber}`;
}

export function formatConflictQuery(q: IntakeConflictQuery) {
  const roleLabel: Record<IntakeConflictRole, string> = {
    CLIENT_PARTY: "Bên ủy quyền",
    OPPOSING_PARTY: "Bên đối phương",
    THIRD_PARTY: "Người thứ ba"
  };
  return `${roleLabel[q.role]} "${q.name || q.idNumber}"`;
}

export function buildExpectedConflictQueries(intake: IntakeConflictGateInput) {
  const queries: IntakeConflictQuery[] = [];
  const clientQuery = normalizeConflictQuery({
    role: "CLIENT_PARTY",
    name: intake.client?.name,
    idNumber: intake.client?.idNumber
  });
  if (clientQuery) queries.push(clientQuery);

  for (const p of intake.parties) {
    const q = normalizeConflictQuery({
      role: p.role,
      name: p.name,
      idNumber: p.idNumber
    });
    if (q) queries.push(q);
  }

  return queries;
}

export function getCheckedConflictQueries(payload: Prisma.JsonValue) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const queries = (payload as { queries?: unknown }).queries;
  if (!Array.isArray(queries)) return [];

  return queries
    .map((q) => {
      if (!q || typeof q !== "object" || Array.isArray(q)) return null;
      const row = q as { role?: unknown; name?: unknown; idNumber?: unknown };
      return normalizeConflictQuery({
        role: typeof row.role === "string" ? row.role : null,
        name: typeof row.name === "string" ? row.name : null,
        idNumber: typeof row.idNumber === "string" ? row.idNumber : null
      });
    })
    .filter((q): q is IntakeConflictQuery => !!q);
}

export function assertConflictReviewAllowsConversion(intake: IntakeConflictGateInput) {
  const expectedQueries = buildExpectedConflictQueries(intake);
  if (expectedQueries.length === 0) {
    throw new Error("Cần bổ sung bên ủy quyền hoặc bên đối phương trước khi tra kiểm xung đột lợi ích");
  }

  const latestCheck = intake.conflictChecks[0];
  if (!latestCheck) {
    throw new Error("Phải chạy kiểm tra xung đột lợi ích trước khi chuyển thành vụ án chính thức");
  }

  const checkedKeys = new Set(
    getCheckedConflictQueries(latestCheck.queryPayload).map(conflictQueryKey)
  );
  const missingQueries = expectedQueries.filter((q) => !checkedKeys.has(conflictQueryKey(q)));
  if (missingQueries.length > 0) {
    throw new Error(
      `Các bên của tiếp nhận đã thay đổi, hãy chạy lại kiểm tra xung đột lợi ích. Thiếu: ${missingQueries
        .map(formatConflictQuery)
        .join(", ")}`
    );
  }

  if (latestCheck.conclusion === "PENDING") {
    throw new Error("Kiểm tra xung đột lợi ích chưa có kết luận, hãy đánh dấu có thể tiếp nhận hay không");
  }
  if (latestCheck.conclusion === "NEED_INFO") {
    throw new Error("Kết luận kiểm tra xung đột lợi ích là thông tin chưa đủ, không thể chuyển thành vụ án chính thức");
  }
  if (latestCheck.conclusion === "SAME_SUBJECT") {
    throw new Error("Đã xác nhận có xung đột lợi ích, không thể trực tiếp chuyển thành vụ án chính thức");
  }
  if (latestCheck.conclusion !== "DIFFERENT") {
    throw new Error("Kết luận kiểm tra xung đột lợi ích bất thường, hãy tra lại trước khi chuyển thành vụ án chính thức");
  }

  const hasHighRiskHit = latestCheck.hits.some(
    (h) => h.severity === "HIGH" || h.severity === "BLOCKING"
  );
  if (hasHighRiskHit && !latestCheck.note?.trim()) {
    throw new Error("Có kết quả khớp rủi ro cao hoặc chặn, hãy ghi rõ lý do loại trừ hoặc sự đồng ý bằng văn bản trong ghi chú kết luận xung đột");
  }
}
