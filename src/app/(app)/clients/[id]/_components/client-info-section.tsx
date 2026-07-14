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


// Extracted components (refactor Cycle 4)

function renderHeader({ client, TypeIcon }: { client: Client; TypeIcon: any }) {
  return (
    <header className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <TypeIcon className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">{client.name}</h1>
        <Badge variant="secondary" className="text-[10px]">{clientTypeLabel[client.type]}</Badge>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            COOP_TONE[client.cooperationStatus] ?? "bg-muted text-muted-foreground"
          )}
        >
          {cooperationStatusLabel[client.cooperationStatus]}
        </span>
      </div>
    </header>
  );
}

function renderInfoGrid({ client, dash }: { client: Client; dash: any }) {
  const info = [
    { label: "Giới tính", value: client.gender ? genderLabel[client.gender] : dash },
    { label: "Số giấy tờ", value: client.idNumber ?? dash },
    { label: "Điện thoại", value: client.phone ?? dash },
    { label: "Email", value: client.email ?? dash },
    { label: "Địa chỉ", value: client.address ?? dash, span: 2 },
    { label: "Nguồn", value: client.source ?? dash },
    { label: "Ngành nghề", value: client.industry ?? dash },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {info.map((item, idx) => (
        <div key={item.label} className={idx === 4 ? "lg:col-span-2" : undefined}>
          <div className="text-[11px] text-muted-foreground">{item.label}</div>
          <div className="mt-0.5 text-sm">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function renderFinanceStats({ finance }: { finance: { receivable: number; received: number; outstanding: number } }) {
  const stats = [
    { label: "Tổng phải thu", value: finance.receivable, className: "text-blue-600 dark:text-blue-400" },
    { label: "Tổng đã thu", value: finance.received, className: "text-green-600 dark:text-green-400" },
    { label: "Còn lại", value: finance.outstanding, className: "text-rose-600 dark:text-rose-400" },
  ];
  return (
    <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3">
      {stats.map(stat => (
        <div key={stat.label}>
          <div className="text-[11px] text-muted-foreground">{stat.label}</div>
          <div className={cn("mt-1 text-sm font-semibold", stat.className)}>{yuan(stat.value)}</div>
        </div>
      ))}
    </div>
  );
}

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
      {renderHeader({ client, TypeIcon })}
      {renderInfoGrid({ client, dash })}
      {renderFinanceStats({ finance })}
    </section>
  );
}
