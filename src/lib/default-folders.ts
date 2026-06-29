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
import type { MatterCategory } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * v0.8 Cấu trúc thư mục mặc định (theo category vụ án)
 * Tạo Matter mới tự động seed; isDefault=true không xóa được, có thể đổi tên.
 */
export const DEFAULT_FOLDERS_BY_CATEGORY: Record<MatterCategory, readonly string[]> = {
  CIVIL_COMMERCIAL: ["Nhận vụ án", "Nộp đơn", "Thủ tục ủy quyền", "Chứng cứ", "Văn bản thủ tục", "Phiên tòa", "Phán quyết", "Kết thúc"],
  LABOR_ARBITRATION: ["Nhận vụ án", "Thủ tục ủy quyền", "Chứng cứ", "Văn bản trọng tài", "Mở phiên", "Phán quyết", "Tố tụng", "Kết thúc"],
  COMMERCIAL_ARBITRATION: ["Nhận vụ án", "Thủ tục ủy quyền", "Chứng cứ", "Văn bản trọng tài", "Mở phiên", "Phán quyết", "Kết thúc"],
  ADMINISTRATIVE: ["Nhận vụ án", "Nộp đơn", "Thủ tục ủy quyền", "Chứng cứ", "Văn bản thủ tục", "Phiên tòa", "Phán quyết", "Kết thúc"],
  CRIMINAL: ["Nhận vụ án", "Thủ tục ủy quyền", "Xem hồ sơ", "Gặp mặt", "Thu thập chứng cứ", "Trước phiên tòa", "Phiên tòa", "Phán quyết và kháng cáo", "Kết thúc"],
  NON_LITIGATION: ["Dự án", "Nghiên cứu", "Bản ghi công việc", "File đã phát hành", "Lưu trữ"],
  LEGAL_COUNSEL: ["Dự án", "Nghiên cứu", "Bản ghi công việc", "File đã phát hành", "Lưu trữ"],
  SPECIAL_PROJECT: ["Dự án", "Nghiên cứu", "Bản ghi công việc", "File đã phát hành", "Lưu trữ"]
} as const;

/** Tạo thư mục mặc định cho Matter mới trong transaction.
 * Caller cung cấp tx; fn chỉ viết DB, không check quyền.
 */
export async function seedDefaultFolders(
  tx: Prisma.TransactionClient,
  matterId: string,
  category: MatterCategory
) {
  const names = DEFAULT_FOLDERS_BY_CATEGORY[category];
  if (!names || names.length === 0) return;
  await tx.documentFolder.createMany({
    data: names.map((name, i) => ({
      matterId,
      name,
      orderIndex: i,
      isDefault: true
    }))
  });
}

/**
 * Gợi ý tên thư mục lưu trữ mặc định theo template category
 * (dùng khi 'tạo từ template' tự động chọn target).
 * Không gợi ý được trả null, UI cần cho user chọn thủ công.
 */
export function suggestFolderByTemplateCategory(
  templateCategory: string,
  matterCategory: MatterCategory
): string | null {
  const isLitigation =
    matterCategory === "CIVIL_COMMERCIAL" ||
    matterCategory === "ADMINISTRATIVE" ||
    matterCategory === "CRIMINAL";

  const mapLitigation: Record<string, string> = {
    INTAKE: "Nhận vụ án",
    RETAINER: "Thủ tục ủy quyền",
    LITIGATION: matterCategory === "CRIMINAL" ? "Trước phiên tòa" : "Văn bản thủ tục",
    HEARING: matterCategory === "CRIMINAL" ? "Phiên tòa" : "Phiên tòa",
    WORK_PRODUCT: matterCategory === "CRIMINAL" ? "Thu thập chứng cứ" : "Chứng cứ",
    ARCHIVE: matterCategory === "CRIMINAL" ? "Kết thúc" : "Kết thúc",
    CLOSING: "Kết thúc",
    BLANK: matterCategory === "CRIMINAL" ? "Nhận vụ án" : "Nhận vụ án"
  };

  const mapNonLitigation: Record<string, string> = {
    INTAKE: "Dự án",
    RETAINER: "Dự án",
    LITIGATION: "File đã phát hành",
    HEARING: "Bản ghi công việc",
    WORK_PRODUCT: "File đã phát hành",
    ARCHIVE: "Lưu trữ",
    CLOSING: "Lưu trữ",
    BLANK: "Bản ghi công việc"
  };

  const map = isLitigation ? mapLitigation : mapNonLitigation;
  return map[templateCategory] ?? null;
}
