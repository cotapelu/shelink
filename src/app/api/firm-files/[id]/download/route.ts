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
import { storage } from "@/lib/storage";
import { ensureExt } from "@/lib/storage/mime-ext";
import { audit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const f = await prisma.firmFile.findUnique({
    where: { id: params.id, archivedAt: null }
  });
  if (!f) return NextResponse.json({ error: "资料不存在" }, { status: 404 });

  let buf: Buffer;
  try {
    buf = await storage.readFile(f.path);
  } catch (err) {
    console.error("[firm-files/download] 读取失败：", err);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }

  const inline = new URL(req.url).searchParams.get("inline") === "1";

  await audit({
    userId: session.user.id,
    action: inline ? "FIRM_FILE_PREVIEW" : "FIRM_FILE_DOWNLOAD",
    targetType: "FirmFile",
    targetId: f.id,
    detail: { name: f.name }
  });

  const filename = ensureExt(f.name, f.mimeType);
  const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new NextResponse(arr, {
    status: 200,
    headers: {
      "Content-Type": f.mimeType ?? "application/octet-stream",
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      // 允许在 iframe 内预览
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=60"
    }
  });
}
