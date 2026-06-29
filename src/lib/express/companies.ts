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
 * v0.9.3 快递公司映射（纯函数，无 node 依赖，client/server 通用）
 */

// 中文公司名 → (kuaidi100 code, kdniao code)
export const COMPANY_CODES: Record<string, [string, string]> = {
  顺丰速运: ["shunfeng", "SF"],
  中通快递: ["zhongtong", "ZTO"],
  圆通速递: ["yuantong", "YTO"],
  韵达快递: ["yunda", "YD"],
  申通快递: ["shentong", "STO"],
  EMS: ["ems", "EMS"],
  京东快递: ["jd", "JD"],
  邮政包裹: ["youzhengguonei", "YZPY"],
  极兔速递: ["jtexpress", "JTSD"],
  德邦快递: ["debangkuaidi", "DBL"]
};

export const SUPPORTED_COMPANIES = Object.keys(COMPANY_CODES);

export function detectCompany(trackingNo: string): string | null {
  const no = trackingNo.trim().toUpperCase();
  if (no.startsWith("SF")) return "顺丰速运";
  if (no.startsWith("JT")) return "极兔速递";
  if (no.startsWith("YT")) return "圆通速递";
  if (no.startsWith("JD")) return "京东快递";
  if (/^(75|76|77)/.test(no)) return "中通快递";
  if (/^(43|44)/.test(no)) return "韵达快递";
  if (/^(88|66)/.test(no)) return "申通快递";
  if (no.startsWith("E") || no.startsWith("1")) return "EMS";
  return null;
}
