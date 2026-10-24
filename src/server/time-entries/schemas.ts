/**
 * Zod schemas module Ghi giờ (DATA-MODEL §4.30).
 */

import { z } from "zod";

export const timeEntryStatusSchema = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]);
export const timeActivitySchema = z.enum(["CLIENT_WORK", "INTERNAL", "MEETING", "TRAVEL", "ADMIN", "OTHER"]);

const idOrEmpty = z.string().cuid().optional().or(z.literal(""));

const timeEntryObjectSchema = z
  .object({
    date: z.coerce.date(),
    hours: z.coerce.number().gt(0, "Số giờ phải > 0").max(24, "Tối đa 24 giờ/ngày"),
    billable: z.boolean().default(true),
    activityType: timeActivitySchema.default("CLIENT_WORK"),
    description: z.string().max(500).optional(),
    matterId: idOrEmpty,
    legalTaskId: idOrEmpty,
    workTaskId: idOrEmpty,
    projectId: idOrEmpty
  });

const withEntryRules = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .refine((v) => Boolean(v.matterId || v.legalTaskId || v.workTaskId || v.projectId), {
      message: "Phải gắn ghi giờ vào dự án, nhiệm vụ hoặc dự án nội bộ"
    })
    .refine((v) => Math.abs((v.hours * 4) % 1) < 1e-9, { message: "Số giờ phải theo bước 0.25" });

export const timeEntryCreateSchema = withEntryRules(timeEntryObjectSchema);
export const timeEntryUpdateSchema = timeEntryObjectSchema.extend({ id: z.string().cuid() });

export const timeEntryListFilterSchema = z.object({
  userId: z.string().cuid().optional(),
  matterId: z.string().cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: timeEntryStatusSchema.optional(),
  scope: z.enum(["mine", "all"]).default("mine")
});

export const timeEntryIdSchema = z.object({ id: z.string().cuid() });

export const timeApproveSchema = z.object({
  ids: z.array(z.string().cuid()).min(1),
  rejectNote: z.string().max(500).optional()
});

export const timeSubmitSchema = z.object({
  ids: z.array(z.string().cuid()).min(1)
});

export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>;
