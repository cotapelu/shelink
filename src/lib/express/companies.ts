/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
