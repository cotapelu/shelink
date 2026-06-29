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
import { getSession } from "@/lib/auth/session";
import {
  listAllFeeEntries,
  getMonthlyRevenue,
  getPersonalRevenue
} from "@/server/finance/actions";
import { listInvoiceRequests, getInvoiceStats } from "@/server/invoices/actions";
import { FinanceView } from "./_components/finance-view";

export default async function FinancePage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [entries, monthly, personal, invoiceRequests, invoiceStats] = await Promise.all([
    listAllFeeEntries({ limit: 200 }),
    getMonthlyRevenue(6),
    getPersonalRevenue(userId),
    listInvoiceRequests(),
    getInvoiceStats()
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const yearStart = new Date(monthStart.getFullYear(), 0, 1);

  const monthlyReceived = entries
    .filter((e) => e.type === "RECEIVED" && new Date(e.occurredAt) >= monthStart)
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const monthlyReceivable = entries
    .filter((e) => e.type === "RECEIVABLE" && new Date(e.occurredAt) >= monthStart)
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const yearlyReceived = entries
    .filter((e) => e.type === "RECEIVED" && new Date(e.occurredAt) >= yearStart)
    .reduce((acc, e) => acc + Number(e.amount), 0);

  return (
    <FinanceView
      entries={entries}
      monthly={monthly}
      stats={{
        monthlyReceived,
        monthlyReceivable,
        yearlyReceived,
        personalMonthly: personal.monthlyCommission,
        personalYearly: personal.yearlyCommission,
        monthlyIssued: invoiceStats.monthlyIssued,
        pendingInvoiceCount: invoiceStats.pendingCount
      }}
      invoiceRequests={invoiceRequests}
      canApproveInvoice={
        session!.user.role === "FINANCE" ||
        session!.user.role === "ADMIN" ||
        session!.user.role === "PRINCIPAL_LAWYER"
      }
    />
  );
}
