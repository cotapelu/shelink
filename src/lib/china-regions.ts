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
// v0.30 管辖地数据 + 争议解决机构匹配
// 数据来自 china-division（全国省/市/区县），法院/仲裁机构名称按命名规则生成。
import pca from "china-division/dist/pca.json";

type Pca = Record<string, Record<string, string[]>>;
const DATA = pca as Pca;

export const provinces: string[] = Object.keys(DATA);

export function citiesOf(province: string): string[] {
  return province && DATA[province] ? Object.keys(DATA[province]) : [];
}

export function areasOf(province: string, city: string): string[] {
  return province && city && DATA[province]?.[city] ? DATA[province][city] : [];
}

/** 管辖地序列化：省/市/区县（区县可缺）。空串表示未选。 */
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

// 直辖市 / 地级市占位项「市辖区」「县」不作为机构名，回退到省级名称
function effectiveCityName(province: string, city: string): string {
  if (!city || city === "市辖区" || city === "县") return province;
  return city;
}

// 仲裁委员会一般用城市名去掉「市」后缀：广州市 → 广州仲裁委员会
function arbitrationCityName(cityName: string): string {
  return cityName.replace(/(市|地区|自治州|盟)$/, "");
}

/**
 * 根据管辖地生成可选「争议解决机构」：
 * - 选到区县：本区县基层法院 + 本市中院 + 本省高院 + 本市仲裁委
 * - 只选到市：本市中院 + 本市各区县基层法院 + 本省高院 + 本市仲裁委
 * 返回去重后的字符串列表。
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

  // 去重保序
  return Array.from(new Set(out.filter(Boolean)));
}
