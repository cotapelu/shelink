"use client";

import { Button } from "@/components/ui/button";
import { QueryRowEditor } from "./query-row-editor";
import { Plus } from "lucide-react";
import type { QueryRow } from "./conflict-query-types";

interface ConflictSearchBarProps {
  queries: QueryRow[];
  onQueriesChange: (queries: QueryRow[]) => void;
  onRun: () => void;
  isPending: boolean;
}

export function ConflictSearchBar({
  queries,
  onQueriesChange,
  onRun,
  isPending
}: ConflictSearchBarProps) {
  function addQuery() {
    onQueriesChange([...queries, { role: "CLIENT_PARTY", name: "", idNumber: "" }]);
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">检索项</h2>
        <Button variant="outline" size="sm" onClick={addQuery} className="h-7 gap-1">
          <Plus className="h-3.5 w-3.5" />
          添加检索项
        </Button>
      </div>

      <div className="space-y-2">
        {queries.map((q, idx) => (
          <QueryRowEditor
            key={idx}
            query={q}
            index={idx}
            onUpdate={(i, patch) =>
              onQueriesChange(
                queries.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
              )
            }
            onRemove={(i) => onQueriesChange(queries.filter((_, idx) => idx !== i))}
            showRemove={queries.length > 1}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={onRun} disabled={isPending} className="gap-1.5">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          开始检索
        </Button>
      </div>
    </section>
  );
}

import { Loader2, Search } from "lucide-react";
