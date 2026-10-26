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
import { isManager } from "@/lib/permissions";
import { audit } from "@/server/audit";
import { collectBackupData } from "@/server/data-backup/collect";
import {
  buildBackupFilename,
  buildBackupMeta,
  isBackupScope,
  type BackupScope
} from "@/server/data-backup/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBackupScope(req: Request): BackupScope | null {
  const raw = new URL(req.url).searchParams.get("scope") ?? "all";
  return isBackupScope(raw) ? raw : null;
}

async function renderBackupResponse(scope: BackupScope, userId: string): Promise<Response> {
  const now = new Date();
  const { sections, counts } = await collectBackupData(scope);
  const meta = buildBackupMeta(scope, counts, now);
  await audit({
    userId,
    action: "DATA_BACKUP_EXPORT",
    targetType: "Backup",
    targetId: scope,
    detail: { scope, recordCount: meta.recordCount, modelCount: meta.modelCount }
  });
  const body = JSON.stringify({ meta, data: sections }, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(buildBackupFilename(scope, now))}`
    }
  });
}

/** GET /api/data-backup/export?scope=all|genealogy|erp — tải bản sao lưu JSON (chỉ ADMIN/PRINCIPAL_LAWYER). */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isManager(session.user.role)) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }
  const scope = readBackupScope(req);
  if (!scope) {
    return NextResponse.json({ error: "Phạm vi sao lưu không hợp lệ" }, { status: 400 });
  }
  return renderBackupResponse(scope, session.user.id);
}
