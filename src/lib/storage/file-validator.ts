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
 * Kiểm tra loại tệp tải lên
 *
 * Ba cổng:
 *   1. Đuôi tên tệp phải nằm trong whitelist (không phân biệt hoa/thường)
 *   2. Khi MIME không rỗng cũng phải nằm trong whitelist (trình duyệt có thể giả mạo nhưng chỉ mang tính phụ trợ)
 *   3. Kích thước tệp ≤ maxBytes
 *
 * Cố ý không đọc magic bytes: sniffing tăng độ phức tạp nhưng chỉ nâng ngưỡng vượt qua một chút,
 * hiệu quả đầu tư không cao. Hệ thống giả định dùng nội bộ văn phòng, chủ yếu phòng sự cố (tải nhầm .exe)
 * hơn là chống tấn công chủ động.
 */

export type UploadPurpose = "document" | "invoice" | "seal" | "stamp";

const DOC_EXT = [
  "pdf",
  "doc", "docx",
  "xls", "xlsx",
  "ppt", "pptx",
  "txt",
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff",
  "zip", "rar", "7z",
  "mp3", "wav", "m4a",
  "mp4", "mov", "avi"
];

// Hoá đơn / dùng dấu hẹp hơn: chỉ ảnh hoặc PDF
const NARROW_EXT = ["pdf", "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"];

const ALLOWED: Record<UploadPurpose, Set<string>> = {
  document: new Set(DOC_EXT),
  invoice: new Set(NARROW_EXT),
  seal: new Set(DOC_EXT), // Bản chờ đóng dấu cho phép docx/pdf
  stamp: new Set(NARROW_EXT) // Bản scan sau đóng dấu chỉ cho ảnh / PDF
};

const MIME_PREFIX_OK: Record<UploadPurpose, RegExp> = {
  document: /^(application|image|audio|video|text)\//,
  invoice: /^(image\/|application\/pdf)/,
  seal: /^(application|image)\//,
  stamp: /^(image\/|application\/pdf)/
};

function getExt(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export interface FileValidationOptions {
  purpose: UploadPurpose;
  maxBytes: number;
}

/**
 * Ném lỗi tiếng Việt (frontend hiện toast trực tiếp); khi hợp lệ trả về ext chuẩn hoá để tầng trên dùng làm đường dẫn lưu trữ hoặc log.
 */
export function validateUploadedFile(
  file: File,
  opts: FileValidationOptions
): { ext: string } {
  if (file.size === 0) throw new Error("Tệp rỗng");
  if (file.size > opts.maxBytes) {
    throw new Error(
      `Tệp vượt quá giới hạn ${Math.round(opts.maxBytes / 1024 / 1024)}MB`
    );
  }
  const ext = getExt(file.name);
  if (!ext) throw new Error(`Tên tệp thiếu phần mở rộng: ${file.name}`);
  if (!ALLOWED[opts.purpose].has(ext)) {
    throw new Error(
      `Loại tệp không được phép: .${ext} (${opts.purpose})`
    );
  }
  if (file.type && !MIME_PREFIX_OK[opts.purpose].test(file.type)) {
    throw new Error(
      `Loại MIME không khớp đuôi tệp hoặc không có trong whitelist: ${file.type}`
    );
  }
  return { ext };
}
