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
 * Dòng thời gian tương tác khách hàng (Customer 360, TD-A5) — thuần, không DB/React.
 * Gộp nhiều nguồn "chạm" (tiếp nhận / dự án / giao tiếp / thu tiền / báo giá / hợp đồng)
 * thành một chuỗi sự kiện đã sắp xếp theo thời gian mới nhất. Nghiệp vụ nằm ở đây,
 * UI chỉ render — không được tính toán/tập trung trong component (AGENTS §3/§5.3).
 */

import type { IntakeStatus, NoteChannel } from "@prisma/client";

export type ClientTimelineSource = "INTAKE" | "MATTER" | "NOTE" | "PAYMENT" | "QUOTE" | "CONTRACT";

export type ClientTimelineEvent = {
  id: string;
  source: ClientTimelineSource;
  occurredAt: Date;
  title: string;
  detail?: string;
  amount?: number;
  currency?: string;
  href?: string;
};

/** Giới hạn số dòng hiển thị (danh sách dài vẫn nhẹ). */
export const CLIENT_TIMELINE_LIMIT = 60;

type IntakeRow = {
  id: string;
  title: string;
  status: IntakeStatus;
  receivedAt: Date;
  declinedReason: string | null;
};

type MatterRow = {
  id: string;
  internalCode: string;
  title: string;
  createdAt: Date;
  firstAcceptedAt: Date | null;
  closedAt: Date | null;
  archivedAt: Date | null;
};

type NoteRow = {
  id: string;
  matterId: string;
  channel: NoteChannel;
  withWhom: string | null;
  content: string;
  occurredAt: Date;
  authorName: string | null;
};

type PaymentRow = {
  id: string;
  matterId: string;
  amount: number;
  occurredAt: Date;
  currency?: string;
};

type QuoteRow = {
  id: string;
  code: string;
  title: string;
  status: string;
  issuedAt: Date | null;
  createdAt: Date;
  total: number;
  currency: string;
};

type ContractRow = {
  id: string;
  code: string;
  title: string;
  status: string;
  signedAt: Date | null;
  createdAt: Date;
  amount: number;
  currency: string;
};

export type ClientTimelineInput = {
  intakes: IntakeRow[];
  matters: MatterRow[];
  notes: NoteRow[];
  payments: PaymentRow[];
  quotes: QuoteRow[];
  contracts: ContractRow[];
};

const INTAKE_LABELS: Record<IntakeStatus, string> = {
  INTAKE: "Tiếp nhận mới",
  PENDING_CONFIRMATION: "Chờ xác nhận",
  CONVERTED: "Đã chuyển thành dự án",
  DECLINED: "Từ chối",
  NEEDS_REVISION: "Cần bổ sung"
};

const NOTE_LABELS: Record<NoteChannel, string> = {
  PHONE: "Gọi điện",
  WECHAT: "Nhắn tin",
  EMAIL: "Email",
  MEETING: "Gặp mặt",
  COURT: "Tòa / Trung tâm",
  OTHER: "Giao tiếp"
};

const SNIPPET_MAX = 140;

function snippet(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > SNIPPET_MAX ? `${flat.slice(0, SNIPPET_MAX)}…` : flat;
}

function matterCodeMap(matters: MatterRow[]): Map<string, string> {
  return new Map(matters.map((m) => [m.id, m.internalCode]));
}

function intakeEvents(rows: IntakeRow[]): ClientTimelineEvent[] {
  return rows.map((r) => ({
    id: `intake:${r.id}`,
    source: "INTAKE",
    occurredAt: r.receivedAt,
    title: INTAKE_LABELS[r.status] ?? "Tiếp nhận",
    detail: r.status === "DECLINED" && r.declinedReason ? `Lý do: ${r.declinedReason}` : r.title,
    href: `/intakes/${r.id}`
  }));
}

function matterEvents(rows: MatterRow[]): ClientTimelineEvent[] {
  const out: ClientTimelineEvent[] = [];
  const add = (key: string, at: Date | null, title: string, m: MatterRow) => {
    if (at) {
      out.push({ id: `matter:${m.id}:${key}`, source: "MATTER", occurredAt: at, title, detail: m.title, href: `/matters/${m.id}` });
    }
  };
  for (const m of rows) {
    out.push({ id: `matter:${m.id}:open`, source: "MATTER", occurredAt: m.createdAt, title: "Mở dự án", detail: `${m.internalCode} · ${m.title}`, href: `/matters/${m.id}` });
    add("accept", m.firstAcceptedAt, "Tiếp nhận dự án", m);
    add("close", m.closedAt, "Kết thúc dự án", m);
    add("archive", m.archivedAt, "Lưu trữ dự án", m);
  }
  return out;
}

function noteEvents(rows: NoteRow[], codeById: Map<string, string>): ClientTimelineEvent[] {
  return rows.map((n) => {
    const known = codeById.has(n.matterId);
    const who = n.withWhom ? ` · ${n.withWhom}` : "";
    const author = n.authorName ? ` (${n.authorName})` : "";
    return {
      id: `note:${n.id}`,
      source: "NOTE",
      occurredAt: n.occurredAt,
      title: `${NOTE_LABELS[n.channel] ?? "Giao tiếp"}${who}${author}`,
      detail: snippet(n.content),
      href: known ? `/matters/${n.matterId}` : undefined
    };
  });
}

function paymentEvents(rows: PaymentRow[], codeById: Map<string, string>): ClientTimelineEvent[] {
  return rows.map((p) => ({
    id: `payment:${p.id}`,
    source: "PAYMENT",
    occurredAt: p.occurredAt,
    title: "Đã thu tiền",
    amount: p.amount,
    currency: p.currency,
    detail: codeById.has(p.matterId) ? `Dự án ${codeById.get(p.matterId)}` : undefined,
    href: codeById.has(p.matterId) ? `/matters/${p.matterId}` : undefined
  }));
}

function quoteEvents(rows: QuoteRow[]): ClientTimelineEvent[] {
  return rows.map((q) => ({
    id: `quote:${q.id}`,
    source: "QUOTE",
    occurredAt: q.issuedAt ?? q.createdAt,
    title: `Báo giá ${q.code}`,
    detail: q.title,
    amount: q.total,
    currency: q.currency,
    href: `/quotes/${q.id}`
  }));
}

function contractEvents(rows: ContractRow[]): ClientTimelineEvent[] {
  return rows.map((c) => ({
    id: `contract:${c.id}`,
    source: "CONTRACT",
    occurredAt: c.signedAt ?? c.createdAt,
    title: `Hợp đồng ${c.code}`,
    detail: c.title,
    amount: c.amount,
    currency: c.currency,
    href: `/contracts/${c.id}`
  }));
}

/** Gộp mọi nguồn, sắp xếp mới nhất trước, giới hạn số dòng. */
export function buildClientTimeline(input: ClientTimelineInput): ClientTimelineEvent[] {
  const codeById = matterCodeMap(input.matters);
  return [
    ...intakeEvents(input.intakes),
    ...matterEvents(input.matters),
    ...noteEvents(input.notes, codeById),
    ...paymentEvents(input.payments, codeById),
    ...quoteEvents(input.quotes),
    ...contractEvents(input.contracts)
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, CLIENT_TIMELINE_LIMIT);
}
