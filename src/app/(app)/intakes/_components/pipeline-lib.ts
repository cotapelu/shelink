/**
 * Hàm thuần cho pipeline tiếp nhận (TD-A1/A2): cột giai đoạn, tính giờ chờ (SLA), quy tắc kéo.
 * Không DB/React — dễ test.
 */

export const SLA_WARN_HOURS = 24;

export type IntakeStage = "INTAKE" | "PENDING_CONFIRMATION" | "NEEDS_REVISION" | "CONVERTED" | "DECLINED";

export type StageColumn = {
  key: IntakeStage;
  label: string;
  /** Cột cho phép thả (giai đoạn đang xử lý); cột đóng không kéo được. */
  droppable: boolean;
};

export const INTAKE_STAGES: StageColumn[] = [
  { key: "INTAKE", label: "Tiếp nhận", droppable: true },
  { key: "PENDING_CONFIRMATION", label: "Chờ xác nhận", droppable: true },
  { key: "NEEDS_REVISION", label: "Cần bổ sung", droppable: false },
  { key: "CONVERTED", label: "Đã chuyển", droppable: false },
  { key: "DECLINED", label: "Từ chối", droppable: false }
];

export type PipelineItem = {
  id: string;
  title: string;
  status: IntakeStage;
  clientName: string | null;
  contactName: string | null;
  ownerName: string | null;
  receivedAt: string | Date;
  claimAmount: number | null;
};

const HOUR = 3_600_000;

/** Số giờ chờ xử lý kể từ khi tiếp nhận; null nếu ngày không hợp lệ. */
export function pendingHours(receivedAt: string | Date | null, now = Date.now()): number | null {
  if (!receivedAt) return null;
  const t = new Date(receivedAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / HOUR));
}

/** Vượt SLA (mặc định > 24 giờ) → cảnh báo. */
export function isOverSla(hours: number | null, warnHours = SLA_WARN_HOURS): boolean {
  return hours !== null && hours > warnHours;
}

export function formatPending(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 24) return `${hours} giờ`;
  const d = Math.floor(hours / 24);
  const r = hours % 24;
  return r ? `${d}n ${r}g` : `${d} ngày`;
}

/** Được kéo nếu cả từ-đến thuộc cột droppable và khác nhau. */
export function canMove(from: string, to: string): boolean {
  const isDroppable = (k: string) => INTAKE_STAGES.some((s) => s.key === k && s.droppable);
  return from !== to && isDroppable(from) && isDroppable(to);
}
