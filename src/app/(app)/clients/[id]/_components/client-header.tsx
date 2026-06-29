"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  Briefcase
} from "lucide-react";
import {
  clientTypeLabel,
  cooperationStatusLabel
} from "@/lib/enums";
import type { Client } from "@prisma/client";

const COOP_TONE: Record<string, string> = {
  POTENTIAL: "bg-amber-100 text-amber-800",
  NEGOTIATING: "bg-sky-100 text-sky-800",
  SIGNED: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-muted text-muted-foreground"
};

interface ClientHeaderProps {
  client: Client;
  actions?: React.ReactNode;
}

export function ClientHeader({ client, actions }: ClientHeaderProps) {
  const isIndividual = client.type === "INDIVIDUAL";
  const TypeIcon = isIndividual ? User : client.type === "COMPANY" ? Building2 : Briefcase;

  return (
    <div className="flex items-center justify-between gap-3">
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
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
