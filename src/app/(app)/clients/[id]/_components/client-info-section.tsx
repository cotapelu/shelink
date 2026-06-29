import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  Briefcase
} from "lucide-react";
import {
  clientTypeLabel,
  cooperationStatusLabel,
  genderLabel
} from "@/lib/enums";
import type { Client } from "@prisma/client";

const COOP_TONE: Record<string, string> = {
  POTENTIAL: "bg-amber-100 text-amber-800",
  NEGOTIATING: "bg-sky-100 text-sky-800",
  SIGNED: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-muted text-muted-foreground"
};

const yuan = (n: number) => `¥${n.toLocaleString()}`;
const dash = <span className="text-muted-foreground/50">—</span>;

export function ClientInfoSection({
  client,
  finance
}: {
  client: Client;
  finance: {
    receivable: number;
    received: number;
    outstanding: number;
  };
}) {
  const isIndividual = client.type === "INDIVIDUAL";
  const TypeIcon = isIndividual ? User : client.type === "COMPANY" ? Building2 : Briefcase;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <TypeIcon className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">{client.name}</h1>
          <Badge variant="secondary" className="text-[10px]">
            {clientTypeLabel[client.type]}
          </Badge>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              COOP_TONE[client.cooperationStatus] ?? "bg-muted text-muted-foreground"
            )}
          >
            {cooperationStatusLabel[client.cooperationStatus]}
          </span>
        </div>
        {/* Action buttons like edit, etc. can be passed via children or separate */}
      </header>

      {/* Thông tin cơ bản */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-[11px] text-muted-foreground">性别</div>
          <div className="mt-0.5 text-sm">
            {client.gender ? genderLabel[client.gender] : dash}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">证件号</div>
          <div className="mt-0.5 font-mono text-sm">
            {client.idNumber ?? dash}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">联系电话</div>
          <div className="mt-0.5 text-sm">{client.phone ?? dash}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">邮箱</div>
          <div className="mt-0.5 text-sm break-all">{client.email ?? dash}</div>
        </div>
        <div className="lg:col-span-2">
          <div className="text-[11px] text-muted-foreground">地址</div>
          <div className="mt-0.5 text-sm">{client.address ?? dash}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">来源</div>
          <div className="mt-0.5 text-sm">{client.source ?? dash}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">行业</div>
          <div className="mt-0.5 text-sm">{client.industry ?? dash}</div>
        </div>
      </div>

      {/* Finance quick stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3">
        <div>
          <div className="text-[11px] text-muted-foreground">应收总额</div>
          <div className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
            {yuan(finance.receivable)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">已收总额</div>
          <div className="mt-1 text-sm font-semibold text-green-600 dark:text-green-400">
            {yuan(finance.received)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">未收余额</div>
          <div className="mt-1 text-sm font-semibold text-rose-600 dark:text-rose-400">
            {yuan(finance.outstanding)}
          </div>
        </div>
      </div>
    </section>
  );
}
