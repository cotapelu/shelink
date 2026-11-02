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
import { normalizeUploadedFilename } from "@/lib/filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // Khi ?inline=1 thì trả về dạng inline, trình duyệt xem trước trong tab mới (PDF/ảnh/văn bản), không thì tải xuống
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const doc = await prisma.document.findFirst({
    where: { id: params.id, deletedAt: null }
  });
  if (!doc) return NextResponse.json({ error: "Tài liệu không tồn tại" }, { status: 404 });

  // Kiểm tra quyền: ADMIN / PRINCIPAL_LAWYER đọc được tất cả; vai trò khác —— thành viên vụ án mới đọc được tài liệu vụ án;
  // Hợp đồng tiếp nhận chỉ có intakeId thì giới hạn người tạo/chủ trì/cộng tác tiếp nhận (chứa số giấy tờ khách các quyền riêng tư, không mở cho toàn văn phòng nữa)
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    if (doc.matterId) {
      const member = await prisma.matterMember.findUnique({
        where: { matterId_userId: { matterId: doc.matterId, userId: session.user.id } }
      });
      if (!member) {
        return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
      }
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
      if (!allowed) {
        return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
      }
    }
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
    console.error("[download] Đọc thất bại:", err);
    return NextResponse.json({ error: "Đọc thất bại" }, { status: 500 });
  }

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_DOWNLOAD",
    targetType: "Document",
    targetId: doc.id,
    detail: { matterId: doc.matterId, intakeId: doc.intakeId, name: doc.name }
  });

  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const filename = normalizeUploadedFilename(doc.name);

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}
