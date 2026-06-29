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
import { buildMatterImportTemplate } from "@/server/imports/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  let buf: Buffer;
  try {
    buf = await buildMatterImportTemplate();
  } catch (err) {
    console.error("[imports/template] 生成失败：", err);
    return NextResponse.json({ error: "模板生成失败" }, { status: 500 });
  }

  const filename = "lawlink-案件导入模板.xlsx";
  const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new NextResponse(arr, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}
