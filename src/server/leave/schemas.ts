import { z } from "zod";

export const leaveTypeSchema = z.enum([
  "ANNUAL",
  "SICK",
  "UNPAID",
  "MARITAL",
  "MATERNITY",
  "PATERNITY",
  "COMPENSATORY",
  "OTHER"
]);

export const leaveStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED"
]);

export const leaveCreateSchema = z
  .object({
    leaveType: leaveTypeSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().max(1000).optional(),
    status: z.enum(["DRAFT", "SUBMITTED"]).default("SUBMITTED")
  })
  .superRefine((v, ctx) => {
    if (v.endDate.getTime() < v.startDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ngày kết thúc phải >= ngày bắt đầu",
        path: ["endDate"]
      });
    }
  });

export const leaveIdSchema = z.object({ id: z.string().cuid() });

export const leaveDecisionSchema = z
  .object({
    id: z.string().cuid(),
    approve: z.boolean(),
    note: z.string().max(500).optional()
  })
  .superRefine((v, ctx) => {
    if (!v.approve && !v.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Từ chối phải ghi lý do",
        path: ["note"]
      });
    }
  });

export type LeaveListFilter = z.infer<typeof leaveListFilterSchema>;

export const leaveListFilterSchema = z.object({
  status: leaveStatusSchema.optional(),
  leaveType: leaveTypeSchema.optional(),
  // mine = chỉ của tôi (mặc định cho non-manager); approver = chờ tôi duyệt
  scope: z.enum(["mine", "team"]).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional()
});
