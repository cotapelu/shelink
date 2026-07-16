"use client";

import { useState } from "react";
import { AuditFilters } from "./audit-filters";
import { AuditTable } from "./audit-table";
import { AuditHeader } from "./audit-header";
import { AuditPagination } from "./audit-pagination";
import type { AuditListResult, AuditFilter } from "@/server/audit-list";

type Options = {
  actions: string[];
  targetTypes: string[];
  users: { id: string; name: string }[];
};

interface AuditViewProps {
  result: AuditListResult;
  options: Options;
  currentFilter: AuditFilter;
}

export function AuditView({ result, options, currentFilter }: AuditViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function navigate(patch: Record<string, string | undefined>) {
    // Use client-side navigation; actual implementation moves to AuditFilters/AuditTable via callbacks
  }

  return (
    <div className="space-y-4">
      <AuditHeader />
      <AuditFilters options={options} currentFilter={currentFilter} onNavigate={navigate} />
      <AuditTable
        result={result}
        expanded={expanded}
        onToggleExpand={toggleExpand}
        onNextPage={() => {}}
      />
      <AuditPagination result={result} />
    </div>
  );
}
