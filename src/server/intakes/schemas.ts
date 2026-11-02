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
import { z } from "zod";
import { matterCategorySchema, partyInputSchema, procedureTypeSchema } from "@/server/matters/schemas";

export const intakeStatusSchema = z.enum([
  "INTAKE",
  "PENDING_CONFIRMATION",
  "CONVERTED",
  "DECLINED",
  "NEEDS_REVISION"
]);

export const feeTypeSchema = z.enum(["FIXED", "CONTINGENCY", "TIMED"]);

export const clientTypeSchema = z.enum(["INDIVIDUAL", "COMPANY", "ORGANIZATION"]);

export const litigationStandingSchema = z.enum([
  "PLAINTIFF",
  "JOINT_PLAINTIFF",
  "DEFENDANT",
  "JOINT_DEFENDANT",
  "THIRD_PARTY",
  "COUNTERCLAIM_PLAINTIFF",
  "COUNTERCLAIM_DEFENDANT",
  "APPELLANT",
  "APPELLEE",
  "RETRIAL_APPLICANT",
  "RETRIAL_RESPONDENT",
  "ENFORCEMENT_APPLICANT",
  "EXECUTED_PERSON",
  "CRIMINAL_DEFENDANT",
  "CRIMINAL_VICTIM",
  "PRIVATE_PROSECUTOR",
  "CRIMINAL_INCIDENTAL_PLAINTIFF",
  "ARBITRATION_CLAIMANT",
  "ARBITRATION_RESPONDENT",
  "ADMIN_PLAINTIFF",
  "ADMIN_DEFENDANT",
  "ADMIN_RECONSIDERATION_APPLICANT",
  "ADMIN_RECONSIDERATION_RESPONDENT",
  "NON_LITIGATION_PARTY"
]);

const litigationIntakeCategories = new Set([
  "CIVIL_COMMERCIAL",
  "LABOR_ARBITRATION",
  "COMMERCIAL_ARBITRATION",
  "CRIMINAL",
  "ADMINISTRATIVE"
]);

const intakeCreateBaseSchema = z.object({
  // Cơ bản
  // Tên vụ án loại bỏ mọi ký tự trắng (yêu cầu sản phẩm, tránh hiển thị khoảng trắng ở danh sách/chi tiết)
  title: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s+/g, "") : v),
    z.string().max(200).optional().or(z.literal(""))
  ),
  category: matterCategorySchema,
  causeId: z.string().cuid().optional().or(z.literal("")),
  causeFreeText: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  receivedAt: z.coerce.date().optional(),

  // Thủ tục + lập trường tố tụng + cơ quan + giá trị
  firstProcedureType: procedureTypeSchema.optional(),
  firstAgency: z.string().max(120).optional().or(z.literal("")),
  jurisdiction: z.string().max(120).optional().or(z.literal("")),
  ourStanding: litigationStandingSchema.optional(),
  claimAmount: z.coerce.number().nonnegative().optional(),
  claimDescription: z.string().max(500).optional().or(z.literal("")),

  // v0.30: Ghi nhận Hiệp hội luật sư + có phản tố không
  barFiling: z.enum(["NONE", "COLLECTIVE", "SENSITIVE", "MAJOR", "OTHER"]).optional(),
  counterclaim: z.boolean().default(false),

  // v0.31: Riêng cho phi tố tụng / tư vấn / đặc biệt
  businessType: z.string().max(60).optional().or(z.literal("")),
  serviceScope: z.string().max(1000).optional().or(z.literal("")),
  deliverables: z.string().max(500).optional().or(z.literal("")),
  counselType: z.string().max(40).optional().or(z.literal("")),
  serviceStart: z.coerce.date().optional(),
  serviceEnd: z.coerce.date().optional(),

  // Bên ủy quyền + người liên hệ
  clientId: z.string().cuid().optional().or(z.literal("")),
  clientName: z.string().max(120).optional().or(z.literal("")),
  clientType: clientTypeSchema.optional(),
  contactName: z.string().max(40).optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional().or(z.literal("")),

  // Tự động điền doanh nghiệp (kết quả tra Nguờn điện, chuyển tiếp khi tạo Client)
  clientIdNumber: z.string().max(50).optional().or(z.literal("")),
  clientAddress: z.string().max(200).optional().or(z.literal("")),
  clientLegalRep: z.string().max(40).optional().or(z.literal("")),

  // Phí luật sư
  feeType: feeTypeSchema.optional(),
  feeAmount: z.coerce.number().nonnegative().optional(), // FIXED: tổng số tiền; CONTINGENCY: phí cơ bản
  contingencyTerms: z.string().max(1000).optional().or(z.literal("")), // CONTINGENCY: cách tính phí
  feeSchedule: z.string().max(500).optional().or(z.literal("")),
  feeNote: z.string().max(500).optional().or(z.literal("")),

  // Đội ngũ
  ownerUserId: z.string().cuid().optional().or(z.literal("")),
  coUserIds: z.array(z.string().cuid()).default([]),

  // Bên đối phương / Người thứ ba (trong đó có thể có standing)
  parties: z.array(partyInputSchema).default([])
});

function requireLitigationStandings(
  data: z.infer<typeof intakeCreateBaseSchema>,
  ctx: z.RefinementCtx
) {
  if (!litigationIntakeCategories.has(data.category)) return;

  if (!data.ourStanding) {
    ctx.addIssue({
      path: ["ourStanding"],
      code: z.ZodIssueCode.custom,
      message: "Chọn lập trường tố tụng cho bên ủy quyền"
    });
  }

  data.parties.forEach((party, index) => {
    if (!party.standing) {
      ctx.addIssue({
        path: ["parties", index, "standing"],
        code: z.ZodIssueCode.custom,
        message: "Chọn lập trường tố tụng"
      });
    }
  });
}

export const intakeCreateSchema = intakeCreateBaseSchema.superRefine(requireLitigationStandings);

export const intakeUpdateSchema = intakeCreateBaseSchema.extend({
  id: z.string().cuid()
}).superRefine(requireLitigationStandings);

export const intakeListQuerySchema = z.object({
  search: z.string().optional(),
  category: matterCategorySchema.optional(),
  status: intakeStatusSchema.optional(),
  statusIn: z.array(intakeStatusSchema).optional(),
  receivedAtFrom: z.coerce.date().optional(),
  receivedAtTo: z.coerce.date().optional(),
  sortBy: z.enum(["intakeDate", "claimAmount"]).default("intakeDate"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const declineIntakeSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(1, "Nhập lý do không tiếp nhận").max(500)
});

// Kéo-thả pipeline chỉ đổi giữa 2 giai đoạn đang xử lý; các chuyển cần lý do/duyệt (bổ sung/từ chối/chuyển) dùng luật riêng.
export const moveIntakeStageSchema = z.object({
  id: z.string().cuid(),
  toStatus: z.enum(["INTAKE", "PENDING_CONFIRMATION"])
});

export type IntakeCreateInput = z.infer<typeof intakeCreateSchema>;
export type IntakeListQuery = z.infer<typeof intakeListQuerySchema>;
export type DeclineIntakeInput = z.infer<typeof declineIntakeSchema>;
export type MoveIntakeStageInput = z.infer<typeof moveIntakeStageSchema>;
