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
 * v0.20: Xuất báo cáo xlsx cho律所
 *
 * 3 sheet: Danh sách vụ án (Nhận mới kỳ này) / Chi tiết thu (RECEIVED kỳ này) / Sản lượng luật sư (Tập hợp kỳ này)
 */
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { matterCategoryLabel, matterStatusLabel } from "@/lib/enums";
import type { ReportPeriod } from "./queries";
import { getReportData } from "./queries";

export async function buildReportWorkbook(period: ReportPeriod): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LawLink";
  wb.created = new Date();

  // Sheet 1: 案件清单（本期新收）
  const matters = await prisma.matter.findMany({
    where: {
      createdAt: { gte: period.start, lt: period.end },
      deletedAt: null
    },
    select: {
      internalCode: true,
      title: true,
      category: true,
      status: true,
      createdAt: true,
      closedAt: true,
      archivedAt: true,
      owner: { select: { name: true } },
      primaryClient: { select: { name: true } },
      cause: { select: { name: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  const sheetMatters = wb.addWorksheet("Danh sách vụ án");
  sheetMatters.columns = [
    { header: "Mã vụ án", key: "code", width: 14 },
    { header: "Tiêu đề", key: "title", width: 36 },
    { header: "Loại", key: "category", width: 8 },
    { header: "Nguyên cáo", key: "cause", width: 18 },
    { header: "Khách hàng", key: "client", width: 18 },
    { header: "Luật sư phụ trách", key: "owner", width: 10 },
    { header: "Trạng thái", key: "status", width: 10 },
    { header: "Ngày nhận", key: "createdAt", width: 12 },
    { header: "Ngày kết thúc", key: "closedAt", width: 12 },
    { header: "Ngày lưu trữ", key: "archivedAt", width: 12 }
  ];
  for (const m of matters) {
    sheetMatters.addRow({
      code: m.internalCode,
      title: m.title,
      category: matterCategoryLabel[m.category],
      cause: m.cause?.name ?? "",
      client: m.primaryClient?.name ?? "",
      owner: m.owner?.name ?? "",
      status: matterStatusLabel[m.status],
      createdAt: m.createdAt.toISOString().slice(0, 10),
      closedAt: m.closedAt ? m.closedAt.toISOString().slice(0, 10) : "",
      archivedAt: m.archivedAt ? m.archivedAt.toISOString().slice(0, 10) : ""
    });
  }
  sheetMatters.getRow(1).font = { bold: true };

  // Sheet 2: Chi tiết thu
  const receivedFees = await prisma.feeEntry.findMany({
    where: {
      type: "RECEIVED",
      occurredAt: { gte: period.start, lt: period.end }
    },
    select: {
      occurredAt: true,
      amount: true,
      payerOrPayee: true,
      invoiceNo: true,
      method: true,
      matter: {
        select: {
          internalCode: true,
          title: true,
          primaryClient: { select: { name: true } },
          owner: { select: { name: true } }
        }
      }
    },
    orderBy: { occurredAt: "asc" }
  });
  const sheetFees = wb.addWorksheet("Chi tiết thu");
  sheetFees.columns = [
    { header: "Ngày thu", key: "occurredAt", width: 12 },
    { header: "Số tiền", key: "amount", width: 14 },
    { header: "Khách hàng", key: "client", width: 18 },
    { header: "Mã vụ án", key: "matterCode", width: 14 },
    { header: "Tiêu đề vụ án", key: "matterTitle", width: 36 },
    { header: "Luật sư phụ trách", key: "owner", width: 10 },
    { header: "Bên trả", key: "payer", width: 18 },
    { header: "Số hóa đơn", key: "invoiceNo", width: 18 },
    { header: "Hình thức thu", key: "method", width: 12 }
  ];
  for (const f of receivedFees) {
    sheetFees.addRow({
      occurredAt: f.occurredAt.toISOString().slice(0, 10),
      amount: Number(f.amount),
      client: f.matter?.primaryClient?.name ?? "",
      matterCode: f.matter?.internalCode ?? "",
      matterTitle: f.matter?.title ?? "",
      owner: f.matter?.owner?.name ?? "",
      payer: f.payerOrPayee ?? "",
      invoiceNo: f.invoiceNo ?? "",
      method: f.method ?? ""
    });
  }
  sheetFees.getRow(1).font = { bold: true };
  sheetFees.getColumn("amount").numFmt = "#,##0.00";

  // Sheet 3: Sản lượng luật sư (dữ liệu đã tổng hợp từ getReportData, tránh tính lại)
  const data = await getReportData(period);
  const sheetLawyer = wb.addWorksheet("Sản lượng luật sư");
  sheetLawyer.columns = [
    { header: "Luật sư", key: "name", width: 12 },
    { header: "Nhận mới kỳ này", key: "owned", width: 12 },
    { header: "Đã kết thúc kỳ này", key: "closed", width: 12 },
    { header: "Số thu kỳ này", key: "received", width: 18 }
  ];
  for (const row of data.byLawyer) {
    sheetLawyer.addRow({
      name: row.name,
      owned: row.ownedCount,
      closed: row.closedCount,
      received: row.receivedAmount
    });
  }
  sheetLawyer.getRow(1).font = { bold: true };
  sheetLawyer.getColumn("received").numFmt = "#,##0.00";

  // Sheet 4: Công nợ khách hàng (bổ sung thêm, luật sư thường dùng)
  const sheetClient = wb.addWorksheet("Công nợ khách hàng");
  sheetClient.columns = [
    { header: "Khách hàng", key: "name", width: 24 },
    { header: "Có thu", key: "receivable", width: 14 },
    { header: "Đã thu", key: "received", width: 14 },
    { header: "Còn thiếu", key: "balance", width: 14 }
  ];
  for (const row of data.byClientReceivable) {
    sheetClient.addRow({
      name: row.name,
      receivable: row.receivable,
      received: row.received,
      balance: row.balance
    });
  }
  sheetClient.getRow(1).font = { bold: true };
  ["receivable", "received", "balance"].forEach((k) => {
    sheetClient.getColumn(k).numFmt = "#,##0.00";
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
