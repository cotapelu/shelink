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
import { buildArchiveZip } from "@/server/archive/export";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { matterId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Quyền: ADMIN / PRINCIPAL_LAWYER hoặc thành viên vụ án
  const matter = await prisma.matter.findUnique({
    where: { id: params.matterId },
    select: { id: true, status: true, internalCode: true }
  });
  if (!matter) return NextResponse.json({ error: "Vụ án không tồn tại" }, { status: 404 });
  if (matter.status !== "ARCHIVED") {
    return NextResponse.json({ error: "Vụ án chưa lưu trữ" }, { status: 400 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    const member = await prisma.matterMember.findUnique({
      where: { matterId_userId: { matterId: matter.id, userId: session.user.id } }
    });
    if (!member) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }
  }

  let result;
  try {
    result = await buildArchiveZip(params.matterId);
  } catch (err) {
    console.error("[archive export] Dựng thất bại:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xuất thất bại" },
      { status: 500 }
    );
  }

  // Đường dẫn lưu bền + checksum ghi lại vào ArchiveRecord mới nhất
  try {
    const storagePath = await storage.writeFile(`archive_${matter.id}`, result.buffer);
    await prisma.archiveRecord.updateMany({
      where: { matterId: matter.id },
      data: { exportPath: storagePath, checksum: result.checksum }
    });
  } catch (err) {
    console.error("[archive export] Ghi đĩa thất bại (không chặn tải xuống):", err);
  }

  await audit({
    userId: session.user.id,
    action: "ARCHIVE_EXPORT",
    targetType: "Matter",
    targetId: matter.id,
    detail: { size: result.size, checksum: result.checksum }
  });

  const ab = result.buffer.buffer.slice(
    result.buffer.byteOffset,
    result.buffer.byteOffset + result.buffer.byteLength
  ) as ArrayBuffer;

  return new NextResponse(ab, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(result.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`
    }
  });
}
