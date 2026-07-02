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
 * v0.8 Tạo file docx động cho 8 template open source (lô đầu tiên ★ templates)
 *
 * Dùng thư viện docx để tạo Buffer, docxtemplater dùng cú pháp {{var}}.
 * Sau deploy, upload custom template tại /settings/templates.
 *
 * 8 templates:
 *  1. Biểu mẫu đăng ký nhận vụ án dân sự
 *  2. Biểu mẫu đăng ký nhận vụ án hình sự
 *  3. Thông báo rủi ro dịch vụ pháp lý
 *  4. Hợp đồng ủy quyền (Cá nhân)
 *  5. Hợp đồng ủy quyền (Công ty)
 *  6. Giấy ủy quyền (Cá nhân)
 *  7. Trang trình tố dân sự
 *  8. Biện luận dân sự
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  WidthType,
  BorderStyle,
  PageNumber,
  PageOrientation,
  type ISectionOptions
} from "docx";
import type { MatterCategory, TemplateCategory } from "@prisma/client";

export interface BuiltInTemplateMeta {
  key: string; // 唯一稳定 key（seed 用 upsert）
  name: string;
  category: TemplateCategory;
  description: string;
  applicableCategories: MatterCategory[];
  variables: string[];
}

export interface BuiltInTemplate extends BuiltInTemplateMeta {
  buildBuffer: () => Promise<Buffer>;
}

// ============================================================
// 辅助
// ============================================================
const FONT_TITLE = "SimHei";
const FONT_BODY = "FangSong";

function title(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 120, after: 240 },
    children: [
      new TextRun({ text, font: FONT_TITLE, size: 40, bold: true })
    ]
  });
}

function body(text: string, opts?: { indent?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean }): Paragraph {
  return new Paragraph({
    alignment: opts?.align ?? AlignmentType.LEFT,
    spacing: { before: 60, after: 60, line: 360 },
    indent: opts?.indent ? { firstLine: 480 } : undefined,
    children: [new TextRun({ text, font: FONT_BODY, size: 24, bold: opts?.bold })]
  });
}

function blank(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 60, after: 60 } });
}

function kvRow(k: string, v: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: k, font: FONT_BODY, size: 22, bold: true })]
          })
        ]
      }),
      new TableCell({
        width: { size: 75, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: v, font: FONT_BODY, size: 22 })]
          })
        ]
      })
    ]
  });
}

function kvTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "BBBBBB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "BBBBBB" }
    },
    rows: rows.map(([k, v]) => kvRow(k, v))
  });
}

function sectionDefaults(children: (Paragraph | Table)[]): ISectionOptions {
  return {
    properties: {
      page: {
        size: { orientation: PageOrientation.PORTRAIT },
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } // 2cm
      }
    },
    headers: undefined,
    footers: {
      default: undefined
    },
    children: [
      ...children,
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [
          new TextRun({ text: "— ", font: FONT_BODY, size: 18, color: "999999" }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 18, color: "999999" }),
          new TextRun({ text: " —", font: FONT_BODY, size: 18, color: "999999" })
        ]
      })
    ]
  };
}

async function pack(children: (Paragraph | Table)[]): Promise<Buffer> {
  const doc = new Document({
    creator: "LawLink",
    title: "LawLink 模板",
    sections: [sectionDefaults(children)]
  });
  return Packer.toBuffer(doc);
}

// ============================================================
// Template 1: Biểu mẫu đăng ký nhận vụ án dân sự
// ============================================================
const T1_VARS = [
  "firm.name",
  "matter.code",
  "matter.intakeDate",
  "matter.causeText",
  "matter.claimAmount",
  "client.name",
  "client.address",
  "client.phone",
  "opposing.name",
  "opposing.address",
  "proceeding.court",
  "lawyer.name",
  "todayCN"
];

async function buildT1(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("Biểu mẫu đăng ký nhận vụ án dân sự"),
    body("案件编号：{{matter.code}}", { align: AlignmentType.RIGHT }),
    blank(),
    kvTable([
      ["Ngày nhận vụ án", "{{matter.intakeDate}}"],
      ["Vụ án", "{{matter.causeText}}"],
      ["Loại vụ án", "Dân sự"],
      ["Người ủy quyền", "{{client.name}}"],
      ["Địa chỉ người ủy quyền", "{{client.address}}"],
      ["Số điện thoại", "{{client.phone}}"],
      ["Bên đối phương", "{{opposing.name}}"],
      ["Địa chỉ đối phương", "{{opposing.address}}"],
      ["Tòa án tiếp nhận", "{{proceeding.court}}"],
      ["Giá trị yêu cầu", "{{matter.claimAmount}}"],
      ["Luật sư phụ trách", "{{lawyer.name}}"]
    ]),
    blank(),
    body("登记日期：{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// 模板 2: 刑事案件收案登记表
// ============================================================
const T2_VARS = [
  "firm.name",
  "matter.code",
  "matter.intakeDate",
  "matter.causeText",
  "client.name",
  "client.phone",
  "opposing.name",
  "opposing.address",
  "lawyer.name",
  "todayCN"
];

async function buildT2(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("Biểu mẫu đăng ký nhận vụ án hình sự"),
    body("案件编号：{{matter.code}}", { align: AlignmentType.RIGHT }),
    blank(),
    kvTable([
      ["Ngày nhận vụ án", "{{matter.intakeDate}}"],
      ["Tội danh bị cáo buộc", "{{matter.causeText}}"],
      ["Người ủy quyền (gia đình)", "{{client.name}}"],
      ["Mối quan hệ với bị cáo", ""],
      ["Số điện thoại", "{{client.phone}}"],
      ["Tên bị cáo", "{{opposing.name}}"],
      ["Địa điểm giam giữ/trú", "{{opposing.address}}"],
      ["Giai đoạn vụ án", "Điều tra / Xét xử phúc thẩm / Tòa sơ thẩm / Tòa phúc thẩm / Xét xử giám đốc thẩm"],
      ["Cơ quan xử lý", ""],
      ["Luật sư phụ trách", "{{lawyer.name}}"]
    ]),
    blank(),
    body("Ngày đăng ký：{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// 模板 3: 法律服务风险告知书
// ============================================================
const T3_VARS = ["firm.name", "client.name", "matter.causeText", "lawyer.name", "todayCN"];

async function buildT3(): Promise<Buffer> {
  return pack([
    title("Thông báo rủi ro dịch vụ pháp lý"),
    body("Gửi：{{client.name}}", { bold: true }),
    blank(),
    body(
      "Văn phòng luật sư và luật sư của chúng tôi khi nhận ủy quyền của quý khách xử lý vụ án {{matter.causeText}}, theo quy định của Luật sư, Quy tắc hành nghề, sẽ thông báo các rủi ro sau, xem kỹ：",
      { indent: true }
    ),
    blank(),
    body("1. Bất định về kết quả dịch vụ pháp lý. Kết quả xử lý vụ án phụ thuộc vào nhiều yếu tố như sự kiện, bằng chứng, áp dụng pháp luật, phán đoán tòa, hành vi đối phương... Luật sư không thể hứa hẹn kết quả chắc chắn.", { indent: true }),
    body("2. Kết quả vụ án không phụ thuộc vào số phí ủy quyền. Phí luật sư liên quan đến nỗ lực xử lý, không tương ứng với kết quả tố tụng.", { indent: true }),
    body("3. Trách nhiệm tính chân thực bằng chứng. Người ủy quyền phải cung cấp bằng chứng chân thực, hợp pháp. Nếu do bằng chứng sai hoặc khuyết tật dẫn đến hậu quả bất lợi, người ủy quyền tự chịu trách nhiệm.", { indent: true }),
    body("4. Thời hiệu kiện và hạn chứng cứ. Người ủy quyền phải đưa ra yêu cầu trong thời hiệu pháp luật và nộp toàn bộ bằng chứng trước hạn chứng cứ, quá hạn có thể mất quyền.", { indent: true }),
    body("5. Rủi ro thi hành án. Ngay cả khi thắng kiện, do đối phương không có khả năng thi hành, có thể không thể thi hành hoặc thi hành không đủ.", { indent: true }),
    body("6. Khả năng hòa giải và điều trung. Luật sư sẽ đánh giá phương án hòa giải/điều trung theo tình hình, quyết định cuối cùng thuộc về người ủy quyền.", { indent: true }),
    body("7. Các vấn đề khác.", { indent: true }),
    blank(),
    body("Người ủy quyền (ký tên)：________________"),
    blank(),
    body("承办律师：{{lawyer.name}}"),
    body("Văn phòng luật sư：{{firm.name}}"),
    body("Ngày thông báo：{{todayCN}}")
  ]);
}

// ============================================================
// 模板 4: 委托代理合同（个人）
// ============================================================
const T4_VARS = [
  "firm.name",
  "firm.address",
  "firm.phone",
  "client.name",
  "client.idNumber",
  "client.address",
  "client.phone",
  "matter.causeText",
  "lawyer.name",
  "todayCN"
];

async function buildT4(): Promise<Buffer> {
  return pack([
    title("Hợp đồng ủy quyền"),
    body("(Áp dụng cho cá nhân ủy quyền)"),
    blank(),
    body("Bên gửi (Người ủy quyền)：{{client.name}}"),
    body("Số CMND/CCCD：{{client.idNumber}}"),
    body("Nơi cư trú：{{client.address}}"),
    body("Điện thoại：{{client.phone}}"),
    blank(),
    body("Bên nhận (Người được ủy quyền)：{{firm.name}}"),
    body("Địa chỉ：{{firm.address}}"),
    body("Điện thoại：{{firm.phone}}"),
    blank(),
    body("Hai bên theo Bộ luật Dân sự, Luật Luật sư, sau khi thỏa thuận, ký kết hợp đồng ủy quyền này:", { indent: true }),
    blank(),
    body("Điều 1. Nội dung ủy quyền và quyền hạn đại diện", { bold: true }),
    body("Bên gửi ủy quyền cho Bên nhận cử luật sư cung cấp dịch vụ pháp lý cho vụ án {{matter.causeText}}. Quyền hạn đại diện: ________________ (đại diện thông thường / đại diện đặc biệt: bao gồm thay mặt thừa nhận, từ bỏ, thay đổi yêu cầu tố tụng, thay mặt hòa giải, thay mặt khởi kiện phản tố hoặc kháng cáo, v.v.).", { indent: true }),
    blank(),
    body("Điều 2. Phạm vi dịch vụ ủy quyền", { bold: true }),
    body("(Sơ thẩm / Phúc thẩm / Giám đốc thẩm / Trọng tài / Thi hành án)", { indent: true }),
    blank(),
    body("Điều 3. Phí luật sư và phương thức thanh toán", { bold: true }),
    body("Số phí ủy quyền: ________ đồng (bằng chữ: ________________ đồng).", { indent: true }),
    body("Cách thanh toán: ________________.", { indent: true }),
    blank(),
    body("Điều 4. Chi phí khác", { bold: true }),
    body("Các chi phí tố tụng, bảo tồn, thẩm định, đi lại... phát sinh trong quá trình xử lý vụ án do Bên gửi chịu.", { indent: true }),
    blank(),
    body("Điều 5. Quyền và nghĩa vụ của các bên", { bold: true }),
    body("Bỏ qua", { indent: true }),
    blank(),
    body("Điều 6. Chấm dứt hợp đồng", { bold: true }),
    body("Bỏ qua", { indent: true }),
    blank(),
    body("Điều 7. Giải quyết tranh chấp", { bold: true }),
    body("Tranh chấp phát sinh từ hợp đồng này, hai bên sẽ thương lượng; nếu không thành, đưa ra tòa có thẩm quyền tại nơi Bên nhận đóng trụ sở để giải quyết.", { indent: true }),
    blank(),
    body("本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。", { indent: true }),
    blank(),
    blank(),
    body("Bên gửi (ký tên)：________________            Bên nhận (đóng dấu)："),
    blank(),
    body("                                            承办律师：{{lawyer.name}}"),
    blank(),
    body("签订日期：{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// 模板 5: 委托代理合同（单位）
// ============================================================
const T5_VARS = [
  "firm.name",
  "firm.address",
  "firm.phone",
  "client.name",
  "client.idNumber",
  "client.address",
  "client.phone",
  "matter.causeText",
  "lawyer.name",
  "todayCN"
];

async function buildT5(): Promise<Buffer> {
  return pack([
    title("Hợp đồng ủy quyền"),
    body("(Áp dụng cho pháp nhân hoặc tổ chức không phải pháp nhân)"),
    blank(),
    body("Bên A (Người ủy quyền): {{client.name}}"),
    body("Mã số thuế: {{client.idNumber}}"),
    body("Địa chỉ trụ sở: {{client.address}}"),
    body("Người đại diện pháp luật/người phụ trách: ________________"),
    body("Điện thoại: {{client.phone}}"),
    blank(),
    body("Bên B (Người nhận ủy quyền): {{firm.name}}"),
    body("Địa chỉ: {{firm.address}}"),
    body("Điện thoại: {{firm.phone}}"),
    blank(),
    body("Hai bên ký kết hợp đồng ủy quyền này về các vấn đề sau:", { indent: true }),
    blank(),
    body("Điều 1. Vấn đề ủy quyền", { bold: true }),
    body("Bên A ủy quyền cho Bên B chỉ định luật sư để cung cấp dịch vụ pháp lý cho Bên A trong vụ án {{matter.causeText}}.", { indent: true }),
    blank(),
    body("Điều 2. Quyền ủy quyền", { bold: true }),
    body("Đại diện đặc biệt (bao gồm thừa nhận, từ bỏ, thay đổi yêu cầu kiện; hòa giải; khởi kiện counter hoặc phúc thẩm).", { indent: true }),
    blank(),
    body("Điều 3. Phí luật sư", { bold: true }),
    body("Số tiền phí: RMB ________ (viết bằng chữ: ________________).", { indent: true }),
    body("Phương thức thanh toán: Trả góp / Một lần / Phí rủi ro / Theo giờ.", { indent: true }),
    blank(),
    body("Điều 4. Thời gian thực hiện", { bold: true }),
    body("Từ ngày ký hợp đồng cho đến khi hoàn tất xử lý vấn đề ủy quyền (có văn bản pháp lý hiệu lực hoặc chấm dứt bằng văn bản từ cả hai bên).", { indent: true }),
    blank(),
    body("Điều 5. Điều khoản bảo mật", { bold: true }),
    body("Bên B có nghĩa vụ bảo mật tài liệu và thông tin vụ án do Bên A cung cấp.", { indent: true }),
    blank(),
    body("Điều 6. Giải quyết tranh chấp", { bold: true }),
    body("Nếu thương lượng không thành, đưa ra tòa án có thẩm quyền tại nơi Bên B đóng trụ sở.", { indent: true }),
    blank(),
    blank(),
    body("Bên A (đóng dấu):                                    Bên B (đóng dấu):"),
    blank(),
    body("Người đại diện pháp luật/người phụ trách: ________________             Luật sư phụ trách: {{lawyer.name}}"),
    blank(),
    body("Ngày ký: {{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// 模板 6: 授权委托书（个人）
// ============================================================
const T6_VARS = [
  "client.name",
  "client.idNumber",
  "matter.causeText",
  "opposing.name",
  "lawyer.name",
  "firm.name",
  "todayCN"
];

async function buildT6(): Promise<Buffer> {
  return pack([
    title("Giấy ủy quyền"),
    blank(),
    body("Người ủy quyền: {{client.name}}"),
    body("Số CMND/CCCD: {{client.idNumber}}"),
    blank(),
    body("Người nhận ủy quyền: {{lawyer.name}}, {{firm.name}} luật sư."),
    blank(),
    body("Tôi ủy quyền cho các người nhận ủy quyền trên để làm đại diện tố tụng của tôi trong vụ án {{matter.causeText}} giữa tôi và {{opposing.name}}.", { indent: true }),
    blank(),
    body("Quyền đại diện (vui lòng đánh dấu):", { bold: true }),
    body("☐ Đại diện thông thường."),
    body("☐ Đại diện đặc biệt. Bao gồm: thừa nhận, từ bỏ, thay đổi yêu cầu kiện; khởi kiện counter, phúc thẩm; xin thi hành án; hòa giải, điều trị; ký nhận văn bản pháp lý."),
    blank(),
    body("Thời hạn ủy quyền: Từ ngày ký cho đến khi kết thúc vấn đề ủy quyền vụ án."),
    blank(),
    blank(),
    body("Người ủy quyền (ký và đóng dấu): ________________"),
    blank(),
    body("Người nhận ủy quyền (ký): {{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// 模板 7: 民事起诉状
// ============================================================
const T7_VARS = [
  "client.name",
  "client.idNumber",
  "client.address",
  "client.phone",
  "opposing.name",
  "opposing.idNumber",
  "opposing.address",
  "matter.causeText",
  "matter.claimAmount",
  "proceeding.court",
  "lawyer.name",
  "todayCN"
];

async function buildT7(): Promise<Buffer> {
  return pack([
    title("Đơn kiện dân sự"),
    blank(),
    body("Nguyên đơn: {{client.name}}"),
    body("Số CMND/CCCD: {{client.idNumber}}"),
    body("Nơi cư trú: {{client.address}}"),
    body("Điện thoại: {{client.phone}}"),
    blank(),
    body("Bị đơn: {{opposing.name}}"),
    body("Số CMND/CCCD / Mã số thuế: {{opposing.idNumber}}"),
    body("Nơi cư trú: {{opposing.address}}"),
    blank(),
    body("Lý do vụ án: {{matter.causeText}}", { bold: true }),
    body("Giá trị yêu cầu: {{matter.claimAmount}}", { bold: true }),
    blank(),
    body("Yêu cầu tố tụng:", { bold: true }),
    body("1. ________________;", { indent: true }),
    body("2. ________________;", { indent: true }),
    body("3. Chi phí tố tụng, bảo tồn v.v. do bị đơn gánh chịu.", { indent: true }),
    blank(),
    body("Sự kiện và lý do:", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    body("________________________________________________________________________", { indent: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("Tóm lại, căn cứ theo Bộ luật Dân sự và Luật Tố tụng Dân sự Trung Quốc, yêu cầu tòa án xét xử theo pháp luật để bảo vệ quyền lợi hợp pháp của nguyên đơn.", { indent: true }),
    blank(),
    blank(),
    body("Kính gửi"),
    body("{{proceeding.court}}", { bold: true }),
    blank(),
    blank(),
    body("Người khởi kiện (ký): ________________"),
    body("                                                             Luật sư đại diện: {{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// 模板 8: 民事答辩状
// ============================================================
const T8_VARS = [
  "client.name",
  "client.idNumber",
  "client.address",
  "client.phone",
  "opposing.name",
  "opposing.address",
  "matter.causeText",
  "proceeding.court",
  "proceeding.caseNo",
  "lawyer.name",
  "todayCN"
];

async function buildT8(): Promise<Buffer> {
  return pack([
    title("Bản đáp lời dân sự"),
    blank(),
    body("Người đáp lời: {{client.name}}"),
    body("Số CMND/CCCD: {{client.idNumber}}"),
    body("Nơi cư trú: {{client.address}}"),
    body("Điện thoại: {{client.phone}}"),
    blank(),
    body("Người bị đáp lời: {{opposing.name}}"),
    body("Nơi cư trú: {{opposing.address}}"),
    blank(),
    body("Lý do vụ án: {{matter.causeText}}", { bold: true }),
    body("Số vụ án: {{proceeding.caseNo}}", { bold: true }),
    blank(),
    body("Đáp lại đơn kiện của người bị đáp lời, người đáp lời trả lời như sau:", { indent: true, bold: true }),
    blank(),
    body("1. Về yêu cầu tố tụng", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("2. Về phần sự kiện", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("3. Về áp dụng pháp luật", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("Tóm lại, yêu cầu tòa án bác bỏ yêu cầu tố tụng của người bị đáp lời để bảo vệ quyền lợi hợp pháp của người đáp lời.", { indent: true }),
    blank(),
    blank(),
    body("Kính gửi"),
    body("{{proceeding.court}}", { bold: true }),
    blank(),
    blank(),
    body("Người đáp lời (ký): ________________"),
    body("                                                             Luật sư đại diện: {{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// 模板 9: 卷宗封皮（v0.9.4 归档）
// ============================================================
const T9_VARS = [
  "firm.name",
  "matter.code",
  "matter.title",
  "matter.causeText",
  "matter.category",
  "client.name",
  "opposing.name",
  "lawyer.name",
  "archive.archiveNo",
  "archive.closedReasonCN",
  "archive.completedAtCN",
  "archive.archivedAtCN"
];

async function buildT9(): Promise<Buffer> {
  return pack([
    blank(),
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    blank(),
    blank(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240 },
      children: [
        new TextRun({ text: "HỒ SƠ", font: FONT_TITLE, size: 72, bold: true })
      ]
    }),
    blank(),
    blank(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({ text: "{{matter.title}}", font: FONT_TITLE, size: 36, bold: true })
      ]
    }),
    blank(),
    body("{{client.name}} kiện {{opposing.name}}", { align: AlignmentType.CENTER }),
    blank(),
    blank(),
    blank(),
    kvTable([
      ["Số lưu trữ", "{{archive.archiveNo}}"],
      ["Số vụ án", "{{matter.code}}"],
      ["Loại vụ án", "{{matter.category}}"],
      ["Lý do vụ án", "{{matter.causeText}}"],
      ["Cách thức kết thúc", "{{archive.closedReasonCN}}"],
      ["Ngày kết thúc", "{{archive.completedAtCN}}"],
      ["Ngày lưu trữ", "{{archive.archivedAtCN}}"],
      ["Luật sư phụ trách", "{{lawyer.name}}"]
    ]),
    blank(),
    blank(),
    body("Hồ sơ này được lưu trữ theo quy định của văn phòng từ ngày lưu trữ, không được mượn, sao chép hoặc chuyển giao mà không có sự cho phép.", { align: AlignmentType.CENTER })
  ]);
}

// ============================================================
// 模板 10: 卷宗目录（v0.9.4 归档）
// ============================================================
const T10_VARS = [
  "firm.name",
  "matter.code",
  "matter.title",
  "archive.archiveNo",
  "archive.archivedAtCN",
  "lawyer.name"
  // documents[] 通过运行时 inject，不在 detectMissing 范围
];

function docCatalogHeaderRow(): TableRow {
  const headers = ["STT", "Tên tài liệu", "Loại", "Ngày tải lên", "Số trang", "Ghi chú"];
  return new TableRow({
    tableHeader: true,
    children: headers.map((h, idx) => new TableCell({
      width: { size: [8, 38, 14, 16, 10, 14][idx], type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: h, font: FONT_BODY, size: 22, bold: true })]
        })
      ]
    }))
  });
}

function docCatalogLoopRow(): TableRow {
  // docxtemplater 在表格循环：单元格内分别用 {{#documents}}...{{/documents}} 包裹会失效；
  // 标准做法是把 loop 标签放在整行外层，行 cell 内只放纯 {{var}}。这里用注释占位行 + 文档生成时手工插入循环标签。
  // 为简化，直接 build 一行 placeholders，loop 包裹通过 docxtemplater 的 row loop 自动识别（同一行第一个 cell 含 {{#documents}}）。
  const cells: TableCell[] = [
    new TableCell({
      width: { size: 8, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "{{#documents}}{{seq}}", font: FONT_BODY, size: 22 })]
        })
      ]
    }),
    new TableCell({
      width: { size: 38, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({ children: [new TextRun({ text: "{{name}}", font: FONT_BODY, size: 22 })] })
      ]
    }),
    new TableCell({
      width: { size: 14, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "{{categoryCN}}", font: FONT_BODY, size: 22 })]
        })
      ]
    }),
    new TableCell({
      width: { size: 16, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "{{uploadDate}}", font: FONT_BODY, size: 22 })]
        })
      ]
    }),
    new TableCell({
      width: { size: 10, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "{{pages}}", font: FONT_BODY, size: 22 })]
        })
      ]
    }),
    new TableCell({
      width: { size: 14, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({ children: [new TextRun({ text: "{{remark}}{{/documents}}", font: FONT_BODY, size: 22 })] })
      ]
    })
  ];
  return new TableRow({ children: cells });
}

async function buildT10(): Promise<Buffer> {
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" }
    },
    rows: [docCatalogHeaderRow(), docCatalogLoopRow()]
  });

  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("MỤC LỤC HỒ SƠ"),
    body("Số lưu trữ: {{archive.archiveNo}}     Số vụ án: {{matter.code}}", { align: AlignmentType.RIGHT }),
    body("Vụ án: {{matter.title}}", { align: AlignmentType.RIGHT }),
    blank(),
    table,
    blank(),
    body("Luật sư phụ trách: {{lawyer.name}}", { align: AlignmentType.RIGHT }),
    body("Ngày lưu trữ: {{archive.archivedAtCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// 注册表
// ============================================================
export const BUILTIN_TEMPLATES: BuiltInTemplate[] = [
  {
    key: "civil_intake_registration",
    name: "民事案件收案登记表",
    category: "INTAKE",
    description: "民事案件收案信息登记，用于律所收案立卷。字段自动从案件信息抓取。",
    applicableCategories: ["CIVIL_COMMERCIAL"],
    variables: T1_VARS,
    buildBuffer: buildT1
  },
  {
    key: "criminal_intake_registration",
    name: "刑事案件收案登记表",
    category: "INTAKE",
    description: "刑事案件收案信息登记。被告人羁押地点等关键字段。",
    applicableCategories: ["CRIMINAL"],
    variables: T2_VARS,
    buildBuffer: buildT2
  },
  {
    key: "legal_service_risk_notice",
    name: "法律服务风险告知书",
    category: "INTAKE",
    description: "向委托人告知法律服务的不确定性与各类风险。律师与委托人签字。",
    applicableCategories: [],
    variables: T3_VARS,
    buildBuffer: buildT3
  },
  {
    key: "retainer_individual",
    name: "委托代理合同(个人)",
    category: "RETAINER",
    description: "自然人委托代理合同标准模板，含代理权限/律师费/争议解决条款。",
    applicableCategories: [],
    variables: T4_VARS,
    buildBuffer: buildT4
  },
  {
    key: "retainer_organization",
    name: "委托代理合同(单位)",
    category: "RETAINER",
    description: "法人或非法人组织委托代理合同标准模板。",
    applicableCategories: [],
    variables: T5_VARS,
    buildBuffer: buildT5
  },
  {
    key: "power_of_attorney_individual",
    name: "授权委托书(个人)",
    category: "RETAINER",
    description: "自然人授权委托书，含一般代理 / 特别代理勾选。",
    applicableCategories: [],
    variables: T6_VARS,
    buildBuffer: buildT6
  },
  {
    key: "civil_complaint",
    name: "民事起诉状",
    category: "LITIGATION",
    description: "民事起诉状标准格式。诉讼请求与事实理由需律师填充。",
    applicableCategories: ["CIVIL_COMMERCIAL"],
    variables: T7_VARS,
    buildBuffer: buildT7
  },
  {
    key: "civil_answer",
    name: "民事答辩状",
    category: "LITIGATION",
    description: "民事答辩状标准格式。答辩内容需律师填充。",
    applicableCategories: ["CIVIL_COMMERCIAL"],
    variables: T8_VARS,
    buildBuffer: buildT8
  },
  {
    key: "archive_cover",
    name: "卷宗封皮",
    category: "ARCHIVE",
    description: "归档时自动生成。律所标识 + 案件标题 + 归档编号 + 结案信息。律师勿手动渲染。",
    applicableCategories: [],
    variables: T9_VARS,
    buildBuffer: buildT9
  },
  {
    key: "archive_catalog",
    name: "卷宗目录",
    category: "ARCHIVE",
    description: "归档时自动生成。列出本案全部材料（按上传时间排序）。律师勿手动渲染。",
    applicableCategories: [],
    variables: T10_VARS,
    buildBuffer: buildT10
  }
];
