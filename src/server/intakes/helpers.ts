/**
 * Pure helper functions for intakes business logic (testable)
 */

export function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export function requireApprover(role: string) {
  if (role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error("仅管理员或主任律师可审批收案");
  }
}

/** 按 {委托方} 与 {对方} {案由} 自动生成标题 — 案由本身通常已含"纠纷"二字 */
export function generateTitle(
  clientName: string | null,
  opposingNames: string[],
  causeName: string | null
): string {
  const left = clientName || "待补充委托方";
  const right = opposingNames.length > 0 ? opposingNames.join("、") : "待补充对方";
  const cause = causeName ?? "案件";
  // 案件名称不含空格（产品要求，与 matterCreateSchema 去空白一致）
  return `${left}与${right}${cause}`.replace(/\s+/g, "");
}

export function clientTypeToPartyType(type: "INDIVIDUAL" | "COMPANY" | string): "NATURAL_PERSON" | "COMPANY" | "OTHER_ORG" {
  if (type === "INDIVIDUAL") return "NATURAL_PERSON";
  if (type === "COMPANY") return "COMPANY";
  return "OTHER_ORG";
}

// Conflict query helpers
export type IntakeConflictRole = "CLIENT_PARTY" | "OPPOSING_PARTY" | "THIRD_PARTY";

export type IntakeConflictQuery = {
  role: IntakeConflictRole;
  name: string;
  idNumber: string;
};

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
    CLIENT_PARTY: "委托方",
    OPPOSING_PARTY: "对方",
    THIRD_PARTY: "第三人"
  };
  return `${roleLabel[q.role]}「${q.name || q.idNumber}」`;
}

export function buildExpectedConflictQueries(intake: {
  client: { name: string; idNumber: string | null } | null;
  parties: { role: string; name: string; idNumber: string | null }[];
}) {
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

export function getCheckedConflictQueries(payload: unknown) {
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

export function assertConflictReviewAllowsConversion(intake: {
  client: { name: string; idNumber: string | null } | null;
  parties: { role: string; name: string; idNumber: string | null }[];
  conflictChecks: {
    conclusion: string;
    note: string | null;
    queryPayload: unknown;
    hits: { severity: string }[];
  }[];
}) {
  const expectedQueries = buildExpectedConflictQueries(intake);
  if (expectedQueries.length === 0) {
    throw new Error("请先补充委托方或相对方，再运行利益冲突检索");
  }

  const latestCheck = intake.conflictChecks[0];
  if (!latestCheck) {
    throw new Error("转为正式案件前必须先运行利益冲突检索");
  }

  const checkedKeys = new Set(
    getCheckedConflictQueries(latestCheck.queryPayload).map(conflictQueryKey)
  );
  const missingQueries = expectedQueries.filter((q) => !checkedKeys.has(conflictQueryKey(q)));
  if (missingQueries.length > 0) {
    throw new Error(
      `收案当事人已变更，请重新运行利益冲突检索。缺少：${missingQueries
        .map(formatConflictQuery)
        .join("、")}`
    );
  }

  if (latestCheck.conclusion === "PENDING") {
    throw new Error("利益冲突检索还没有结论，请先标记是否可承接");
  }
  if (latestCheck.conclusion === "NEED_INFO") {
    throw new Error("利益冲突检索结论为信息不足，不能转为正式案件");
  }
  if (latestCheck.conclusion === "SAME_SUBJECT") {
    throw new Error("已确认存在利益冲突，不能直接转为正式案件");
  }
  if (latestCheck.conclusion !== "DIFFERENT") {
    throw new Error("利益冲突检索结论异常，请重新检索后再转为正式案件");
  }

  const hasHighRiskHit = latestCheck.hits.some(
    (h) => h.severity === "HIGH" || h.severity === "BLOCKING"
  );
  if (hasHighRiskHit && !latestCheck.note?.trim()) {
    throw new Error("存在高风险或阻塞命中，请在冲突结论备注中写明排除理由或书面同意留痕");
  }
}
