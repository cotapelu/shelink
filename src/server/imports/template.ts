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
 * v0.42 Batch F: Tạo template xlsx cho import hàng loạt vụ án.
 * Dòng 1: header (cột có * là bắt buộc), dòng 2: ví dụ, sheet khác ghi hướng dẫn điền.
 */
import ExcelJS from "exceljs";

import { IMPORT_COLUMNS } from "@/lib/imports/matter-import";

export const IMPORT_SHEET_NAME = "Tải lên mẫu";

const EXAMPLE: Record<string, string> = {
  clientName: "Nguyễn Văn A",
  clientIdNumber: "110101199001011234",
  clientType: "Cá nhân",
  opposingName: "Công ty TNHH ABC",
  opposingIdNumber: "91110000MA01XXXX1A",
  opposingType: "Doanh nghiệp",
  category: "Dân sự thương mại",
  status: "Đang xử lý",
  ownerEmail: "lawyer@example.com",
  intakeDate: "2026-05-30",
  cause: "Tranh chấp hợp đồng mua bán",
  claimAmount: "120000",
  clientPhone: "0900000000",
  jurisdiction: "Quận Hai Bà Trưng, Hà Nội"
};

export async function buildMatterImportTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LawLink";
  wb.created = new Date();

  const sheet = wb.addWorksheet(IMPORT_SHEET_NAME);
  sheet.columns = IMPORT_COLUMNS.map((c) => ({
    header: c.required ? `${c.header}*` : c.header,
    key: c.key,
    width: Math.max(12, c.header.length * 2 + 4)
  }));

  // Header style: bắt buộc light red, không bắt buộc light gray
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };
  IMPORT_COLUMNS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: c.required ? "FFFCE4E4" : "FFEFEFEF" }
    };
  });
  headerRow.height = 20;

  // Dòng ví dụ
  sheet.addRow(IMPORT_COLUMNS.reduce<Record<string, string>>((acc, c) => {
    acc[c.key] = EXAMPLE[c.key] ?? "";
    return acc;
  }, {}));

  // Sheet ghi chú
  const notes = wb.addWorksheet("填写说明");
  notes.columns = [
    { header: "列", key: "h", width: 16 },
    { header: "说明", key: "d", width: 60 }
  ];
  notes.getRow(1).font = { bold: true };
  notes.addRow({ h: "Cột bắt buộc", d: "Có dấu * ở header: Tên khách hàng/Số ID, Tên đối phương/Số ID, Loại vụ án, Trạng thái vụ án" });
  for (const c of IMPORT_COLUMNS) {
    if (c.hint) notes.addRow({ h: c.header, d: c.hint });
  }
  notes.addRow({ h: "Thủ tục đầu tiên", d: "Với trạng thái 'Đang xử lý', tự động tạo thủ tục đầu tiên theo loại vụ án (Dân sự → First Instance, khác → Non-litigation/Arbitration Phase); Trạng thái Đã kết thúc/Đã lưu trữ không tạo" });
  notes.addRow({ h: "Xung đột lợi ích", d: "Tên + mã số của khách hàng và đối phương sẽ được lưu vào CSDL các bên, sau khi import có thể được tìm thấy bởi tính năng kiểm tra xung đột" });
  notes.addRow({ h: "Dòng ví dụ", d: "Dòng 2 là ví dụ, trước khi import chính thức hãy xóa hoặc thay thế" });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
