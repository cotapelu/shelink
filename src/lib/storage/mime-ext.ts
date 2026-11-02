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
// MIME → ánh xạ phần mở rộng, dùng để lấp khi dữ liệu cũ không có đuôi tệp, tránh tệp tải về không mở được
const MIME_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/heic": ".heic",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
  "text/html": ".html",
  "application/json": ".json",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "video/mp4": ".mp4",
  "audio/mpeg": ".mp3"
};

export function ensureExt(name: string, mimeType: string | null | undefined): string {
  if (/\.[A-Za-z0-9]{1,5}$/.test(name)) return name;
  if (!mimeType) return name;
  return name + (MIME_EXT[mimeType.toLowerCase()] ?? "");
}

export function isInlinePreviewable(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  const m = mimeType.toLowerCase();
  return (
    m === "application/pdf" ||
    m.startsWith("image/") ||
    m === "text/plain" ||
    m === "text/markdown" ||
    m === "text/csv" ||
    m === "text/html"
  );
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLS_MIME = "application/vnd.ms-excel";

/**
 * v0.42: Các loại tài liệu Office server có thể chuyển sang preview HTML.
 * docx → mammoth; xlsx/xls → exceljs.
 * .doc cũ (application/msword) không chuyển đáng tin được → trả null (hạ xuống tải về).
 * mime có thể không chính xác nên kiểm tra cả đuôi tên tệp.
 */
export function officePreviewKind(
  mimeType: string | null | undefined,
  name?: string | null
): "docx" | "xlsx" | null {
  const m = (mimeType ?? "").toLowerCase();
  const n = (name ?? "").toLowerCase();
  if (m === DOCX_MIME || n.endsWith(".docx")) return "docx";
  if (m === XLSX_MIME || m === XLS_MIME || n.endsWith(".xlsx") || n.endsWith(".xls"))
    return "xlsx";
  return null;
}

/** Có thể mở xem trực tiếp (nhúng inline hoặc server chuyển HTML), dùng để frontend quyết định có hiện lối "Mở" */
export function canPreview(
  mimeType: string | null | undefined,
  name?: string | null
): boolean {
  return isInlinePreviewable(mimeType) || officePreviewKind(mimeType, name) !== null;
}
