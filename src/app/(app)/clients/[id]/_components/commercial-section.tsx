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

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { QuoteStatusBadge } from "@/app/(app)/quotes/_components/quote-status-badge";

const CONTRACT_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  REVIEW: { label: "Rà soát", className: "bg-blue-500/15 text-blue-300" },
  SIGNED: { label: "Đã ký", className: "bg-indigo-500/15 text-indigo-300" },
  ACTIVE: { label: "Hiệu lực", className: "bg-emerald-500/15 text-emerald-300" },
  EXPIRED: { label: "Hết hạn", className: "bg-orange-500/15 text-orange-300" },
  TERMINATED: { label: "Chấm dứt", className: "bg-red-500/15 text-red-300" },
  RENEWED: { label: "Đã gia hạn", className: "bg-violet-500/15 text-violet-300" }
};

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

function CommercialTable<T extends { id: string }>({
  title,
  emptyText,
  rows,
  columns,
  renderRow
}: {
  title: string;
  emptyText: string;
  rows: T[];
  columns: string[];
  renderRow: (row: T) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <h3 className="border-b border-border px-4 py-2.5 text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              {columns.map((c, i) => (
                <th key={c} className={`px-4 py-2 font-medium ${i >= 2 ? "text-right" : ""}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{rows.map((row) => renderRow(row))}</tbody>
        </table>
      )}
    </div>
  );
}

export function CommercialSection({
  quotes,
  contracts
}: {
  quotes: Parameters<typeof QuoteRow>[0][];
  contracts: Parameters<typeof ContractRow>[0][];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <CommercialTable
        title="Báo giá"
        emptyText="Chưa có báo giá"
        rows={quotes}
        columns={["Mã", "Tiêu đề", "Trạng thái", "Tổng tiền", "Hết hạn"]}
        renderRow={(q) => <QuoteRow key={q.id} {...q} />}
      />
      <CommercialTable
        title="Hợp đồng"
        emptyText="Chưa có hợp đồng"
        rows={contracts}
        columns={["Mã", "Tiêu đề", "Trạng thái", "Giá trị", "Hết hạn"]}
        renderRow={(c) => <ContractRow key={c.id} {...c} />}
      />
    </div>
  );
}

type QuoteRowProps = {
  id: string;
  code: string;
  title: string;
  status: string;
  total: number;
  currency: string;
  expiresAt: Date | string | null;
};

function QuoteRow({ id, code, title, status, total, currency, expiresAt }: QuoteRowProps) {
  return (
    <tr className="transition-colors hover:bg-popover">
      <td className="px-4 py-2.5">
        <Link href={`/quotes/${id}`} className="font-mono text-[12px] text-primary hover:underline">
          {code}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-[13px] text-foreground">
        <Link href={`/quotes/${id}`} className="hover:text-primary">
          {title}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-right">
        <QuoteStatusBadge status={status} />
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
        {formatCurrency(total)} {currency}
      </td>
      <td className="px-4 py-2.5 text-right text-[12px] text-muted-foreground">{fmtDate(expiresAt)}</td>
    </tr>
  );
}

type ContractRowProps = {
  id: string;
  code: string;
  title: string;
  status: string;
  amount: number;
  currency: string;
  expiresAt: Date | string | null;
};

function ContractRow({ id, code, title, status, amount, currency, expiresAt }: ContractRowProps) {
  const meta = CONTRACT_STATUS[status] ?? { label: status, className: "bg-muted" };
  return (
    <tr className="transition-colors hover:bg-popover">
      <td className="px-4 py-2.5">
        <Link href={`/contracts/${id}`} className="font-mono text-[12px] text-primary hover:underline">
          {code}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-[13px] text-foreground">
        <Link href={`/contracts/${id}`} className="hover:text-primary">
          {title}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-right">
        <Badge className={meta.className}>{meta.label}</Badge>
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
        {formatCurrency(amount)} {currency}
      </td>
      <td className="px-4 py-2.5 text-right text-[12px] text-muted-foreground">{fmtDate(expiresAt)}</td>
    </tr>
  );
}
