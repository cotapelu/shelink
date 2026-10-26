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
import { Inbox, Briefcase, MessageCircle, Wallet, FileText, FileSignature } from "lucide-react";
import type { ComponentType } from "react";
import type { ClientTimelineEvent } from "@/server/clients/timeline";
import { formatCurrency } from "@/lib/utils";

const SOURCE_META: Record<ClientTimelineEvent["source"], { icon: ComponentType<{ className?: string }>; tone: string }> = {
  INTAKE: { icon: Inbox, tone: "bg-sky-500/15 text-sky-300" },
  MATTER: { icon: Briefcase, tone: "bg-indigo-500/15 text-indigo-300" },
  NOTE: { icon: MessageCircle, tone: "bg-emerald-500/15 text-emerald-300" },
  PAYMENT: { icon: Wallet, tone: "bg-amber-500/15 text-amber-300" },
  QUOTE: { icon: FileText, tone: "bg-blue-500/15 text-blue-300" },
  CONTRACT: { icon: FileSignature, tone: "bg-violet-500/15 text-violet-300" }
};

function fmtDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

function TimelineItem({ event }: { event: ClientTimelineEvent }) {
  const { icon: Icon, tone } = SOURCE_META[event.source];
  const body = (
    <>
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-foreground">{event.title}</span>
        {event.detail ? (
          <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{event.detail}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-right">
        {typeof event.amount === "number" ? (
          <span className="block font-mono text-[12px] tabular-nums text-foreground">
            {formatCurrency(event.amount)} {event.currency ?? "VND"}
          </span>
        ) : null}
        <span className="block text-[11px] text-muted-foreground">{fmtDate(event.occurredAt)}</span>
      </span>
    </>
  );

  const shell = event.href
    ? `flex w-full items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-popover${" focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"}`
    : "flex w-full items-start gap-3 rounded-lg px-2 py-2";

  return event.href ? (
    <li>
      <Link href={event.href} className={shell}>
        {body}
      </Link>
    </li>
  ) : (
    <li className={shell}>{body}</li>
  );
}

export function TimelineSection({ events }: { events: ClientTimelineEvent[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">Lịch sử tương tác</h2>
      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chưa có tương tác</p>
      ) : (
        <ol className="relative space-y-1 border-l border-border pl-3">
          {events.map((e) => (
            <TimelineItem key={e.id} event={e} />
          ))}
        </ol>
      )}
    </section>
  );
}
