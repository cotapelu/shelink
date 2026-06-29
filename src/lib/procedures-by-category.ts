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
import type { MatterCategory, ProcedureType, LitigationStanding } from "@prisma/client";

/** Các loại thủ tục có thể chọn theo category vụ án.
 * UI: "Tạo vụ án" và "Thêm thủ tục" lọc options theo bảng này.
 */
export const proceduresByCategory: Record<MatterCategory, ProcedureType[]> = {
  CIVIL_COMMERCIAL: [
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "REMAND_FIRST",
    "REMAND_SECOND",
    "COMMERCIAL_ARBITRATION",
    "LABOR_ARBITRATION",
    "ARBITRATION_SET_ASIDE",
    "ARBITRATION_ENFORCEMENT_REVIEW",
    "ENFORCEMENT",
    "ENFORCEMENT_OBJECTION",
    "PROSECUTORIAL_SUPERVISION",
    "CUSTOM"
  ],
  CRIMINAL: [
    "INVESTIGATION",
    "PROSECUTION_REVIEW",
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "DEATH_PENALTY_REVIEW",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "CRIMINAL_ENFORCEMENT",
    "COMMUTATION_PAROLE_REVIEW",
    "PROSECUTORIAL_SUPERVISION",
    "CUSTOM"
  ],
  ADMINISTRATIVE: [
    "ADMIN_RECONSIDERATION",
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "ADMIN_NON_LITIGATION_ENFORCEMENT",
    "PROSECUTORIAL_SUPERVISION",
    "CUSTOM"
  ],
  // 劳动仲裁前置，裁后不服可续一审/二审/再审/执行
  LABOR_ARBITRATION: [
    "LABOR_ARBITRATION",
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "ENFORCEMENT",
    "CUSTOM"
  ],
  // 商事仲裁一裁终局：只有商事仲裁一个程序
  COMMERCIAL_ARBITRATION: ["COMMERCIAL_ARBITRATION"],
  NON_LITIGATION: ["NON_LITIGATION_PHASE", "CUSTOM"],
  LEGAL_COUNSEL: ["NON_LITIGATION_PHASE", "CUSTOM"],
  SPECIAL_PROJECT: ["NON_LITIGATION_PHASE", "CUSTOM"]
};

/**
 * 各案件类别下可选的诉讼地位（我方角色）。
 */
export const standingsByCategory: Record<MatterCategory, LitigationStanding[]> = {
  CIVIL_COMMERCIAL: [
    "PLAINTIFF",
    "DEFENDANT",
    "THIRD_PARTY",
    "ARBITRATION_CLAIMANT",
    "ARBITRATION_RESPONDENT"
  ],
  CRIMINAL: [
    "CRIMINAL_DEFENDANT",
    "CRIMINAL_VICTIM",
    "PRIVATE_PROSECUTOR",
    "CRIMINAL_INCIDENTAL_PLAINTIFF"
  ],
  ADMINISTRATIVE: ["PLAINTIFF", "DEFENDANT", "THIRD_PARTY"],
  LABOR_ARBITRATION: [
    "ARBITRATION_CLAIMANT",
    "ARBITRATION_RESPONDENT",
    "PLAINTIFF",
    "DEFENDANT",
    "THIRD_PARTY"
  ],
  COMMERCIAL_ARBITRATION: ["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT", "THIRD_PARTY"],
  NON_LITIGATION: ["NON_LITIGATION_PARTY"],
  LEGAL_COUNSEL: ["NON_LITIGATION_PARTY"],
  SPECIAL_PROJECT: ["NON_LITIGATION_PARTY"]
};

/** Gợi ý 'Cơ quan xử lý' theo loại thủ tục. */
export function suggestHandlingAgency(type: ProcedureType): string {
  if (type === "INVESTIGATION") return "Công an / Thanh tra / An ninh";
  if (type === "PROSECUTION_REVIEW") return "Viện kiểm sát (phòng xét xử)";
  if (type === "PROSECUTORIAL_SUPERVISION") return "Viện kiểm sát";
  if (type === "CRIMINAL_ENFORCEMENT") return "Nhà tù / Trại giam / Cơ quan cộng đồng";
  if (type === "COMMUTATION_PAROLE_REVIEW") return "Tòa án (phòng thi hành)";
  if (type === "ADMIN_RECONSIDERATION") return "Cơ quan phúc thẩm hành chính";
  if (type === "COMMERCIAL_ARBITRATION") return "Hội đồng trọng tài thương mại";
  if (type === "LABOR_ARBITRATION") return "Hội đồng trọng tài lao động";
  if (type === "ARBITRATION_SET_ASIDE" || type === "ARBITRATION_ENFORCEMENT_REVIEW")
    return "Tòa án trung cấp";
  if (type === "ENFORCEMENT" || type === "ENFORCEMENT_OBJECTION") return "Tòa án (phòng thi hành)";
  if (type === "ADMIN_NON_LITIGATION_ENFORCEMENT") return "Tòa án";
  // Tố tụng: sơ thẩm/phúc thẩm/giám đốc thẩm...
  return "Tòa án";
}

export const matterCategoryCode: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "CC",
  LABOR_ARBITRATION: "LA",
  COMMERCIAL_ARBITRATION: "CA",
  CRIMINAL: "CR",
  ADMINISTRATIVE: "AD",
  NON_LITIGATION: "NL",
  LEGAL_COUNSEL: "GC",
  SPECIAL_PROJECT: "SP"
};
