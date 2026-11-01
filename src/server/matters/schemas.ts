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

export const matterCategorySchema = z.enum([
  "CIVIL_COMMERCIAL",
  "LABOR_ARBITRATION",
  "COMMERCIAL_ARBITRATION",
  "CRIMINAL",
  "ADMINISTRATIVE",
  "NON_LITIGATION",
  "LEGAL_COUNSEL",
  "SPECIAL_PROJECT"
]);

export const matterStatusSchema = z.enum([
  "PENDING_ACCEPTANCE",
  "IN_PROGRESS",
  "ON_HOLD",
  "CLOSED",
  "ARCHIVED"
]);

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

export const procedureTypeSchema = z.enum([
  "FIRST_INSTANCE",
  "SECOND_INSTANCE",
  "RETRIAL_REVIEW",
  "RETRIAL",
  "REMAND_FIRST",
  "REMAND_SECOND",
  "PROSECUTORIAL_SUPERVISION",
  "COMMERCIAL_ARBITRATION",
  "LABOR_ARBITRATION",
  "ARBITRATION_SET_ASIDE",
  "ARBITRATION_ENFORCEMENT_REVIEW",
  "ENFORCEMENT",
  "ENFORCEMENT_OBJECTION",
  "INVESTIGATION",
  "PROSECUTION_REVIEW",
  "DEATH_PENALTY_REVIEW",
  "CRIMINAL_ENFORCEMENT",
  "COMMUTATION_PAROLE_REVIEW",
  "ADMIN_RECONSIDERATION",
  "ADMIN_NON_LITIGATION_ENFORCEMENT",
  "NON_LITIGATION_PHASE",
  "CUSTOM"
]);

export const partyRoleSchema = z.enum([
  "CLIENT_PARTY",
  "OPPOSING_PARTY",
  "THIRD_PARTY",
  "CO_LITIGANT",
  "AGENT",
  "WITNESS",
  "OTHER"
]);

// v0.27 / v0.30: Loại chủ thể của party (natural person điền số ID, các thể nhân khác điền unified social credit code)
export const partyTypeSchema = z.enum([
  "NATURAL_PERSON",
  "ORGANIZATION", // Tương thích dữ liệu cũ
  "COMPANY",
  "PARTNERSHIP",
  "INDIVIDUAL_BUSINESS",
  "INSTITUTION",
  "SOCIAL_ORG",
  "GOVERNMENT",
  "OTHER_ORG"
]);

export const partyInputSchema = z
  .object({
    role: partyRoleSchema,
    // v0.5: Lập trường tố tụng cụ thể (theo thủ tục đầu tiên)
    standing: litigationStandingSchema.optional(),
    ordinal: z.number().int().min(1).default(1),
    // v0.27: Loại chủ thể quyết định field bắt buộc
    partyType: partyTypeSchema.default("NATURAL_PERSON"),
    name: z.string().min(1, "Tên/loại party bắt buộc").max(120),
    // Với NATURAL_PERSON bắt buộc có idNumber; với entity bắt buộc có enterpriseSocialCode (superRefine validate)
    idNumber: z.string().max(50).optional().or(z.literal("")),
    enterpriseSocialCode: z.string().max(50).optional().or(z.literal("")),
    enterpriseName: z.string().max(120).optional().or(z.literal("")),
    phone: z.string().max(30).optional().or(z.literal("")),
    address: z.string().max(200).optional().or(z.literal("")),
    legalRep: z.string().max(40).optional().or(z.literal("")),
    contactName: z.string().max(40).optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal(""))
  })
  .superRefine((p, ctx) => {
    if (p.partyType === "NATURAL_PERSON") {
      if (!p.idNumber || !p.idNumber.trim()) {
        ctx.addIssue({
          path: ["idNumber"],
          code: z.ZodIssueCode.custom,
          message: "Cá nhân phải cung cấp số CMND/CCCD (dùng để kiểm tra xung đột)"
        });
      }
    } else {
      if (!p.enterpriseSocialCode || !p.enterpriseSocialCode.trim()) {
        ctx.addIssue({
          path: ["enterpriseSocialCode"],
          code: z.ZodIssueCode.custom,
          message: "Công ty/tổ chức phải cung cấp unified social credit code"
        });
      }
    }
  });

export const matterCreateSchema = z.object({
  // v0.27: Tên vụ án loại bỏ mọi ký tự khoảng trắng (yêu cầu sản phẩm, tránh hiển thị thừa space ở danh sách/chi tiết)
  title: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s+/g, "") : v),
    z.string().min(1, "Tên vụ án bắt buộc nhập").max(200)
  ),
  category: matterCategorySchema,

  // Nguyên nhân (cause)
  causeId: z.string().cuid().optional().or(z.literal("")),
  causeFreeText: z.string().max(200).optional().or(z.literal("")),

  claimAmount: z.coerce.number().nonnegative().optional(),

  ourStanding: litigationStandingSchema.optional(),
  counterclaimAsPlaintiff: z.boolean().default(false),
  counterclaimAsDefendant: z.boolean().default(false),

  intakeDate: z.coerce.date().optional(),

  // Khách hàng: ít nhất một, mặc định cái đầu là primary
  clientIds: z.array(z.string().cuid()).min(1, "Chọn ít nhất một bên ủy quyền"),

  // Danh sách các bên (bên ủy quyền, bên đối phương, người thứ ba)
  parties: z.array(partyInputSchema).default([]),

  // Thủ tục đầu tiên
  firstProcedure: z.object({
    type: procedureTypeSchema,
    customLabel: z.string().max(40).optional().or(z.literal("")),
    caseNumber: z.string().max(80).optional().or(z.literal("")),
    handlingAgency: z.string().max(120).optional().or(z.literal("")),
    acceptedAt: z.coerce.date().optional()
  })
});

export type MatterCreateInput = z.infer<typeof matterCreateSchema>;
export type PartyInput = z.infer<typeof partyInputSchema>;

// v0.27: Sửa thông tin cơ bản vụ án (mã hệ thống / ngày tiếp nhận readonly, không xử lý tại đây)
export const matterUpdateBasicSchema = z.object({
  id: z.string().cuid(),
  title: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s+/g, "") : v),
    z.string().min(1, "Tên vụ án bắt buộc nhập").max(200)
  ),
  causeId: z.string().cuid().optional().or(z.literal("")),
  causeFreeText: z.string().max(200).optional().or(z.literal("")),
  claimAmount: z.coerce.number().nonnegative().optional().nullable(),
  ourStanding: litigationStandingSchema.optional().nullable()
});

export type MatterUpdateBasicInput = z.infer<typeof matterUpdateBasicSchema>;

export const matterListQuerySchema = z.object({
  search: z.string().optional(),
  category: matterCategorySchema.optional(),
  status: matterStatusSchema.optional(),
  statusIn: z.array(matterStatusSchema).optional(),
  statusNotIn: z.array(matterStatusSchema).optional(),
  ownerId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  intakeDateFrom: z.coerce.date().optional(),
  intakeDateTo: z.coerce.date().optional(),
  sortBy: z.enum(["hearing", "intakeDate", "claimAmount"]).default("intakeDate"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type MatterListQuery = z.infer<typeof matterListQuerySchema>;
