/*
 * Logic thuần cho FoldersPanel — tách khỏi component để test được (R-refactor AUTO-55).
 * Hành vi GIỐNG HỆT code cũ nhúng trong component.
 */

import type { FolderDocument, FolderPayload } from "./folder-types";

/** Nhóm tài liệu theo folder. Key `null` = 散件 (không thuộc folder nào). */
export function groupDocumentsByFolder(
  folders: FolderPayload[],
  documents: FolderDocument[]
): { byFolderId: Map<string | null, FolderDocument[]>; loose: FolderDocument[] } {
  const byFolderId = new Map<string | null, FolderDocument[]>();
  byFolderId.set(null, []);
  for (const f of folders) byFolderId.set(f.id, []);
  for (const d of documents) {
    const key = d.folderId ?? null;
    const bucket = byFolderId.get(key);
    if (bucket) bucket.push(d);
    else byFolderId.set(key, [d]);
  }
  return { byFolderId, loose: byFolderId.get(null) ?? [] };
}

/** Tài liệu đang hiển thị: theo folder đang chọn, hoặc 散件 khi chọn null. */
export function documentsForActive(
  byFolderId: Map<string | null, FolderDocument[]>,
  activeFolderId: string | null,
  loose: FolderDocument[]
): FolderDocument[] {
  if (!activeFolderId) return loose;
  return byFolderId.get(activeFolderId) ?? [];
}

/** Mã hóa cỡ tệp (KB/MB) để hiển thị trên thẻ tài liệu. */
export function formatDocSize(size: number | null): string {
  if (size && size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size) return `${Math.round(size / 1024)} KB`;
  return "—";
}
