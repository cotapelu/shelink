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
 * v0.8 Document template engine
 *
 * Flow:
 *  1. buildContext(matterId, userId, overrides?) build variable context from DB
 *  2. renderDocxBuffer(templateBuffer, context) render with docxtemplater
 *  3. before render detectMissing(variables, context) find unfilled vars, UI popup to complete
 *
 * Template variables use double curly braces: {{firm.name}} / {{client.idNumber}}.
 */
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { prisma } from "./prisma";

const FIRM_NAME_KEY = "firmName";
const FIRM_ADDRESS_KEY = "firmAddress";
const FIRM_PHONE_KEY = "firmPhone";

export interface PartySnapshot {
  name: string;
  idNumber: string;
  phone: string;
  address: string;
  legalRep: string;
}

export interface RenderContext {
  firm: { name: string; address: string; phone: string };
  today: string; // YYYY-MM-DD
  todayCN: string; // 二〇二六年五月二十三日
  lawyer: { name: string; phone: string };
  matter: {
    code: string;
    title: string;
    category: string;
    causeText: string;
    intakeDate: string;
    claimAmount: string; // 中文金额 / "—"
    ourStanding: string;
  };
  client: PartySnapshot;
  opposing: PartySnapshot; // 第一个对方
  third: PartySnapshot; // 第一个第三人
  proceeding: { type: string; caseNo: string; court: string };
  // 数组循环用
  plaintiffs: PartySnapshot[];
  defendants: PartySnapshot[];
  thirds: PartySnapshot[];
  [extra: string]: unknown;
}

const EMPTY_PARTY: PartySnapshot = {
  name: "",
  idNumber: "",
  phone: "",
  address: "",
  legalRep: ""
};

const STANDING_VI: Record<string, string> = {
  PLAINTIFF: "Nguyên đơn",
  JOINT_PLAINTIFF: "Cùng nguyên đơn",
  DEFENDANT: "Bị đơn",
  JOINT_DEFENDANT: "Cùng bị đơn",
  THIRD_PARTY: "Người thứ ba",
  APPELLANT: "Người kháng cáo",
  APPELLEE: "Bị kháng cáo",
  RETRIAL_APPLICANT: "Người xin xét xử lại",
  RETRIAL_RESPONDENT: "Bị xin xét xử lại",
  ENFORCEMENT_APPLICANT: "Người yêu cầu thi hành",
  EXECUTED_PERSON: "Bị thi hành",
  COUNTERCLAIM_PLAINTIFF: "Nguyên đơn phản tố",
  COUNTERCLAIM_DEFENDANT: "Bị đơn phản tố",
  CRIMINAL_DEFENDANT: "Bị cáo",
  CRIMINAL_VICTIM: "Người bị hại",
  PRIVATE_PROSECUTOR: "Người tự kiện",
  CRIMINAL_INCIDENTAL_PLAINTIFF: "Nguyên đơn dân sự kèm hình sự",
  ARBITRATION_CLAIMANT: "Người khởi kiện trọng tài",
  ARBITRATION_RESPONDENT: "Bị khởi kiện trọng tài",
  ADMIN_PLAINTIFF: "Nguyên đơn hành chính",
  ADMIN_DEFENDANT: "Bị đơn hành chính",
  ADMIN_RECONSIDERATION_APPLICANT: "Người xin tái xem xét hành chính",
  ADMIN_RECONSIDERATION_RESPONDENT: "Bị xin tái xem xét hành chính",
  NON_LITIGATION_PARTY: "Bên liên quan dự án"
};

const CATEGORY_VI: Record<string, string> = {
  CIVIL_COMMERCIAL: "Dân sự - Thương mại",
  CRIMINAL: "Hình sự",
  ADMINISTRATIVE: "Hành chính",
  NON_LITIGATION: "Phi tố tụng",
  LEGAL_COUNSEL: "Tư vấn",
  SPECIAL_PROJECT: "Dự án đặc biệt"
};

function toVietDate(d: Date): string {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day} tháng ${month} năm ${year}`;
  // Alternative: return `${day}/${month}/${year}`;
}

function partyToSnapshot(p: {
  name: string;
  idNumber: string | null;
  phone: string | null;
  address: string | null;
  legalRep: string | null;
}): PartySnapshot {
  return {
    name: p.name,
    idNumber: p.idNumber ?? "",
    phone: p.phone ?? "",
    address: p.address ?? "",
    legalRep: p.legalRep ?? ""
  };
}

async function getFirmInfo(): Promise<{ name: string; address: string; phone: string }> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [FIRM_NAME_KEY, FIRM_ADDRESS_KEY, FIRM_PHONE_KEY] } }
  });
  const dict = new Map(rows.map((r) => [r.key, (r.value as { value?: string })?.value ?? ""]));
  return {
    name: dict.get(FIRM_NAME_KEY) || "LawLink 律师事务所",
    address: dict.get(FIRM_ADDRESS_KEY) || "",
    phone: dict.get(FIRM_PHONE_KEY) || ""
  };
}

/**
 * Áp dụng overrides (từ UI inline completion), keys như "client.idNumber" ghi ngược vào bảng.
 * Lưu ý: chỉ ghi lại fields thường thiếu v0.8 (client.idNumber / client.address / opposing.idNumber...).
 * Các field khác bỏ qua, tránh nhầm.
 */
async function applyOverrides(matterId: string | undefined, overrides: Record<string, string>) {
  if (!matterId) return;
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { primaryClientId: true }
  });
  if (!matter) return;

  // client.* → Client 表
  if (matter.primaryClientId) {
    const clientPatch: Record<string, string> = {};
    if (overrides["client.idNumber"]) clientPatch.idNumber = overrides["client.idNumber"];
    if (overrides["client.address"]) clientPatch.address = overrides["client.address"];
    if (overrides["client.phone"]) clientPatch.phone = overrides["client.phone"];
    if (Object.keys(clientPatch).length > 0) {
      await prisma.client.update({
        where: { id: matter.primaryClientId },
        data: clientPatch
      });
    }
  }

  // opposing.* → 第一个 OPPOSING_PARTY
  const opposingPatch: Record<string, string> = {};
  if (overrides["opposing.idNumber"]) opposingPatch.idNumber = overrides["opposing.idNumber"];
  if (overrides["opposing.address"]) opposingPatch.address = overrides["opposing.address"];
  if (overrides["opposing.phone"]) opposingPatch.phone = overrides["opposing.phone"];
  if (Object.keys(opposingPatch).length > 0) {
    const opp = await prisma.party.findFirst({
      where: { matterId, role: "OPPOSING_PARTY" },
      orderBy: { ordinal: "asc" },
      select: { id: true }
    });
    if (opp) {
      await prisma.party.update({ where: { id: opp.id }, data: opposingPatch });
    }
  }
}

export async function buildContext(opts: {
  matterId?: string;
  userId: string;
  overrides?: Record<string, string>;
}): Promise<RenderContext> {
  if (opts.matterId && opts.overrides && Object.keys(opts.overrides).length > 0) {
    await applyOverrides(opts.matterId, opts.overrides);
  }

  const today = new Date();
  const firm = await getFirmInfo();
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true, phone: true }
  });

  if (!opts.matterId) {
    return {
      firm,
      today: today.toISOString().slice(0, 10),
      todayCN: toVietDate(today),
      lawyer: { name: user?.name ?? "", phone: user?.phone ?? "" },
      matter: {
        code: "",
        title: "",
        category: "",
        causeText: "",
        intakeDate: "",
        claimAmount: "—",
        ourStanding: ""
      },
      client: EMPTY_PARTY,
      opposing: EMPTY_PARTY,
      third: EMPTY_PARTY,
      proceeding: { type: "", caseNo: "", court: "" },
      plaintiffs: [],
      defendants: [],
      thirds: []
    };
  }

  const matter = await prisma.matter.findUnique({
    where: { id: opts.matterId },
    include: {
      cause: { select: { name: true } },
      primaryClient: true,
      parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
      procedures: { orderBy: { order: "asc" }, where: { engagement: "ENGAGED" }, take: 1 }
    }
  });
  if (!matter) throw new Error("案件不存在");

  const causeText = matter.cause?.name ?? matter.causeFreeText ?? "";
  const clientParty = matter.primaryClient
    ? {
        name: matter.primaryClient.name,
        idNumber: matter.primaryClient.idNumber ?? "",
        phone: matter.primaryClient.phone ?? "",
        address: matter.primaryClient.address ?? "",
        legalRep: ""
      }
    : EMPTY_PARTY;

  const opposingParties = matter.parties
    .filter((p) => p.role === "OPPOSING_PARTY")
    .map(partyToSnapshot);
  const thirdParties = matter.parties
    .filter((p) => p.role === "THIRD_PARTY")
    .map(partyToSnapshot);
  const clientPartiesFromParty = matter.parties
    .filter((p) => p.role === "CLIENT_PARTY")
    .map(partyToSnapshot);

  // 根据 standing 区分 plaintiff / defendant（兜底按 role）
  const plaintiffs = clientPartiesFromParty.length > 0 ? clientPartiesFromParty : [clientParty];
  const defendants = opposingParties;

  const firstProc = matter.procedures[0];

  return {
    firm,
    today: today.toISOString().slice(0, 10),
    todayCN: toVietDate(today),
    lawyer: { name: user?.name ?? "", phone: user?.phone ?? "" },
    matter: {
      code: matter.internalCode,
      title: matter.title,
      category: CATEGORY_VI[matter.category] ?? matter.category,
      causeText,
      intakeDate: matter.intakeDate ? matter.intakeDate.toISOString().slice(0, 10) : "",
      claimAmount: matter.claimAmount ? `${matter.claimAmount} 元` : "—",
      ourStanding: matter.ourStanding ? STANDING_VI[matter.ourStanding] ?? matter.ourStanding : ""
    },
    client: clientParty,
    opposing: opposingParties[0] ?? EMPTY_PARTY,
    third: thirdParties[0] ?? EMPTY_PARTY,
    proceeding: {
      type: firstProc?.type ?? "",
      caseNo: firstProc?.caseNumber ?? "",
      court: firstProc?.handlingAgency ?? ""
    },
    plaintiffs,
    defendants,
    thirds: thirdParties
  };
}

/**
 * docxtemplater 错误结构（Errors[].properties.explanation 含具体 tag）。
 * 用类型断言读取，避免引入额外依赖。
 */
interface DocxTagError {
  message?: string;
  properties?: {
    id?: string;
    explanation?: string;
    xtag?: string;
    file?: string;
  };
}

interface DocxMultiError extends Error {
  properties?: {
    errors?: DocxTagError[];
    id?: string;
    explanation?: string;
  };
}

function formatDocxError(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as DocxMultiError;
  const items = e.properties?.errors ?? [e as unknown as DocxTagError];
  const lines: string[] = [];
  for (const it of items) {
    const tag = it.properties?.xtag ?? it.properties?.id ?? "?";
    const reason = it.properties?.explanation ?? it.message ?? "未知";
    lines.push(`[${tag}] ${reason}`);
  }
  return lines.join("\n");
}

/**
 * Render docx: nhận template Buffer + context → trả về Buffer đã điền.
 * Template dùng cú pháp {{var}} (double curly), tránh xung đột với "{" trong docx.
 *
 * Khi lỗi, ném exception tiếng Việt chứa tag/nguyên nhân, giúp lawyer xác định field nào hỏng.
 */
export function renderDocxBuffer(
  templateBuffer: Buffer,
  context: RenderContext
): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch (err) {
    throw new Error(`Template file corrupted, không thể giải nén：${err instanceof Error ? err.message : String(err)}`);
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" }
  });

  try {
    doc.render(context as unknown as Record<string, unknown>);
  } catch (err) {
    throw new Error(`模板渲染失败：\n${formatDocxError(err)}`);
  }

  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}

/** Kiểm tra trong context biến nào empty, trả về list paths bị thiếu (dùng cho UI popup).
 * @param required Danh sách variables khai báo (DocumentTemplate.variables)
 */
export function detectMissing(required: string[], context: RenderContext): string[] {
  const missing: string[] = [];
  for (const path of required) {
    const val = readPath(context, path);
    if (val === undefined || val === null || String(val).trim() === "") {
      missing.push(path);
    }
  }
  return missing;
}

function readPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}
