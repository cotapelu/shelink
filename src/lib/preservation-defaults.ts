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
 * v0.9 财产保全期限默认值（民诉法第 244 条）
 */
import type { PropertyType } from "@prisma/client";

export const PRESERVATION_DURATION_DAYS: Record<PropertyType, number> = {
  BANK_DEPOSIT: 365,        // 银行存款 1 年
  VEHICLE: 730,             // 车辆 / 动产 2 年
  OTHER: 730,
  REAL_ESTATE: 1095,        // 房产 3 年
  EQUITY: 1095,             // 股权 3 年
  IP: 1095                  // 知识产权 3 年
};

export function defaultExpiryDate(startDate: Date, propertyType: PropertyType): Date {
  const days = PRESERVATION_DURATION_DAYS[propertyType] ?? 730;
  const d = new Date(startDate);
  d.setDate(d.getDate() + days);
  return d;
}
