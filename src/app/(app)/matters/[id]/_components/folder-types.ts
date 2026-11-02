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
 * Kiểu dùng chung liên quan hồ sơ / mẫu (v0.8)
 */

export type FolderPayload = {
  id: string;
  name: string;
  orderIndex: number;
  isDefault: boolean;
};

export type FolderDocument = {
  id: string;
  name: string;
  size: number | null;
  folderId: string | null;
  templateId: string | null;
  createdAt: Date;
};

export type TemplateSummary = {
  id: string;
  name: string;
  category:
    | "INTAKE"
    | "RETAINER"
    | "LITIGATION"
    | "HEARING"
    | "WORK_PRODUCT"
    | "ARCHIVE"
    | "CLOSING"
    | "BLANK";
  description: string | null;
  applicableCategories: string[];
  variables: string[];
  isBuiltIn: boolean;
};

export const TEMPLATE_CATEGORY_CN: Record<TemplateSummary["category"], string> = {
  INTAKE: "Văn bản tiếp nhận",
  RETAINER: "Văn bản ủy quyền",
  LITIGATION: "Văn bản tố tụng",
  HEARING: "Văn bản phiên tòa",
  WORK_PRODUCT: "Kết quả công việc",
  ARCHIVE: "Văn bản hồ sơ",
  CLOSING: "Văn bản kết thúc",
  BLANK: "Văn bản trắng"
};

export const VARIABLE_LABEL_CN: Record<string, string> = {
  "firm.name": "Tên văn phòng",
  "firm.address": "Địa chỉ văn phòng",
  "firm.phone": "Điện thoại văn phòng",
  "lawyer.name": "Luật sư chủ trì",
  "lawyer.phone": "Điện thoại luật sư",
  "matter.code": "Mã vụ án",
  "matter.title": "Tên vụ án",
  "matter.causeText": "Nguyên nhân",
  "matter.intakeDate": "Ngày tiếp nhận",
  "matter.claimAmount": "Giá trị tranh chấp",
  "matter.ourStanding": "Lập trường tố tụng phía ta",
  "client.name": "Tên bên ủy quyền",
  "client.idNumber": "Số giấy tờ bên ủy quyền",
  "client.address": "Địa chỉ bên ủy quyền",
  "client.phone": "Điện thoại bên ủy quyền",
  "opposing.name": "Tên bên đối phương",
  "opposing.idNumber": "Số giấy tờ bên đối phương",
  "opposing.address": "Địa chỉ bên đối phương",
  "opposing.phone": "Điện thoại bên đối phương",
  "proceeding.court": "Toà tiếp nhận",
  "proceeding.caseNo": "Số án",
  "todayCN": "Ngày sinh" // key giữ nguyên (hợp đồng template-engine)
};
