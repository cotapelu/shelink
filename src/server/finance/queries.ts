/*
 * Các query io của finance — tách khỏi actions để action mỏng và file ≤300 dòng
 * (R-refactor AUTO-62). Chỉ chứa đọc dữ liệu, không nghiệp vụ.
 */

import { prisma } from "@/lib/prisma";

/** Dữ liệu tài chính của 1 vụ: hợp đồng + thu chi + phương án hoa hồng + hóa đơn đã xuất. */
export async function fetchMatterFinanceData(matterId: string) {
  const [billings, entries, plans, issuedInvoices] = await Promise.all([
    prisma.billing.findMany({ where: { matterId }, orderBy: { createdAt: "desc" } }),
    prisma.feeEntry.findMany({
      where: { matterId },
      orderBy: { occurredAt: "desc" },
      include: { beneficiaryUser: { select: { id: true, name: true } }, parentFeeEntry: { select: { id: true, type: true } } }
    }),
    prisma.commissionPlan.findMany({
      where: { matterId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" }
    }),
    // Số tiền đã xuất hóa đơn = tổng hóa đơn ISSUED
    prisma.invoiceRequest.findMany({ where: { matterId, status: "ISSUED" }, select: { amount: true } })
  ]);
  return { billings, entries, plans, issuedInvoices };
}
