"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Matter, Billing } from "@prisma/client";
import { MattersTable } from "./matters-table";

interface MattersSectionProps {
  matters: Matter[];
  billingsMap: Map<string, Billing[]>;
}


function renderEmpty() {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">Vụ án liên quan</h2>
      <p className="text-sm text-muted-foreground">Chưa có vụ án liên quan</p>
    </section>
  );
}

export function MattersSection({ matters, billingsMap }: MattersSectionProps) {
  if (matters.length === 0) {
    return renderEmpty();
  }
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">Vụ án liên quan</h2>
      <MattersTable matters={matters} billingsMap={billingsMap} />
    </section>
  );
}
