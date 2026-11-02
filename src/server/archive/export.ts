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
 * v0.9.4 Xuất ZIP lưu trữ
 *
 * Cấu trúc:
 *   {archiveNo}/
 *     README.md                 — Mô tả lưu trữ + chỉ mục cấu trúc
 *     manifest.json             — Dữ liệu toàn bộ có cấu trúc (matter + parties + procedures + ...)
 *     Bìa và mục lục/
 *       Bìa hồ sơ.docx
 *       Mục lục hồ sơ.docx
 *     Tư liệu/
 *       {category}/
 *         {N}_{tên tệp gốc}
 */
import PizZip from "pizzip";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { decryptBuffer, sha256 } from "@/lib/storage/crypto";

interface ZipResult {
  buffer: Buffer;
  fileName: string;
  checksum: string;
  size: number;
}

const CATEGORY_DIR: Record<string, string> = {
  EVIDENCE: "Tài liệu chứng cứ",
  PLEADING: "Văn bản tố tụng",
  PROCEDURE: "Tài liệu thủ tục",
  JUDGMENT: "Văn bản quyết định",
  CONTRACT: "Hợp đồng",
  OTHER: "Khác"
};

function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "_").trim();
}

async function readDocumentBuffer(doc: {
  path: string;
  encrypted: boolean;
  iv: string | null;
  authTag: string | null;
}): Promise<Buffer> {
  const raw = await storage.readFile(doc.path);
  if (!doc.encrypted) return raw;
  if (!doc.iv || !doc.authTag) throw new Error("Siêu dữ liệu mã hoá bị hỏng");
  return decryptBuffer(raw, doc.iv, doc.authTag);
}

export async function buildArchiveZip(matterId: string): Promise<ZipResult> {
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    include: {
      primaryClient: true,
      cause: { select: { name: true, code: true } },
      parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
      procedures: { orderBy: { order: "asc" } },
      timelineEvents: { orderBy: { occurredAt: "asc" } },
      preservations: { orderBy: { startDate: "asc" } },
      notes: { where: { deletedAt: null }, orderBy: { occurredAt: "asc" } },
      billings: true,
      feeEntries: { orderBy: { occurredAt: "asc" } },
      archiveRecords: { orderBy: { archivedAt: "desc" }, take: 1 },
      owner: { select: { id: true, name: true } }
    }
  });
  if (!matter) throw new Error("Vụ án không tồn tại");
  if (matter.archiveRecords.length === 0) throw new Error("Vụ án chưa lưu trữ, không thể xuất");

  const archive = matter.archiveRecords[0];
  const docs = await prisma.document.findMany({
    where: { matterId, deletedAt: null },
    select: {
      id: true,
      name: true,
      category: true,
      path: true,
      encrypted: true,
      iv: true,
      authTag: true,
      mimeType: true,
      size: true,
      createdAt: true,
      tags: true
    },
    orderBy: { createdAt: "asc" }
  });

  const zip = new PizZip();
  const root = safeName(archive.archiveNo);

  // ===== manifest.json: snapshot dữ liệu có cấu trúc (che: mật khẩu, apiKey, authTag... không xuất)
  const manifest = {
    archiveNo: archive.archiveNo,
    archivedAt: archive.archivedAt.toISOString(),
    archivedBy: archive.archivedBy,
    closedReason: archive.closedReason,
    completedAt: archive.completedAt?.toISOString() ?? null,
    summary: archive.summary,
    judgmentSummary: archive.judgmentSummary,
    checklist: archive.checklistJson,
    missingItems: archive.missingItems,
    matter: {
      id: matter.id,
      internalCode: matter.internalCode,
      title: matter.title,
      category: matter.category,
      status: matter.status,
      cause: matter.cause,
      causeFreeText: matter.causeFreeText,
      claimAmount: matter.claimAmount?.toString() ?? null,
      ourStanding: matter.ourStanding,
      intakeDate: matter.intakeDate?.toISOString() ?? null,
      firstAcceptedAt: matter.firstAcceptedAt?.toISOString() ?? null,
      closedAt: matter.closedAt?.toISOString() ?? null,
      archivedAt: matter.archivedAt?.toISOString() ?? null,
      owner: matter.owner,
      primaryClient: matter.primaryClient
        ? {
            id: matter.primaryClient.id,
            name: matter.primaryClient.name,
            type: matter.primaryClient.type,
            idNumber: matter.primaryClient.idNumber,
            phone: matter.primaryClient.phone,
            email: matter.primaryClient.email,
            address: matter.primaryClient.address
          }
        : null
    },
    parties: matter.parties.map((p) => ({
      role: p.role,
      standing: p.standing,
      ordinal: p.ordinal,
      name: p.name,
      idNumber: p.idNumber,
      phone: p.phone,
      address: p.address,
      legalRep: p.legalRep,
      notes: p.notes
    })),
    procedures: matter.procedures.map((p) => ({
      order: p.order,
      type: p.type,
      customLabel: p.customLabel,
      engagement: p.engagement,
      caseNumber: p.caseNumber,
      handlingAgency: p.handlingAgency,
      panel: p.panel,
      handler: p.handler,
      acceptedAt: p.acceptedAt?.toISOString() ?? null,
      status: p.status,
      outcome: p.outcome,
      concludedAt: p.concludedAt?.toISOString() ?? null
    })),
    timelineEvents: matter.timelineEvents.map((e) => ({
      occurredAt: e.occurredAt.toISOString(),
      eventType: e.eventType,
      title: e.title,
      content: e.content,
      refType: e.refType,
      refId: e.refId
    })),
    preservations: matter.preservations.map((p) => ({
      type: p.type,
      propertyType: p.propertyType,
      amount: p.amount?.toString() ?? null,
      respondent: p.respondent,
      court: p.court,
      rulingNumber: p.rulingNumber,
      startDate: p.startDate.toISOString(),
      expiryDate: p.expiryDate.toISOString(),
      status: p.status,
      note: p.note
    })),
    notes: matter.notes.map((n) => ({
      channel: n.channel,
      withWhom: n.withWhom,
      occurredAt: n.occurredAt.toISOString(),
      content: n.content,
      tags: n.tags
    })),
    billings: matter.billings.map((b) => ({
      title: b.title,
      contractAmount: b.contractAmount.toString(),
      status: b.status,
      signedAt: b.signedAt?.toISOString() ?? null
    })),
    feeEntries: matter.feeEntries.map((f) => ({
      type: f.type,
      amount: f.amount.toString(),
      occurredAt: f.occurredAt.toISOString(),
      invoiceNo: f.invoiceNo,
      payerOrPayee: f.payerOrPayee,
      method: f.method,
      note: f.note
    })),
    documents: docs.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      size: d.size,
      createdAt: d.createdAt.toISOString(),
      tags: d.tags
    }))
  };
  zip.file(`${root}/manifest.json`, JSON.stringify(manifest, null, 2));

  // ===== README.md
  const md = [
    `# ${matter.title}`,
    "",
    `Mã lưu trữ: **${archive.archiveNo}**  `,
    `Mã vụ án: ${matter.internalCode}  `,
    `Ngày lưu trữ: ${archive.archivedAt.toISOString().slice(0, 10)}  `,
    `Người lưu trữ: ${archive.archivedBy}  `,
    archive.completedAt ? `Ngày kết thúc: ${archive.completedAt.toISOString().slice(0, 10)}` : "",
    "",
    "## Tóm tắt kết thúc",
    "",
    archive.summary,
    "",
    archive.judgmentSummary ? "## Kết quả xét xử\n\n" + archive.judgmentSummary + "\n" : "",
    "## Mục lục",
    "",
    "- `manifest.json` — Dữ liệu có cấu trúc toàn bộ vụ án (định dạng JSON)",
    "- `Bìa và mục lục/` — Bìa hồ sơ và Mục lục hồ sơ sinh tự động",
    "- `Tư liệu/` — Toàn bộ tài liệu đã tải lên, xếp theo loại",
    "",
    archive.missingItems.length > 0
      ? `⚠️ Còn thiếu khi lưu trữ: ${archive.missingItems.length} mục (xem manifest.json)`
      : ""
  ]
    .filter(Boolean)
    .join("\n");
  zip.file(`${root}/README.md`, md);

  // ===== Bìa và mục lục
  if (archive.coverDocId) {
    const cover = docs.find((d) => d.id === archive.coverDocId);
    if (cover) {
      const buf = await readDocumentBuffer(cover);
      zip.file(`${root}/Bìa và mục lục/Bìa hồ sơ.docx`, buf);
    }
  }
  if (archive.catalogDocId) {
    const catalog = docs.find((d) => d.id === archive.catalogDocId);
    if (catalog) {
      const buf = await readDocumentBuffer(catalog);
      zip.file(`${root}/Bìa và mục lục/Mục lục hồ sơ.docx`, buf);
    }
  }

  // ===== Tư liệu: bỏ qua hai tệp đã nằm trong "Bìa và mục lục"
  const skipIds = new Set(
    [archive.coverDocId, archive.catalogDocId].filter((x): x is string => !!x)
  );
  const seqByCategory: Record<string, number> = {};
  for (const d of docs) {
    if (skipIds.has(d.id)) continue;
    const dir = CATEGORY_DIR[d.category] ?? "Khác";
    const n = (seqByCategory[dir] ?? 0) + 1;
    seqByCategory[dir] = n;
    try {
      const buf = await readDocumentBuffer(d);
      const seq = String(n).padStart(3, "0");
      zip.file(`${root}/Tư liệu/${dir}/${seq}_${safeName(d.name)}`, buf);
    } catch (err) {
      console.error(`[archive-export] Đọc tư liệu thất bại: ${d.id}`, err);
      // Một tệp lỗi không chặn toàn bộ; ghi một dòng chú thích
      zip.file(
        `${root}/Tư liệu/${dir}/_loi_doc_${safeName(d.name)}.txt`,
        `Tệp này đọc thất bại: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const buffer = zip.generate({ type: "nodebuffer" }) as Buffer;
  return {
    buffer,
    fileName: `${root}.zip`,
    checksum: sha256(buffer),
    size: buffer.length
  };
}
