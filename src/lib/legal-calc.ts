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
 * v0.9.2 Tính toán nhanh cho luật sư
 *
 * Ba tình huống:
 *  - Phí tòa: theo "Quy định về phí tố tụng" (lũy tiến, giản lạo giảm 50%)
 *  - Lãi chậm trả: Số tiền án × (LPR + 5%) × số ngày chậm / 365
 *  - Ngày: tính ngày làm việc giữa hai ngày, cộng/trừ N ngày
 *
 * Chữ số lớn: numberToChinese (hỗ trợ vạn / ức / tỷ)
 *
 * Không phụ thuộc mạng, không phụ thuộc server.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. PHÍ TÒA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type CourtFeeCaseType =
  | "PROPERTY"       // Tài sản
  | "DIVORCE"        // Ly hôn
  | "LABOR"          // Tranh chấp lao động
  | "IP"             // Sở hữu trí tuệ (không có giá trị tranh chấp)
  | "OTHER";         // Loại khác (không tài sản)

/**
 * Tài sản: lũy tiến theo quy định (Quy định về phí tố tụng Điều 13):
 *   ≤ 10 000               50
 *   10 000 – 100 000        × 2.5%  - 200
 *   100 000 – 200 000       × 2%    + 300
 *   200 000 – 500 000       × 1.5%  + 1 300
 *   500 000 – 1 000 000     × 1%    + 3 800
 *   1 000 000 – 2 000 000   × 0.9%  + 4 800
 *   2 000 000 – 5 000 000   × 0.8%  + 6 800
 *   5 000 000 – 10 000 000  × 0.7%  + 11 800
 *   10 000 000 – 20 000 000 × 0.6%  + 21 800
 *   > 20 000 000            × 0.5%  + 41 800
 */
function feePropertyTiers(amount: number): number {
  if (amount <= 10_000) return 50;
  if (amount <= 100_000) return amount * 0.025 - 200;
  if (amount <= 200_000) return amount * 0.02 + 300;
  if (amount <= 500_000) return amount * 0.015 + 1_300;
  if (amount <= 1_000_000) return amount * 0.01 + 3_800;
  if (amount <= 2_000_000) return amount * 0.009 + 4_800;
  if (amount <= 5_000_000) return amount * 0.008 + 6_800;
  if (amount <= 10_000_000) return amount * 0.007 + 11_800;
  if (amount <= 20_000_000) return amount * 0.006 + 21_800;
  return amount * 0.005 + 41_800;
}

export interface CourtFeeResult {
  caseType: CourtFeeCaseType;
  amount: number; // 输入标的额
  fee: number; // 普通程序
  feeSimplified: number; // 简易程序（减半）
  note: string;
}

export function calcCourtFee(input: { caseType: CourtFeeCaseType; amount?: number }): CourtFeeResult {
  const amount = input.amount ?? 0;

  switch (input.caseType) {
    case "PROPERTY": {
      const fee = Math.round(feePropertyTiers(amount));
      return {
        caseType: "PROPERTY",
        amount,
        fee,
        feeSimplified: Math.round(fee / 2),
        note: "Tài sản: lũy tiến, giản lạo giảm 50%"
      };
    }
    case "DIVORCE": {
      // 离婚：每件 50-300 元；涉及财产分割 > 20 万 部分 × 0.5%
      const base = 300;
      const extra = amount > 200_000 ? (amount - 200_000) * 0.005 : 0;
      const fee = Math.round(base + extra);
      return {
        caseType: "DIVORCE",
        amount,
        fee,
        feeSimplified: Math.round(fee / 2),
        note:
          amount > 200_000
            ? "Ly hôn: 300 + phần tài sản vượt 200,000 × 0.5% (giản lạo giảm 50%)"
            : "Ly hôn mỗi vụ 300 (giản lạo giảm 50%)"
      };
    }
    case "LABOR":
      return {
        caseType: "LABOR",
        amount,
        fee: 10,
        feeSimplified: 5,
        note: "Tranh chấp lao động mỗi vụ 10 (giản lạo 5)"
      };
    case "IP":
      // 50 元 ≤ X ≤ 100 元；案件复杂 100-500 元；区间给中位
      return {
        caseType: "IP",
        amount: 0,
        fee: 1000,
        feeSimplified: 500,
        note: "Sở hữu trí tuệ (không có giá trị) 500–1000, kết quả này lấy ngưỡng cao"
      };
    case "OTHER":
      return {
        caseType: "OTHER",
        amount: 0,
        fee: 100,
        feeSimplified: 50,
        note: "Khác mỗi vụ 50–100, kết quả lấy ngưỡng cao"
      };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. LÃI CHẬM TRẢ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Giải thích dân sự Điều 463 + Bộ luật dân sự Điều 260:
 *   Lãi chậm = Số tiền án × (LPR + 5%) × số ngày chậm / 365
 *
 * Đạo luật: Nghĩa vụ thi hành án chưa thực hiện thanh toán tiền, phải trả gấp đôi lãi chậm trả.
 * Đây là phần 'gấp đôi'.
 *
 * LPR mặc định 3.45% (khoảng 2024-2025), user có thể tự override.
 */
export interface LateInterestResult {
  principal: number;
  daysLate: number;
  yearlyRate: number;       // LPR + 5%
  interest: number;         // 加倍部分（推荐采用值）
  totalToPay: number;       // 本金 + 加倍利息
}

export function calcLateInterest(input: {
  principal: number;
  dueDate: Date;
  paidDate: Date;
  lprPercent?: number; // LPR 1 年期，默认 3.45
  extraPercent?: number; // 加成，默认 5
}): LateInterestResult {
  const lpr = input.lprPercent ?? 3.45;
  const extra = input.extraPercent ?? 5;
  const yearlyRate = (lpr + extra) / 100;
  const daysLate = Math.max(
    0,
    Math.floor((input.paidDate.getTime() - input.dueDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const interest = +(input.principal * yearlyRate * daysLate / 365).toFixed(2);
  return {
    principal: input.principal,
    daysLate,
    yearlyRate,
    interest,
    totalToPay: +(input.principal + interest).toFixed(2)
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. TÍNH NGÀY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function daysBetween(a: Date, b: Date, excludeWeekend = false): number {
  const start = new Date(a);
  const end = new Date(b);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (!excludeWeekend) {
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
  // 排除周末（工作日数）
  const sign = end >= start ? 1 : -1;
  let count = 0;
  const cur = new Date(start);
  const target = new Date(end);
  while (cur.getTime() !== target.getTime()) {
    cur.setDate(cur.getDate() + sign);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count += sign;
  }
  return count;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. CHỮ SỐ LỚN (từ hệ thống cũ numToCn)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CN_DIGIT = "零壹贰叁肆伍陆柒捌玖";
const CN_UNIT_LO = ["仟", "佰", "拾", ""];
const CN_UNIT_HI = ["", "万", "亿", "万亿"];

function chineseGroup4(s: string): string {
  const padded = s.padStart(4, "0");
  let r = "";
  let needZero = false;
  for (let i = 0; i < 4; i++) {
    const d = +padded[i];
    if (d === 0) {
      if (r) needZero = true;
    } else {
      if (needZero) {
        r += "零";
        needZero = false;
      }
      r += CN_DIGIT[d] + CN_UNIT_LO[i];
    }
  }
  return r;
}

export function numberToChinese(n: number): string {
  if (n === 0 || !isFinite(n)) return "零元整";
  const neg = n < 0;
  const abs = Math.round(Math.abs(n) * 100) / 100;
  const [intStr, decStrRaw = ""] = String(abs).split(".");
  const decStr = decStrRaw.padEnd(2, "0").slice(0, 2);

  // 整数部分：按 4 位分段
  const segs: string[] = [];
  let t = intStr;
  while (t.length > 0) {
    segs.unshift(t.slice(-4));
    t = t.slice(0, -4);
  }

  let r = "";
  let lastHadValue = false;
  for (let i = 0; i < segs.length; i++) {
    const s = chineseGroup4(segs[i]);
    const ui = segs.length - 1 - i;
    if (s) {
      if (r && !lastHadValue) r += "零";
      r += s + CN_UNIT_HI[ui];
      lastHadValue = true;
    } else {
      if (r) lastHadValue = false;
    }
  }
  if (!r) r = "零";
  r += "元";

  const j = +decStr[0];
  const f = +decStr[1];
  if (j === 0 && f === 0) {
    r += "整";
  } else {
    if (j > 0) r += CN_DIGIT[j] + "角";
    else if (f > 0) r += "零";
    if (f > 0) r += CN_DIGIT[f] + "分";
  }
  return (neg ? "负" : "") + r;
}
