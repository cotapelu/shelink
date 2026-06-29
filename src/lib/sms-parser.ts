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
 * v0.9 Phân tích tin nhắn tòa án (Triển khai TypeScript, tương ứng với parse_sms_regex trong server.py hệ thống cũ)
 *
 * Cách sử dụng:
 *   const parsed = parseSms(rawText);
 *   parsed.smsType / parsed.caseNumbers / parsed.hearingDate ...
 *
 * File này **chỉ chứa regex thuần và helper thuần**, không có dependencies node:* / server-only, client có thể import.
 * Nâng cao AI xem `sms-parser-ai.ts` (chỉ dành cho server).
 */
import type { SmsType } from "@prisma/client";

export interface SmsPlatformHint {
  keyword: string;
  label: string;
}

const COURT_PLATFORMS: SmsPlatformHint[] = [
  { keyword: "zhixun", label: "智诉服务" },
  { keyword: "hbfy", label: "湖北法院电子送达" },
  { keyword: "hbcourt", label: "湖北法院电子送达" },
  { keyword: "e-court", label: "人民法院电子送达" },
  { keyword: "court.gov.cn", label: "人民法院在线服务" },
  { keyword: "songda", label: "电子送达" },
  { keyword: "12368", label: "12368 诉讼服务" },
  { keyword: "rmfyaj", label: "人民法院案件库" }
];

export interface ParsedSms {
  smsType: SmsType;
  caseNumbers: string[];
  court: string | null;
  // Mảng chuỗi ngày tháng đầy đủ (giữ định dạng gốc, hiển thị thân thiện với UI)
  dates: string[];
  // Dự đoán thời gian xét xử (lấy ngày đầu tiên trong SMS chứa giờ-phút, có ý nghĩa trong kịch bản thông báo xét xử)
  hearingDate: string | null;
  filingDate: string | null;
  judgmentDate: string | null;
  appealDeadline: string | null; // "15日"
  courtRoom: string | null;
  judge: string | null;
  clerk: string | null;
  phones: string[];
  amounts: string[];
  urls: string[];
  platforms: string[];
  summary: string;
  // Trường nâng cao AI v0.9.1 (chỉ điền khi aiEnriched=true)
  aiEnriched?: boolean;
  action?: string | null;       // Hành động luật sư nên thực hiện
  urgency?: "HIGH" | "MEDIUM" | "LOW" | null;
}

// ━━━ Mẫu regex (đồng bộ với SMS_PATTERNS hệ thống cũ) ━━━
const PAT_CASE_NUMBER = [/[（(]\d{4}[)）][一-龥]{1,4}\d{0,4}[一-龥]{1,4}\d+号/g];

const PAT_COURT = [
  /【([一-龥]{2,12}法院)】/,
  /[一-龥]{2,6}(?:省|市|县|区|自治州|自治县)[一-龥]{0,6}(?:人民法院|高级人民法院|中级人民法院)/,
  /[一-龥]{2,8}(?:人民法院|仲裁委员会|仲裁院)/,
  /[一-龥]{2,8}法院/
];

const PAT_DATETIME = [
  /\d{4}年\d{1,2}月\d{1,2}日\s*(?:上午|下午)?\s*\d{1,2}[:：]\d{2}/g,
  /\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}时\d{0,2}分?/g,
  /\d{4}年\d{1,2}月\d{1,2}日/g,
  /\d{4}-\d{1,2}-\d{1,2}\s*\d{1,2}:\d{2}/g,
  /\d{4}\/\d{1,2}\/\d{1,2}/g
];

const PAT_URLS = [/https?:\/\/[^\s一-龥<>"'）)\]】]+/g];

const PAT_COURT_ROOM = [
  /(?:第?[一二三四五六七八九十百\d]+(?:号)?)(?:法庭|审判庭|调解室)/,
  /[一-龥]{1,6}(?:法庭|审判庭|调解室)/
];

const PAT_JUDGE = [
  /(?:承办法官|主审法官|审判长|审判员)[:：\s]*([一-龥]{2,4})/,
  /法官\s*([一-龥]{2,4})(?:[，。 ]|$)/,
  /([一-龥]{2,4})法官/
];

const PAT_CLERK = [
  /(?:书记员|法官助理|内勤)[:：\s]*([一-龥]{2,4})/,
  /([一-龥]{2,4})(?:书记员|法官助理)/
];

const PAT_PHONE = [/1[3-9]\d{9}/g, /0\d{2,3}-?\d{7,8}/g];

const PAT_FILING_DATE = [
  /立案(?:日期|时间)?[:：\s]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
  /(\d{4}年\d{1,2}月\d{1,2}日)\s*(?:立案|受理)/
];

const PAT_JUDGMENT_DATE = [
  /(?:判决|裁定|宣判)(?:日期|时间)?[:：\s]*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
  /(\d{4}年\d{1,2}月\d{1,2}日)\s*(?:作出判决|判决|宣判)/
];

const PAT_APPEAL_DEADLINE = [
  /(\d{1,2})\s*(?:日|天)\s*内[^。]*?(?:上诉|提出上诉)/,
  /上诉(?:期(?:限)?)?[:：\s]*(\d{1,2})\s*(?:日|天)/
];

const PAT_AMOUNT = [/(?:人民币|金额|标的)\s*(\d[\d,]*\.?\d*)\s*元/g, /(\d[\d,]*\.?\d*)\s*元/g];

// Từ nhiễu tiền tố tòa án (loại bỏ như "trong ngày gửi đến XX tòa án")
const PREFIX_NOISE = [
  "日内",
  "可向",
  "应向",
  "应当向",
  "可以向",
  "要向",
  "须向",
  "可",
  "应当",
  "应",
  "须",
  "向",
  "至",
  "到",
  "由",
  "赴",
  "往",
  "去",
  "的"
];

const SMS_TYPE_KEYWORDS: Array<{ type: SmsType; words: string[] }> = [
  { type: "HEARING_NOTICE", words: ["开庭", "庭审", "出庭", "到庭"] },
  { type: "SERVICE_NOTICE", words: ["送达", "领取", "签收", "文书已生成"] },
  { type: "FEE_NOTICE", words: ["缴费", "交费", "诉讼费", "缴纳"] },
  { type: "MEDIATION", words: ["调解", "协商"] },
  { type: "ENFORCEMENT", words: ["执行", "被执行", "履行", "冻结", "查封"] },
  { type: "FILING_NOTICE", words: ["立案", "受理", "案件编号"] },
  { type: "JUDGMENT_NOTICE", words: ["判决", "裁定", "裁判文书"] },
  { type: "EVIDENCE_SUBMIT", words: ["补充材料", "举证期", "证据交换", "提交材料"] }
];

// ━━━ Tiện ích ━━━
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function detectPlatform(url: string): string | null {
  const low = url.toLowerCase();
  for (const p of COURT_PLATFORMS) {
    if (low.includes(p.keyword)) return p.label;
  }
  if (url.includes("智诉")) return "智诉服务";
  return null;
}

function stripPrefixNoise(name: string): string {
  let cur = name;
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIX_NOISE) {
      if (cur.startsWith(p)) {
        cur = cur.slice(p.length);
        changed = true;
        break;
      }
    }
  }
  return cur.replace(/^[\s的，。、]+|[\s的，。、]+$/g, "");
}

function classifyType(text: string): SmsType {
  for (const { type, words } of SMS_TYPE_KEYWORDS) {
    if (words.some((w) => text.includes(w))) return type;
  }
  return "OTHER";
}

function pickHearingDate(dates: string[]): string | null {
  // Ưu tiên có giờ-phút (cho kịch bản xét xử)
  const withTime = dates.find((d) => /\d{1,2}[:：时]\d{0,2}/.test(d));
  return withTime ?? null;
}

function summarize(text: string): string {
  const lines = text
    .split(/[\n。;；]/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return text.slice(0, 50);
  // Lấy câu dài nhất và chứa từ khóa làm tóm tắt
  const informative = lines.find((l) =>
    /开庭|送达|缴费|调解|执行|立案|判决|举证|裁定/.test(l)
  );
  return (informative ?? lines[0]).slice(0, 80);
}

// ━━━ Điểm vào chính ━━━
export function parseSms(text: string): ParsedSms {
  const result: ParsedSms = {
    smsType: classifyType(text),
    caseNumbers: [],
    court: null,
    dates: [],
    hearingDate: null,
    filingDate: null,
    judgmentDate: null,
    appealDeadline: null,
    courtRoom: null,
    judge: null,
    clerk: null,
    phones: [],
    amounts: [],
    urls: [],
    platforms: [],
    summary: summarize(text)
  };

  // Số vụ án
  for (const pat of PAT_CASE_NUMBER) {
    const ms = text.match(pat);
    if (ms) result.caseNumbers.push(...ms);
  }
  result.caseNumbers = uniq(result.caseNumbers);

  // Tòa án (theo thứ tự ưu tiên, khớp với cái hiệu lực đầu tiên)
  for (const pat of PAT_COURT) {
    const m = text.match(pat);
    if (m) {
      const raw = m[1] ?? m[0];
      const cleaned = stripPrefixNoise(raw);
      if (
        cleaned &&
        (cleaned.endsWith("法院") || cleaned.endsWith("仲裁院") || cleaned.endsWith("仲裁委员会"))
      ) {
        result.court = cleaned;
        break;
      }
    }
  }

  // Ngày tháng
  for (const pat of PAT_DATETIME) {
    const ms = text.match(pat);
    if (ms) result.dates.push(...ms);
  }
  result.dates = uniq(result.dates);
  result.hearingDate = pickHearingDate(result.dates);

  // URL + Nền tảng
  for (const pat of PAT_URLS) {
    const ms = text.match(pat);
    if (ms) result.urls.push(...ms);
  }
  result.urls = uniq(result.urls);
  const plats = new Set<string>();
  for (const u of result.urls) {
    const p = detectPlatform(u);
    if (p) plats.add(p);
  }
  result.platforms = Array.from(plats);

  // Phòng xét xử
  for (const pat of PAT_COURT_ROOM) {
    const m = text.match(pat);
    if (m) {
      result.courtRoom = m[0];
      break;
    }
  }

  // Thẩm phán
  for (const pat of PAT_JUDGE) {
    const m = text.match(pat);
    if (m) {
      result.judge = m[1] ?? m[0];
      break;
    }
  }

  // Thư ký
  for (const pat of PAT_CLERK) {
    const m = text.match(pat);
    if (m) {
      result.clerk = m[1] ?? m[0];
      break;
    }
  }

  // Điện thoại
  for (const pat of PAT_PHONE) {
    const ms = text.match(pat);
    if (ms) result.phones.push(...ms);
  }
  result.phones = uniq(result.phones);

  // Ngày nộp đơn / Ngày phán quyết / Thời hạn kháng cáo
  for (const pat of PAT_FILING_DATE) {
    const m = text.match(pat);
    if (m) {
      result.filingDate = m[1];
      break;
    }
  }
  for (const pat of PAT_JUDGMENT_DATE) {
    const m = text.match(pat);
    if (m) {
      result.judgmentDate = m[1];
      break;
    }
  }
  for (const pat of PAT_APPEAL_DEADLINE) {
    const m = text.match(pat);
    if (m) {
      result.appealDeadline = m[1] + "日";
      break;
    }
  }

  // Số tiền
  for (const pat of PAT_AMOUNT) {
    const ms = text.match(pat);
    if (ms) result.amounts.push(...ms);
  }
  result.amounts = uniq(result.amounts);

  return result;
}

// ━━━ Phân tích hàng loạt (tách nhiều tin nhắn theo dòng trống hoặc đường phân cách) ━━━
export function splitSmsBatch(text: string): string[] {
  return text
    .split(/\n\s*\n|\n-{3,}\n|\n={3,}\n/)
    .map((m) => m.trim())
    .filter(Boolean);
}

// ━━━ Cố gắng phân tích dates SMS thành JS Date, thuận tiện cho Hearing/Deadline ━━━
const CN_DIGIT: Record<string, number> = {
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10
};

export function toDate(s: string): Date | null {
  // YYYY-MM-DD HH:MM
  const m = s.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?\s*(?:上午|下午)?\s*(\d{1,2})?[:：时]?(\d{0,2})?/);
  if (m) {
    const y = parseInt(m[1]);
    const mo = parseInt(m[2]) - 1;
    const d = parseInt(m[3]);
    const isPM = s.includes("下午");
    let h = m[4] ? parseInt(m[4]) : 0;
    const mi = m[5] ? parseInt(m[5]) : 0;
    if (isPM && h < 12) h += 12;
    return new Date(y, mo, d, h, mi);
  }
  return null;
}

export { CN_DIGIT };

// Tăng cường AI (enrichWithAi) đã di chuyển sang sms-parser-ai.ts (chỉ dành cho server)
// File này giữ client-safe (không có dependencies node:*), các client như sms-paste-dialog
// component có thể import trực tiếp parseSms / splitSmsBatch / toDate từ đây.
