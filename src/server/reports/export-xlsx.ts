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
 * v0.20: 律所报表 xlsx 导出
 *
 * 3 个 sheet：案件清单（本期新收）/ 收款明细（本期 RECEIVED）/ 律师产出（本期聚合）
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

  const sheetMatters = wb.addWorksheet("案件清单");
  sheetMatters.columns = [
    { header: "案件编号", key: "code", width: 14 },
    { header: "标题", key: "title", width: 36 },
    { header: "类别", key: "category", width: 8 },
    { header: "案由", key: "cause", width: 18 },
    { header: "客户", key: "client", width: 18 },
    { header: "主办律师", key: "owner", width: 10 },
    { header: "状态", key: "status", width: 10 },
    { header: "收案日期", key: "createdAt", width: 12 },
    { header: "结案日期", key: "closedAt", width: 12 },
    { header: "归档日期", key: "archivedAt", width: 12 }
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

  // Sheet 2: 收款明细
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
  const sheetFees = wb.addWorksheet("收款明细");
  sheetFees.columns = [
    { header: "收款日期", key: "occurredAt", width: 12 },
    { header: "金额", key: "amount", width: 14 },
    { header: "客户", key: "client", width: 18 },
    { header: "案件编号", key: "matterCode", width: 14 },
    { header: "案件标题", key: "matterTitle", width: 36 },
    { header: "主办律师", key: "owner", width: 10 },
    { header: "付款方", key: "payer", width: 18 },
    { header: "发票号", key: "invoiceNo", width: 18 },
    { header: "收款方式", key: "method", width: 12 }
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

  // Sheet 3: 律师产出（来自 getReportData 已聚合的数据，避免重算）
  const data = await getReportData(period);
  const sheetLawyer = wb.addWorksheet("律师产出");
  sheetLawyer.columns = [
    { header: "律师", key: "name", width: 12 },
    { header: "本期新收", key: "owned", width: 12 },
    { header: "本期已结", key: "closed", width: 12 },
    { header: "本期收款金额", key: "received", width: 18 }
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

  // Sheet 4: 客户应收（顺手补一份，律师常用）
  const sheetClient = wb.addWorksheet("客户应收");
  sheetClient.columns = [
    { header: "客户", key: "name", width: 24 },
    { header: "应收金额", key: "receivable", width: 14 },
    { header: "已收金额", key: "received", width: 14 },
    { header: "应收余额", key: "balance", width: 14 }
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
