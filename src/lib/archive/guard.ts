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
 * Cửa chỉ đọc lưu trữ
 *
 * Chiến lược (user chọn "trung"):
 *   - Sau khi matter.status === "ARCHIVED": cấm mọi ghi
 *   - Ngoại lệ: upload vào ARCHIVE folder được phép
 *
 * Cách gọi (mỗi server action ghi):
 *   await assertMatterWritable(matterId);
 *
 * Upload tài liệu / xóa cần isArchiveFolder() để cho phép ARCHIVE.
 */
import { requireSession } from "@/lib/auth/session";
import { matterAssociationFilter } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type WritableGuardOptions = {
  allowedIfArchivedReason?: string;
  allowFinanceRole?: boolean;
};

async function findWritableMatter(
  matterId: string,
  opts?: Pick<WritableGuardOptions, "allowFinanceRole">
) {
  const session = await requireSession();
  const allowByFinanceRole = opts?.allowFinanceRole && session.user.role === "FINANCE";
  return prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...(allowByFinanceRole ? {} : matterAssociationFilter(session.user.id))
    },
    select: { status: true, archivedAt: true }
  });
}

/**
 * Vụ án đã lưu trữ coi là chỉ đọc. Ném lỗi (tiếng Việt) để UI catch hiện toast.
 */
export async function assertMatterWritable(
  matterId: string | null | undefined,
  opts?: WritableGuardOptions
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("Vụ án không tồn tại hoặc không có quyền xử lý");
  if (matter.status === "ARCHIVED") {
    const detail = opts?.allowedIfArchivedReason
      ? `（ngoại lệ: ${opts.allowedIfArchivedReason}）`
      : "";
    throw new Error(`Vụ án đã lưu trữ, cấm sửa đổi${detail}`);
  }
}

/**
 * Kiểm tra folder có phải ARCHIVE (lưu trữ/đóng) không, dùng để cho phép upload.
 * Điều kiện: name khớp một trong ["Lưu trữ", "Đóng"] (như default-folders.ts).
 */
const ARCHIVE_FOLDER_NAMES = new Set(["Lưu trữ", "Đóng"]);

export function isArchiveFolderName(name: string | null | undefined): boolean {
  if (!name) return false;
  return ARCHIVE_FOLDER_NAMES.has(name);
}

/**
 * Cổng thao tác tài liệu: sau khi lưu trữ chỉ được tải lên hồ sơ ARCHIVE. Cấm mọi xoá/đổi tên/di chuyển.
 */
export async function assertDocumentWritable(
  matterId: string | null | undefined,
  opts: { kind: "upload" | "modify"; folderName?: string | null; allowFinanceRole?: boolean }
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("Vụ án không tồn tại hoặc không có quyền xử lý");
  if (matter.status !== "ARCHIVED") return;

  if (opts.kind === "modify") {
    throw new Error("Vụ án đã lưu trữ, không được sửa hoặc xoá tài liệu");
  }
  if (opts.kind === "upload" && !isArchiveFolderName(opts.folderName)) {
    throw new Error("Vụ án đã lưu trữ, chỉ được bổ sung tài liệu vào hồ sơ \"Kết thúc\" hoặc \"Lưu trữ\"");
  }
}
