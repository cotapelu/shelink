"use client";

import { AuditTableMainRow } from "./audit-table-main-row";
import { AuditTableDetailRow } from "./audit-table-detail-row";

interface AuditTableRowProps {
  entry: any;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
}

export function AuditTableRow({ entry, expanded, onToggleExpand }: AuditTableRowProps) {
  const hasDetail = entry.detail !== null && entry.detail !== undefined;
  const isOpen = expanded.has(entry.id);

  if (!hasDetail) {
    return <AuditTableMainRow entry={entry} isOpen={false} onToggleExpand={onToggleExpand} />;
  }

  return isOpen
    ? [
        <AuditTableMainRow key={entry.id} entry={entry} isOpen={isOpen} onToggleExpand={onToggleExpand} />,
        <AuditTableDetailRow key={`${entry.id}-detail`} entryId={entry.id} detail={entry.detail} />
      ]
    : <AuditTableMainRow entry={entry} isOpen={isOpen} onToggleExpand={onToggleExpand} />;
}
