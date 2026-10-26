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
// v0.30 Dữ liệu địa bàn + khớp cơ quan giải quyết tranh chấp
// Dữ liệu lấy từ gói `china-division` (tỉnh / thành phố / quận huyện toàn quốc Trung Quốc);
// tên Tòa án và Ủy ban Trọng tài sinh theo quy tắc đặt tên của hệ thống này.
//
// TODO(vn-data): Nguồn dữ liệu hiện tại là hành chính Trung Quốc. Khi chuyển sang
// cơ cấu hành chính Việt Nam cần thay `china-division` bằng danh mục
// tỉnh/thành → quận/huyện → phường/xã, và đổi quy tắc sinh tên cơ quan
// (Tòa án Nhân dân / Tòa án cấp tỉnh / Trung tâm Trọng tài) trong file này.

import pca from "china-division/dist/pca.json"

type Pca = Record<string, Record<string, string[]>>;
const DATA = pca as Pca;

export const provinces: string[] = Object.keys(DATA);

export function citiesOf(province: string): string[] {
  return province && DATA[province] ? Object.keys(DATA[province]) : [];
}

export function areasOf(province: string, city: string): string[] {
  return province && city && DATA[province]?.[city] ? DATA[province][city] : [];
}

/** Chuỗi hóa địa bàn: tỉnh / thành phố / quận huyện (quận huyện có thể thiếu). Chuỗi rỗng nghĩa là chưa chọn. */
export function joinJurisdiction(province?: string, city?: string, area?: string): string {
  return [province, city, area].filter(Boolean).join("/");
}

export function parseJurisdiction(value?: string | null): {
  province: string;
  city: string;
  area: string;
} {
  const [province = "", city = "", area = ""] = (value ?? "").split("/");
  return { province, city, area };
}

// Hai giá trị đại diện "thành phố trực thuộc" và "địa cấp thị" ("市辖区", "县")
// không được dùng làm tên cơ quan — nếu gặp thì quay về dùng tên cấp tỉnh.
function effectiveCityName(province: string, city: string): string {
  if (!city || city === "市辖区" || city === "县") return province;
  return city;
}

// Ủy ban Trọng tài thường lấy tên thành phố rồi bỏ hậu tố "市" (ví dụ 广州市 → 广州仲裁委员会).
function arbitrationCityName(cityName: string): string {
  return cityName.replace(/(市|地区|自治州|盟)$/, "");
}

/**
 * Từ địa bàn đã chọn, sinh danh sách "Cơ quan giải quyết tranh chấp" có thể chọn:
 * - Khi chọn tới quận/huyện: Tòa án sơ thẩm quận/huyện + Tòa án cấp trung của thành phố
 *   + Tòa án cấp cao của tỉnh + Ủy ban Trọng tài của thành phố.
 * - Khi chỉ chọn tới thành phố: Tòa án cấp trung của thành phố + các Tòa án sơ thẩm
 *   quận/huyện thuộc thành phố + Tòa án cấp cao của tỉnh + Ủy ban Trọng tài của thành phố.
 * Trả về danh sách chuỗi đã loại trùng lặp.
 */
export function agencyOptions(value?: string | null): string[] {
  const { province, city, area } = parseJurisdiction(value);
  if (!province) return [];
  const cityName = effectiveCityName(province, city);
  const out: string[] = [];

  if (area) {
    out.push(`${area}人民法院`);
    out.push(`${cityName}中级人民法院`);
  } else if (city) {
    out.push(`${cityName}中级人民法院`);
    for (const a of areasOf(province, city)) out.push(`${a}人民法院`);
  }
  out.push(`${province}高级人民法院`);
  out.push(`${arbitrationCityName(cityName)}仲裁委员会`);

  // Loại trùng lặp, giữ nguyên thứ tự xuất hiện
  return Array.from(new Set(out.filter(Boolean)));
}
