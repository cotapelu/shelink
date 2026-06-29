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
 * Enum display Vietnamese mappings. Frontend uses these labels, DB/API uses enum values.
 */
import type {
  ClientType,
  ClientCooperationStatus,
  ClientGender,
  MatterCategory,
  MatterStatus,
  IntakeStatus,
  UserRole,
  ProcedureType,
  LitigationStanding,
  FeeType,
  InvoiceRequestStatus,
  PartyType,
  BarFilingType
} from "@prisma/client";

export const clientTypeLabel: Record<ClientType, string> = {
  INDIVIDUAL: "Cá nhân",
  COMPANY: "Công ty",
  ORGANIZATION: "Tổ chức khác"
};

// v0.39: 客户合作状态
export const cooperationStatusLabel: Record<ClientCooperationStatus, string> = {
  POTENTIAL: "Tiềm năng",
  NEGOTIATING: "Đang đàm phán",
  SIGNED: "Đã ký hợp đồng",
  TERMINATED: "Đã chấm dứt"
};

export const COOPERATION_STATUS_OPTIONS: ClientCooperationStatus[] = [
  "POTENTIAL",
  "NEGOTIATING",
  "SIGNED",
  "TERMINATED"
];

// v0.39: 客户性别（个人客户）
export const genderLabel: Record<ClientGender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ"
};

export const GENDER_OPTIONS: ClientGender[] = ["MALE", "FEMALE"];

// v0.30: 当事人主体类型。自然人填身份证号，其余主体填统一社会信用代码。
export const partyTypeLabel: Record<PartyType, string> = {
  NATURAL_PERSON: "Cá nhân",
  COMPANY: "Công ty",
  PARTNERSHIP: "Hợp danh",
  INDIVIDUAL_BUSINESS: "Hộ kinh doanh cá thể",
  INSTITUTION: "Đơn vị sự nghiệp",
  SOCIAL_ORG: "Tổ chức xã hội",
  GOVERNMENT: "Cơ quan nhà nước",
  OTHER_ORG: "Tổ chức khác",
  ORGANIZATION: "Tổ chức khác" // Compatible với dữ liệu cũ
};

// 录入下拉的主体类型顺序（不含旧的 ORGANIZATION）
export const PARTY_TYPE_OPTIONS: PartyType[] = [
  "NATURAL_PERSON",
  "COMPANY",
  "PARTNERSHIP",
  "INDIVIDUAL_BUSINESS",
  "INSTITUTION",
  "SOCIAL_ORG",
  "GOVERNMENT",
  "OTHER_ORG"
];

// v0.30: 需向律协备案与否
export const barFilingLabel: Record<BarFilingType, string> = {
  NONE: "Không",
  COLLECTIVE: "Cần, liên quan tập thể",
  SENSITIVE: "Cần, liên quan nhạy cảm",
  MAJOR: "Cần, liên quan lớn",
  OTHER: "Cần, trường hợp khác"
};

export const BAR_FILING_OPTIONS: BarFilingType[] = [
  "NONE",
  "COLLECTIVE",
  "SENSITIVE",
  "MAJOR",
  "OTHER"
];

// v0.31: 案件类别按业务性质分三类——决定收案表单结构
// litigation 诉讼/仲裁（民商事/刑事/行政）；project 非诉/专项；counsel 顾问
export type CategoryKind = "litigation" | "project" | "counsel";

export function matterCategoryKind(c: MatterCategory): CategoryKind {
  if (c === "LEGAL_COUNSEL") return "counsel";
  if (c === "NON_LITIGATION" || c === "SPECIAL_PROJECT") return "project";
  // 民商诉讼 / 劳动仲裁 / 商事仲裁 / 刑事 / 行政 → 诉讼/仲裁类
  return "litigation";
}

// Dịch vụ nghiệp vụ cho dự án (có thể điều chỉnh)
export const PROJECT_BUSINESS_TYPES: string[] = [
  "Due diligence - Tư vấn pháp lý",
  "Hợp đồng - Soạn thảo/Review",
  "Đầu tư - Tài chính",
  "M&A - Sáp nhập mua bán",
  "IPO - Niêm yết/đấu giá",
  "Phá sản - Tái cấu trúc",
  "Sở hữu trí tuệ",
  "Tuân thủ - Compliance",
  "Đấu thầu",
  "Giấy phép - Phê duyệt hành chính",
  "Khác"
];

// Loại tư vấn
export const COUNSEL_TYPES: string[] = [
  "Luật sư tư vấn thường xuyên",
  "Luật sư tư vấn dự án đặc biệt"
];

export const matterCategoryLabel: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "Dân sự - Thương mại",
  LABOR_ARBITRATION: "Lao động & Trọng tài",
  COMMERCIAL_ARBITRATION: "Thương mại & Trọng tài",
  CRIMINAL: "Hình sự",
  ADMINISTRATIVE: "Hành chính",
  NON_LITIGATION: "Phi tố tụng",
  LEGAL_COUNSEL: "Tư vấn",
  SPECIAL_PROJECT: "Dự án đặc biệt"
};

export const matterCategoryColor: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "#5B8DEF",
  LABOR_ARBITRATION: "#34D399",
  COMMERCIAL_ARBITRATION: "#38BDF8",
  CRIMINAL: "#FB923C",
  ADMINISTRATIVE: "#FBBF24",
  NON_LITIGATION: "#4FD1C5",
  LEGAL_COUNSEL: "#9B7BF7",
  SPECIAL_PROJECT: "#60A5FA"
};

// v0.17: 案件类别单字图标（用于列表卡片标题前）
export const matterCategoryShort: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "D",
  LABOR_ARBITRATION: "L",
  COMMERCIAL_ARBITRATION: "A",
  CRIMINAL: "H",
  ADMINISTRATIVE: "H",
  NON_LITIGATION: "P",
  LEGAL_COUNSEL: "V",
  SPECIAL_PROJECT: "Đ"
};

export const matterStatusLabel: Record<MatterStatus, string> = {
  PENDING_ACCEPTANCE: "Chờ khởi động",
  IN_PROGRESS: "Đang xử lý",
  ON_HOLD: "Tạm dừng",
  CLOSED: "Đã kết thúc",
  ARCHIVED: "Đã lưu trữ"
};

export const intakeStatusLabel: Record<IntakeStatus, string> = {
  INTAKE: "Đã tư vấn",
  PENDING_CONFIRMATION: "Chờ xác nhận",
  CONVERTED: "Đã chuyển đổi",
  DECLINED: "Từ chối",
  NEEDS_REVISION: "Chờ bổ sung"
};

export const userRoleLabel: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  PRINCIPAL_LAWYER: "Luật sư chính",
  LAWYER: "Luật sư",
  ASSISTANT: "Trợ lý",
  FINANCE: "Tài chính"
};

export const litigationStandingLabel: Record<LitigationStanding, string> = {
  PLAINTIFF: "Nguyên đơn",
  JOINT_PLAINTIFF: "Cùng nguyên đơn",
  DEFENDANT: "Bị đơn",
  JOINT_DEFENDANT: "Cùng bị đơn",
  THIRD_PARTY: "Người thứ ba",
  COUNTERCLAIM_PLAINTIFF: "Nguyên đơn phản tố",
  COUNTERCLAIM_DEFENDANT: "Bị đơn phản tố",
  APPELLANT: "Người kháng cáo",
  APPELLEE: "Bị kháng cáo",
  RETRIAL_APPLICANT: "Người xin xét xử lại",
  RETRIAL_RESPONDENT: "Bị xin xét xử lại",
  ENFORCEMENT_APPLICANT: "Người yêu cầu thi hành",
  EXECUTED_PERSON: "Bị thi hành",
  CRIMINAL_DEFENDANT: "Bị cáo",
  CRIMINAL_VICTIM: "Người bị hại",
  PRIVATE_PROSECUTOR: "Người tự prosecution",
  CRIMINAL_INCIDENTAL_PLAINTIFF: "Nguyên đơn dân sự kèm hình sự",
  ARBITRATION_CLAIMANT: "Người khởi kiện trọng tài",
  ARBITRATION_RESPONDENT: "Bị khởi kiện trọng tài",
  ADMIN_PLAINTIFF: "Nguyên đơn hành chính",
  ADMIN_DEFENDANT: "Bị đơn hành chính",
  ADMIN_RECONSIDERATION_APPLICANT: "Người xin tái xem xét hành chính",
  ADMIN_RECONSIDERATION_RESPONDENT: "Bị xin tái xem xét hành chính",
  NON_LITIGATION_PARTY: "Bên liên quan dự án"
};

export const procedureTypeLabel: Record<ProcedureType, string> = {
  FIRST_INSTANCE: "Tòa sơ thẩm",
  SECOND_INSTANCE: "Tòa phúc thẩm",
  RETRIAL_REVIEW: "Xét xử phúc thẩm",
  RETRIAL: "Xét xử giám đốc thẩm",
  REMAND_FIRST: "Trả về xét xử lần 1",
  REMAND_SECOND: "Trả về xét xử lần 2",
  PROSECUTORIAL_SUPERVISION: "Giám sát tố tụng",
  COMMERCIAL_ARBITRATION: "Trọng tài thương mại",
  LABOR_ARBITRATION: "Trọng tài lao động",
  ARBITRATION_SET_ASIDE: "Hủy phán quyết trọng tài",
  ARBITRATION_ENFORCEMENT_REVIEW: "Xem xét thi hành trọng tài",
  ENFORCEMENT: "Thi hành án",
  ENFORCEMENT_OBJECTION: "Phản đối thi hành",
  INVESTIGATION: "Điều tra",
  PROSECUTION_REVIEW: "Xét xử phúc thẩm",
  DEATH_PENALTY_REVIEW: "Xét xử án tử hình",
  CRIMINAL_ENFORCEMENT: "Thi hành hình sự",
  COMMUTATION_PAROLE_REVIEW: "Xét xét giảm án/tha tù",
  ADMIN_RECONSIDERATION: "Tái xem xét hành chính",
  ADMIN_NON_LITIGATION_ENFORCEMENT: "Thi hành hành chính phi tố tụng",
  NON_LITIGATION_PHASE: "Giai đoạn phi tố tụng",
  CUSTOM: "Tùy chỉnh"
};

export const feeTypeLabel: Record<FeeType, string> = {
  FIXED: "Cố định",
  CONTINGENCY: "Phụ thuộc kết quả",
  TIMED: "Theo thời gian"
};

export const invoiceRequestStatusLabel: Record<InvoiceRequestStatus, string> = {
  PENDING: "Chờ tài chính xử lý",
  APPROVED: "Đã duyệt",
  ISSUED: "Đã xuất hóa đơn",
  REJECTED: "Đã từ chối"
};

export const invoiceRequestStatusColor: Record<InvoiceRequestStatus, string> = {
  PENDING: "#FBBF24",
  APPROVED: "#5B8DEF",
  ISSUED: "#4ADE80",
  REJECTED: "#F87171"
};

/**
 * 按程序类型 + 立场（我方 or 对方）返回可选诉讼地位枚举。
 * 用于收案表单 / 案件详情中的当事人录入联动。
 */
export function procedureToStandingOptions(
  proc: ProcedureType | null | undefined,
  side: "ours" | "opposite"
): LitigationStanding[] {
  if (!proc) return Object.keys(litigationStandingLabel) as LitigationStanding[];

  switch (proc) {
    case "FIRST_INSTANCE":
    case "REMAND_FIRST":
      return side === "ours"
        ? ["PLAINTIFF", "DEFENDANT", "THIRD_PARTY", "COUNTERCLAIM_PLAINTIFF", "COUNTERCLAIM_DEFENDANT"]
        : ["PLAINTIFF", "DEFENDANT", "THIRD_PARTY", "COUNTERCLAIM_PLAINTIFF", "COUNTERCLAIM_DEFENDANT"];

    case "SECOND_INSTANCE":
    case "REMAND_SECOND":
      return ["APPELLANT", "APPELLEE", "THIRD_PARTY"];

    case "RETRIAL_REVIEW":
    case "RETRIAL":
      return ["RETRIAL_APPLICANT", "RETRIAL_RESPONDENT", "THIRD_PARTY"];

    case "PROSECUTORIAL_SUPERVISION":
      return ["RETRIAL_APPLICANT", "RETRIAL_RESPONDENT", "THIRD_PARTY"];

    case "COMMERCIAL_ARBITRATION":
    case "LABOR_ARBITRATION":
      return ["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT", "THIRD_PARTY"];

    case "ARBITRATION_SET_ASIDE":
    case "ARBITRATION_ENFORCEMENT_REVIEW":
      return ["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT"];

    case "ENFORCEMENT":
    case "ENFORCEMENT_OBJECTION":
      return ["ENFORCEMENT_APPLICANT", "EXECUTED_PERSON", "THIRD_PARTY"];

    case "INVESTIGATION":
    case "PROSECUTION_REVIEW":
    case "DEATH_PENALTY_REVIEW":
    case "CRIMINAL_ENFORCEMENT":
    case "COMMUTATION_PAROLE_REVIEW":
      return [
        "CRIMINAL_DEFENDANT",
        "CRIMINAL_VICTIM",
        "PRIVATE_PROSECUTOR",
        "CRIMINAL_INCIDENTAL_PLAINTIFF"
      ];

    case "ADMIN_RECONSIDERATION":
      return ["ADMIN_RECONSIDERATION_APPLICANT", "ADMIN_RECONSIDERATION_RESPONDENT", "THIRD_PARTY"];

    case "ADMIN_NON_LITIGATION_ENFORCEMENT":
      return ["ADMIN_PLAINTIFF", "ADMIN_DEFENDANT", "EXECUTED_PERSON"];

    case "NON_LITIGATION_PHASE":
    case "CUSTOM":
      return ["NON_LITIGATION_PARTY"];

    default:
      return Object.keys(litigationStandingLabel) as LitigationStanding[];
  }
}
