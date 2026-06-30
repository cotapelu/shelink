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
  ArrowLeft
} from "lucide-react";
import { getClientById, getClientFinanceSummary } from "@/server/clients/actions";



import { ClientEditButton } from "./_components/client-edit-button";
import { ClientHeader } from "./_components/client-header";
import { ClientInfoSection } from "./_components/client-info-section";
import { ContactsSection } from "./_components/contacts-section";
import { MattersSection } from "./_components/matters-section";







export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();
  const finance = await getClientFinanceSummary(params.id);

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

