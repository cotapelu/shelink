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
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Wallet,
  Coins,
  Clock,
  FileText
} from "lucide-react";
import { getClientById, getClientFinanceSummary } from "@/server/clients/actions";
import { Badge } from "@/components/ui/badge";
import {
  clientTypeLabel,
  cooperationStatusLabel,
  genderLabel,
  matterCategoryLabel,
  matterStatusLabel
} from "@/lib/enums";
import { cn } from "@/lib/utils";
import { ClientEditButton } from "./_components/client-edit-button";
import { ClientHeader } from "./_components/client-header";
import { ClientInfoSection } from "./_components/client-info-section";
import { ContactsSection } from "./_components/contacts-section";
import { MattersSection } from "./_components/matters-section";

const billingStatusLabel: Record<string, string> = {
  DRAFT: "草稿",
  ACTIVE: "生效中",
  CLOSED: "已结"
};
const yuan = (n: number) => `¥${n.toLocaleString()}`;
const dash = <span className="text-muted-foreground/50">—</span>;

const COOP_TONE: Record<string, string> = {
  POTENTIAL: "bg-amber-100 text-amber-800",
  NEGOTIATING: "bg-sky-100 text-sky-800",
  SIGNED: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-muted text-muted-foreground"
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();
  const finance = await getClientFinanceSummary(params.id);

  const isIndividual = client.type === "INDIVIDUAL";
  const TypeIcon = isIndividual ? User : client.type === "COMPANY" ? Building2 : Briefcase;
  // 企业客户：主要联系人（contacts 已按 isPrimary desc 排序）
  const primaryContact = client.contacts[0] ?? null;

  // 按案件分组合同，关联案件与签约合同合并展示（左案件 / 右合同）
  const billingsByMatter = new Map<string, typeof finance.billings>();
  for (const b of finance.billings) {
    const arr = billingsByMatter.get(b.matter.id) ?? [];
    arr.push(b);
    billingsByMatter.set(b.matter.id, arr);
  }

  return (
    <div className="space-y-4">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回客户列表
      </Link>

      <ClientHeader client={client} actions={<ClientEditButton client={client} />} />
      <ClientInfoSection client={client} finance={finance} />
      <ContactsSection contacts={client.contacts} />
      <MattersSection matters={client.matters} billingsMap={billingsByMatter} />
    </div>
  );
}

