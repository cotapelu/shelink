/** Nhãn hiển thị tiếng Việt cho loại phép / trạng thái đơn. */

export const LEAVE_TYPE_LABEL: Record<string, string> = {
  ANNUAL: "Phép năm",
  SICK: "Nghỉ ốm",
  UNPAID: "Không lương",
  MARITAL: "Phép cưới",
  MATERNITY: "Thai sản",
  PATERNITY: "Phép cha",
  COMPENSATORY: "Phép bù",
  OTHER: "Khác"
};

export const LEAVE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã rút"
};

export const LEAVE_STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-amber-500/15 text-amber-300",
  APPROVED: "bg-emerald-500/15 text-emerald-300",
  REJECTED: "bg-red-500/15 text-red-300",
  CANCELLED: "bg-muted text-muted-foreground"
};

export function fmtLeaveDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("vi-VN");
}
