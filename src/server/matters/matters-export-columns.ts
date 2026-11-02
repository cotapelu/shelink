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
 * Định nghĩa cột Excel cho export xlsx Matters — THUẦN (không DB/IO).
 * Tách từ export-xlsx.ts (AUTO-67b). Mảng literal dài hạ thành const cấp module
 * (bài học AUTO-57: hàm chứa literal >20 dòng vẫn vi phạm max-lines-per-function).
 */
import type { Column } from "exceljs";

type Col = Partial<Column>;
import { type MatterCategoryKind } from "./matters-export-labels";

// --- Intake ---
const INTAKE_COMMON_START: Col[] = [
    { header: "Intake ID", key: "id", width: 24 },
    { header: "Tiêu đề", key: "title", width: 36 },
    { header: "Phân loại", key: "category", width: 12 },
    { header: "Trạng thái", key: "status", width: 12 },
    { header: "Ngày nhận", key: "receivedAt", width: 12 },
    { header: "Nguyên cáo", key: "cause", width: 18 },
    { header: "Nguyên cáo tự do", key: "causeFreeText", width: 18 },
    { header: "Mô tả vụ án", key: "description", width: 36 },
    { header: "Khách hàng", key: "client", width: 20 },
    { header: "Loại khách hàng", key: "clientType", width: 12 },
    { header: "Số ID khách hàng", key: "clientIdNumber", width: 22 },
    { header: "Địa chỉ khách hàng", key: "clientAddress", width: 28 },
    { header: "Đại diện pháp lý", key: "clientLegalRep", width: 14 },
    { header: "Người liên hệ", key: "contactName", width: 14 },
    { header: "Điện thoại", key: "contactPhone", width: 16 },
    { header: "Liên hệ trong hồ sơ", key: "clientContacts", width: 28 },
    { header: "Luật sư phụ trách", key: "owner", width: 12 },
    { header: "Luật sư cùng tham gia", key: "coUsers", width: 24 }
  ];
const INTAKE_LITIGATION: Col[] = [
    { header: "Thủ tục đầu tiên", key: "firstProcedureType", width: 14 },
    { header: "Cơ quan giải quyết", key: "firstAgency", width: 24 },
    { header: "Có thẩm quyền", key: "jurisdiction", width: 18 },
    { header: "Vị trí của tôi", key: "ourStanding", width: 14 },
    { header: "Giá trị yêu cầu", key: "money", width: 14 },
    { header: "Mô tả yêu cầu", key: "claimDescription", width: 24 },
    { header: "Lưu trữ hội luật sư", key: "barFiling", width: 18 },
    { header: "Có khiếu nại ngược", key: "counterclaim", width: 10 },
    { header: "Các bên liên quan", key: "parties", width: 44 }
  ];
const INTAKE_PROJECT: Col[] = [
    { header: "Loại dịch vụ", key: "businessType", width: 16 },
    { header: "Phạm vi dịch vụ", key: "serviceScope", width: 28 },
    { header: "Kết quả bàn giao", key: "deliverables", width: 24 },
    { header: "Dịch vụ bắt đầu", key: "serviceStart", width: 12 },
    { header: "Dịch vụ kết thúc", key: "serviceEnd", width: 12 },
    { header: "Các bên liên quan", key: "parties", width: 44 }
  ];
const INTAKE_COUNSEL: Col[] = [
    { header: "Loại tư vấn", key: "counselType", width: 16 },
    { header: "Phạm vi dịch vụ", key: "serviceScope", width: 28 },
    { header: "Dịch vụ bắt đầu", key: "serviceStart", width: 12 },
    { header: "Dịch vụ kết thúc", key: "serviceEnd", width: 12 },
    { header: "Các bên liên quan", key: "parties", width: 44 }
  ];
const INTAKE_COMMON_END: Col[] = [
    { header: "Hình thức thu phí", key: "feeType", width: 14 },
    { header: "Số tiền luật sư", key: "feeAmount", width: 14 },
    { header: "Điều khoản phụ thuộc", key: "contingencyTerms", width: 26 },
    { header: "Các mốc thanh toán", key: "feeSchedule", width: 26 },
    { header: "Ghi chú phí", key: "feeNote", width: 24 },
    { header: "Tài liệu đính kèm", key: "documents", width: 36 },
    { header: "Vụ án chuyển đổi", key: "matter", width: 28 },
    { header: "Lý do từ chối/bổ sung", key: "declinedReason", width: 30 },
    { header: "Ngày tạo", key: "createdAt", width: 18 },
    { header: "Ngày cập nhật", key: "updatedAt", width: 18 }
  ];

// --- Matter ---
const MATTER_COMMON_START: Col[] = [
    { header: "Mã hệ thống", key: "internalCode", width: 16 },
    { header: "Mã nội bộ", key: "firmCaseNo", width: 18 },
    { header: "Tên vụ án", key: "title", width: 38 },
    { header: "Phân loại", key: "category", width: 12 },
    { header: "Trạng thái", key: "status", width: 12 },
    { header: "Ngày nhận", key: "intakeDate", width: 12 },
    { header: "Lần đầu nộp đơn/bắt đầu", key: "firstAcceptedAt", width: 12 },
    { header: "Ngày kết thúc", key: "closedAt", width: 12 },
    { header: "Ngày lưu trữ", key: "archivedAt", width: 12 },
    { header: "Khách hàng chính", key: "primaryClient", width: 20 },
    { header: "Loại khách hàng chính", key: "primaryClientType", width: 12 },
    { header: "Số ID khách hàng chính", key: "primaryClientIdNumber", width: 22 },
    { header: "Địa chỉ khách hàng chính", key: "primaryClientAddress", width: 28 },
    { header: "Đại diện pháp lý", key: "primaryClientLegalRep", width: 16 },
    { header: "Liên hệ khách hàng chính", key: "primaryClientContacts", width: 28 },
    { header: "Khách hàng khác", key: "otherClients", width: 30 },
    { header: "Luật sư phụ trách", key: "owner", width: 12 },
    { header: "Thành viên team", key: "members", width: 30 }
  ];
const MATTER_LITIGATION: Col[] = [
    { header: "Nguyên cáo", key: "cause", width: 18 },
    { header: "Nguyên cáo tự do", key: "causeFreeText", width: 18 },
    { header: "Giá trị yêu cầu", key: "claimAmount", width: 14 },
    { header: "Vị trí của tôi", key: "ourStanding", width: 14 },
    { header: "Nguyên cáo ngược", key: "counterclaimAsPlaintiff", width: 10 },
    { header: "Bị cáo ngược", key: "counterclaimAsDefendant", width: 10 },
    { header: "Lưu trữ hội luật sư", key: "barFiling", width: 18 },
    { header: "Các bên liên quan", key: "parties", width: 48 }
  ];
const MATTER_PROJECT: Col[] = [
    { header: "Loại hình dự án", key: "businessType", width: 16 },
    { header: "Phạm vi dịch vụ", key: "serviceScope", width: 28 },
    { header: "Đầu ra", key: "deliverables", width: 24 },
    { header: "Bắt đầu dịch vụ", key: "serviceStart", width: 12 },
    { header: "Kết thúc dịch vụ", key: "serviceEnd", width: 12 },
    { header: "Các bên liên quan", key: "parties", width: 48 },
    { header: "Tóm tắt thủ tục/giai đoạn", key: "procedureSummary", width: 42 }
  ];
const MATTER_COUNSEL: Col[] = [
    { header: "Loại tư vấn", key: "counselType", width: 16 },
    { header: "Phạm vi dịch vụ", key: "serviceScope", width: 28 },
    { header: "Bắt đầu dịch vụ", key: "serviceStart", width: 12 },
    { header: "Kết thúc dịch vụ", key: "serviceEnd", width: 12 },
    { header: "Các bên liên quan", key: "parties", width: 48 },
    { header: "Tóm tắt thủ tục/giai đoạn", key: "procedureSummary", width: 42 }
  ];
const MATTER_LITIGATION_SOURCE: Col[] = [
    { header: "Nguồn: Thủ tục đầu tiên", key: "sourceFirstProcedureType", width: 14 },
    { header: "Nguồn: Cơ quan giải quyết", key: "sourceFirstAgency", width: 24 },
    { header: "Nguồn: Có thẩm quyền", key: "sourceJurisdiction", width: 18 },
    { header: "Nguồn: Vị trí của tôi", key: "sourceOurStanding", width: 14 },
    { header: "Nguồn: Giá trị yêu cầu", key: "sourceClaimAmount", width: 14 },
    { header: "Nguồn: Mô tả yêu cầu", key: "sourceClaimDescription", width: 24 },
    { header: "Nguồn: Lưu trữ hội luật sư", key: "sourceBarFiling", width: 18 },
    { header: "Nguồn: Có khiếu nại ngược", key: "sourceCounterclaim", width: 12 }
  ];
const MATTER_PROJECT_SOURCE: Col[] = [
    { header: "Nguồn: Loại hình", key: "sourceBusinessType", width: 16 },
    { header: "Nguồn: Phạm vi dịch vụ", key: "sourceServiceScope", width: 28 },
    { header: "Nguồn: Đầu ra", key: "sourceDeliverables", width: 24 },
    { header: "Nguồn: Dịch vụ bắt đầu", key: "sourceServiceStart", width: 12 },
    { header: "Nguồn: Dịch vụ kết thúc", key: "sourceServiceEnd", width: 12 }
  ];
const MATTER_COUNSEL_SOURCE: Col[] = [
    { header: "Nguồn: Loại tư vấn", key: "sourceCounselType", width: 16 },
    { header: "Nguồn: Phạm vi dịch vụ", key: "sourceServiceScope", width: 28 },
    { header: "Nguồn: Dịch vụ bắt đầu", key: "sourceServiceStart", width: 12 },
    { header: "Nguồn: Dịch vụ kết thúc", key: "sourceServiceEnd", width: 12 }
  ];
const MATTER_COMMON_END: Col[] = [
    { header: "Thực thể liên kết", key: "relatedEntities", width: 36 },
    { header: "Vụ án liên kết", key: "relatedMatters", width: 36 },
    { header: "Tài liệu vụ án", key: "documents", width: 36 },
    { header: "Trường tùy chỉnh", key: "customValues", width: 30 },
    { header: "Tiêu đề intake nguồn", key: "intakeTitle", width: 34 },
    { header: "Trạng thái intake nguồn", key: "intakeStatus", width: 12 },
    { header: "Ngày nhận nguồn", key: "sourceReceivedAt", width: 12 },
    { header: "Mô tả vụ án nguồn", key: "sourceDescription", width: 34 },
    { header: "Hình thức thu phí nguồn", key: "sourceFeeType", width: 14 },
    { header: "Số tiền luật sư nguồn", key: "sourceFeeAmount", width: 14 },
    { header: "Các mốcthanh toán nguồn", key: "sourceFeeSchedule", width: 26 },
    { header: "Ghi chú phí nguồn", key: "sourceFeeNote", width: 24 },
    { header: "Luật sư cùng nguồn", key: "sourceCoUsers", width: 24 },
    { header: "Tài liệu nguồn", key: "sourceDocuments", width: 36 },
    { header: "Ngày tạo", key: "createdAt", width: 18 },
    { header: "Ngày cập nhật", key: "updatedAt", width: 18 }
  ];

// Mỗi thủ tục sinh 21 cột; placeholder {i} thay bằng số thứ tự
const PROCEDURE_COLUMN_SPEC: Col[] = [
      { header: `Thủ tục {i}-Loại`, key: `procedure{i}Type`, width: 14 },
      { header: `Thủ tục {i}-Nhãn`, key: `procedure{i}Label`, width: 16 },
      { header: `Thủ tục {i}-Cách tham gia`, key: `procedure{i}Engagement`, width: 12 },
      { header: `Thủ tục {i}-Trạng thái`, key: `procedure{i}Status`, width: 12 },
      { header: `Thủ tục {i}-Số vụ án`, key: `procedure{i}CaseNumber`, width: 24 },
      { header: `Thủ tục {i}-Có thẩm quyền`, key: `procedure{i}Jurisdiction`, width: 18 },
      { header: `Thủ tục {i}-Cơ quan xử lý`, key: `procedure{i}HandlingAgency`, width: 24 },
      { header: `Thủ tục {i}-Ban xét xử/Phòng ban`, key: `procedure{i}Panel`, width: 20 },
      { header: `Thủ tục {i}-Người xử lý`, key: `procedure{i}Handler`, width: 16 },
      { header: `Thủ tục {i}-Vị trí của tôi`, key: `procedure{i}OurStanding`, width: 14 },
      { header: `Thủ tục {i}-Luật sư phụ trách`, key: `procedure{i}LeadLawyer`, width: 14 },
      { header: `Thủ tục {i}-Đại diện bên ngoài`, key: `procedure{i}ExternalLead`, width: 10 },
      { header: `Thủ tục {i}-Nộp đơn/Bắt đầu`, key: `procedure{i}AcceptedAt`, width: 12 },
      { header: `Thủ tục {i}-Phán quyết/Kết thúc`, key: `procedure{i}ConcludedAt`, width: 12 },
      { header: `Thủ tục {i}-Kết quả`, key: `procedure{i}Outcome`, width: 12 },
      { header: `Thủ tục {i}-Giải thích kết quả`, key: `procedure{i}OutcomeNote`, width: 26 },
      { header: `Thủ tục {i}-Thẩm phán/Trọng tài viên/Thực thi judge`, key: `procedure{i}PresidingJudge`, width: 22 },
      { header: `Thủ tục {i}-Thông tin liên hệ`, key: `procedure{i}PresidingJudgeContact`, width: 18 },
      { header: `Thủ tục {i}-Trợ lý`, key: `procedure{i}JudgeAssistant`, width: 16 },
      { header: `Thủ tục {i}-Thông tin liên hệ trợ lý`, key: `procedure{i}JudgeAssistantContact`, width: 18 },
      { header: `Thủ tục {i}-Các bên liên quan`, key: `procedure{i}Parties`, width: 48 }
    ];


// --- Intake columns ---

function intakeTypedColumns(kind: MatterCategoryKind): Col[] {
  if (kind === "litigation") return INTAKE_LITIGATION;
  if (kind === "project") return INTAKE_PROJECT;
  return INTAKE_COUNSEL;
}

export function intakeColumnsForKind(kind: MatterCategoryKind): Col[] {
  return [...INTAKE_COMMON_START, ...intakeTypedColumns(kind), ...INTAKE_COMMON_END];
}

// --- Matter columns ---

function matterTypedColumns(kind: MatterCategoryKind): Col[] {
  if (kind === "litigation") return MATTER_LITIGATION;
  if (kind === "project") return MATTER_PROJECT;
  return MATTER_COUNSEL;
}

function matterSourceColumns(kind: MatterCategoryKind): Col[] {
  if (kind === "litigation") return MATTER_LITIGATION_SOURCE;
  if (kind === "project") return MATTER_PROJECT_SOURCE;
  return MATTER_COUNSEL_SOURCE;
}

function matterProcedureColumns(maxProcedures: number): Col[] {
  const result: Col[] = [];
  for (let i = 1; i <= maxProcedures; i += 1) {
    for (const spec of PROCEDURE_COLUMN_SPEC) {
      const key = typeof spec.key === "string" ? spec.key.replace("{i}", String(i)) : "";
      const header = typeof spec.header === "string" ? spec.header.replace("{i}", String(i)) : "";
      result.push({ ...spec, key, header });
    }
  }
  return result;
}

export function matterColumnsForKind(
  kind: MatterCategoryKind,
  maxProcedures: number
): Col[] {
  return [
    ...MATTER_COMMON_START,
    ...matterTypedColumns(kind),
    ...matterProcedureColumns(maxProcedures),
    ...matterSourceColumns(kind),
    ...MATTER_COMMON_END
  ];
}
