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
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";
import { storage } from "@/lib/storage";
import { decryptBuffer } from "@/lib/storage/crypto";
import { officePreviewKind } from "@/lib/storage/mime-ext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * v0.42: xem trước trực tuyến tài liệu vụ án.
 * - docx → mammoth chuyển HTML
 * - xlsx/xls → exceljs đọc ô chuyển bảng HTML
 * Trả về tài liệu HTML đầy đủ, frontend nhúng bằng <iframe>.
 * pdf/ảnh/văn bản trình duyệt xem trước được một cách gốc thì đi qua download?inline=1 (route này không xử lý).
 */
function htmlShell(title: string, body: string): string {
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 24px 28px; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; color: #1a1a1a; line-height: 1.7; background: #fff; }
  .doc { max-width: 820px; margin: 0 auto; }
  .doc img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 13px; }
  td, th { border: 1px solid #d4d4d4; padding: 4px 8px; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  .sheet-name { margin: 18px 0 6px; font-weight: 600; font-size: 14px; color: #444; }
  p { margin: 0.4em 0; }
</style></head>
<body><div class="doc">${body}</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const doc = await prisma.document.findFirst({
    where: { id: params.id, deletedAt: null }
  });
  if (!doc) return NextResponse.json({ error: "Tài liệu không tồn tại" }, { status: 404 });

  // Quyền: giống route download (ADMIN/luật sư chính xem hết; thành viên vụ án xem vụ mình; hợp đồng tiếp nhận giới hạn người liên quan)
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    if (doc.matterId) {
      const member = await prisma.matterMember.findUnique({
        where: { matterId_userId: { matterId: doc.matterId, userId: session.user.id } }
      });
      if (!member) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    } else if (doc.intakeId) {
      const intake = await prisma.intake.findUnique({
        where: { id: doc.intakeId },
        select: { createdById: true, ownerUserId: true, coUserIds: true }
      });
      const uid = session.user.id;
      const allowed =
        !!intake &&
        (intake.createdById === uid ||
          intake.ownerUserId === uid ||
          intake.coUserIds.includes(uid));
      if (!allowed) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }
  }

  const kind = officePreviewKind(doc.mimeType, doc.name);
  if (!kind) {
    return NextResponse.json(
      { error: "Loại này không hỗ trợ xem trước trực tuyến, hãy tải về xem" },
      { status: 415 }
    );
  }

  let buf: Buffer;
  try {
    const stored = await storage.readFile(doc.path);
    if (doc.encrypted) {
      if (!doc.iv || !doc.authTag) {
        return NextResponse.json({ error: "Siêu dữ liệu mã hoá bị hỏng" }, { status: 500 });
      }
      buf = decryptBuffer(stored, doc.iv, doc.authTag);
    } else {
      buf = stored;
    }
  } catch (err) {
    console.error("[preview] Đọc thất bại:", err);
    return NextResponse.json({ error: "Đọc thất bại" }, { status: 500 });
  }

  let html: string;
  try {
    if (kind === "docx") {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.convertToHtml({ buffer: buf });
      html = htmlShell(doc.name, result.value || "<p>(Tài liệu rỗng)</p>");
    } else {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf as unknown as ArrayBuffer);
      const parts: string[] = [];
      wb.eachSheet((ws) => {
        parts.push(`<div class="sheet-name">${escapeHtml(ws.name)}</div>`);
        const rows: string[] = [];
        ws.eachRow({ includeEmpty: false }, (row) => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            const v = cell.value;
            let text = "";
            if (v == null) text = "";
            else if (typeof v === "object" && "text" in (v as object))
              text = String((v as { text: unknown }).text ?? "");
            else if (typeof v === "object" && "result" in (v as object))
              text = String((v as { result: unknown }).result ?? "");
            else text = String(v);
            cells.push(`<td>${escapeHtml(text)}</td>`);
          });
          rows.push(`<tr>${cells.join("")}</tr>`);
        });
        parts.push(`<table>${rows.join("")}</table>`);
      });
      html = htmlShell(doc.name, parts.join("") || "<p>(Bảng rỗng)</p>");
    }
  } catch (err) {
    console.error("[preview] Chuyển đổi thất bại:", err);
    return NextResponse.json({ error: "Chuyển đổi tài liệu thất bại, hãy tải về xem" }, { status: 500 });
  }

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_PREVIEW",
    targetType: "Document",
    targetId: doc.id,
    detail: { matterId: doc.matterId, name: doc.name, kind }
  });

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
