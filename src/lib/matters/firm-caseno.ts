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
 * v0.42 Render mẫu mã nội bộ (hàm thuần, không phụ thuộc DB, dễ viết test)
 *
 * Các token hỗ trợ (giữ nguyên tên token — là hợp đồng cấu hình trong Settings):
 *   {年}   năm 4 chữ số       {年2}  năm 2 chữ số
 *   {所}   viết tắt văn phòng {类}   ký tự loại  {类词} từ loại
 *   {序3}  số thứ tự 3 chữ số  {序4} số thứ tự 4 chữ số
 *
 * Mẫu mặc định `{年}-{所}{类词}-{序3}` + viết tắt văn phòng + từ loại → `2026-...-001`.
 */
export interface CaseNoTokens {
  year: number;
  firmShortName: string;
  categoryAbbr: string;
  categoryWord: string;
  seq: number;
}

export function renderCaseNoTemplate(template: string, t: CaseNoTokens): string {
  return template
    .replace(/\{年2\}/g, String(t.year).slice(-2))
    .replace(/\{年\}/g, String(t.year))
    .replace(/\{所\}/g, t.firmShortName)
    .replace(/\{类词\}/g, t.categoryWord)
    .replace(/\{类\}/g, t.categoryAbbr)
    .replace(/\{序4\}/g, String(t.seq).padStart(4, "0"))
    .replace(/\{序3\}/g, String(t.seq).padStart(3, "0"));
}
