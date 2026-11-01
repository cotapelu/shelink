/*
 * Hàm thuần cho luồng seal (duyệt/từ chối/rút/điền) — tách khỏi action để test
 * (R-refactor AUTO-66). Không import Prisma/DB.
 */

/** Quyền rút yêu cầu: người tạo hoặc quản trị (ADMIN/PRINCIPAL_LAWYER). */
export function canCancelSeal(
  requestedById: string,
  user: { id: string; role: string }
): boolean {
  if (requestedById === user.id) return true;
  return user.role === "ADMIN" || user.role === "PRINCIPAL_LAWYER";
}

/** Quyền điển lại bản đóng dấu: người yêu cầu hoặc người duyệt được loại dấu. */
export function canStampSeal(
  seal: { requestedById: string },
  user: { id: string },
  isApprover: boolean
): boolean {
  return seal.requestedById === user.id || isApprover;
}

export type SealListFilter = {
  status?: string;
  sealType?: string;
  scope?: string;
};

/** Dựng where cho danh sách seal theo scope + vai trò (thuần — đã tách từ listSealRequests). */
export function buildSealListWhere(
  filter: SealListFilter,
  user: { id: string; role: string },
  approvableTypes: string[]
) {
  const where: { status?: string; sealType?: string | { in: string[] }; requestedById?: string } = {};
  if (filter.status) where.status = filter.status;
  if (filter.sealType) where.sealType = filter.sealType;

  if (filter.scope === "mine") where.requestedById = user.id;
  else if (filter.scope === "approval") {
    where.sealType = { in: approvableTypes };
    where.status = "PENDING";
  } else if (user.role === "FINANCE") where.sealType = "FINANCE_SEAL";
  else if (user.role === "LAWYER" || user.role === "ASSISTANT") where.requestedById = user.id;
  // ADMIN / PRINCIPAL_LAWYER thấy tất cả
  return where;
}

/** Nội dung thông báo xin duyệt đóng dấu (thuần — đã tách từ notifySealApprovalRequested). */
export function sealApprovalContent(input: {
  requesterName?: string | null;
  code: string;
  documentTitle: string;
  purpose: string;
}): string {
  return `${input.requesterName ?? "Nguoi dung"} da gui yeu cau dong dau: ${input.code} · ${input.documentTitle} · ${input.purpose}`;
}

/** Phạm vi đếm "đã đóng dấu trong tháng": FINANCE chỉ thấy dấu tài chính. */
export function monthStampedScope(
  role: string,
  monthStart: Date
): { status: string; stampedAt: { gte: Date }; sealType?: string } {
  return role === "FINANCE"
    ? { status: "STAMPED", stampedAt: { gte: monthStart }, sealType: "FINANCE_SEAL" }
    : { status: "STAMPED", stampedAt: { gte: monthStart } };
}
