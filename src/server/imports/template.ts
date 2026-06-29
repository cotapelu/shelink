/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/**
 * v0.42 批F：案件批量导入 xlsx 模板生成。
 * 第 1 行表头（必填列带 *），第 2 行示例，另一 sheet 写填写说明。
 */
import ExcelJS from "exceljs";

import { IMPORT_COLUMNS } from "@/lib/imports/matter-import";

export const IMPORT_SHEET_NAME = "案件导入";

const EXAMPLE: Record<string, string> = {
  clientName: "张三",
  clientIdNumber: "110101199001011234",
  clientType: "个人",
  opposingName: "某某科技有限公司",
  opposingIdNumber: "91110000MA01XXXX1A",
  opposingType: "企业",
  category: "民商诉讼",
  status: "办理中",
  ownerEmail: "lawyer@example.com",
  intakeDate: "2026-05-30",
  cause: "买卖合同纠纷",
  claimAmount: "120000",
  clientPhone: "13800000000",
  jurisdiction: "北京市朝阳区"
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

  // 表头样式：必填浅红、选填浅灰
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

  // 示例行
  sheet.addRow(IMPORT_COLUMNS.reduce<Record<string, string>>((acc, c) => {
    acc[c.key] = EXAMPLE[c.key] ?? "";
    return acc;
  }, {}));

  // 说明 sheet
  const notes = wb.addWorksheet("填写说明");
  notes.columns = [
    { header: "列", key: "h", width: 16 },
    { header: "说明", key: "d", width: 60 }
  ];
  notes.getRow(1).font = { bold: true };
  notes.addRow({ h: "必填列", d: "表头带 * 的为必填：客户名称/证件号、相对方名称/证件号、案件类型、案件状态" });
  for (const c of IMPORT_COLUMNS) {
    if (c.hint) notes.addRow({ h: c.header, d: c.hint });
  }
  notes.addRow({ h: "首程序", d: "「办理中」的案件按案件类型自动生成首程序（诉讼→一审、其他→非诉/仲裁阶段）；已结案/已归档不建程序" });
  notes.addRow({ h: "利益冲突", d: "客户与相对方的名称+证件号会写入当事人库，导入后即可被冲突检索命中" });
  notes.addRow({ h: "示例行", d: "第 2 行为示例，正式导入前请删除或覆盖" });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
