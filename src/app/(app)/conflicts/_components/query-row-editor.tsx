"use client";

import { Button } from "@/components/ui/button";
import { QueryRowFields } from "./query-row-fields";
import type { QueryRole, QueryRow } from "./conflict-query-types";

interface QueryRowEditorProps {
  query: QueryRow;
  index: number;
  onUpdate: (index: number, patch: Partial<QueryRow>) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}

export function QueryRowEditor({ query, index, onUpdate, onRemove, showRemove }: QueryRowEditorProps) {
  return (
    <div className="grid grid-cols-12 gap-2 rounded-lg border border-border bg-background p-3">
      <QueryRowFields query={query} index={index} onUpdate={(i, p) => onUpdate(i, p as Partial<QueryRow>)} />
      <div className="col-span-1 flex items-end justify-center">
        {showRemove && (
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)} className="h-9 w-9 p-0 text-destructive" aria-label="移除">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

import { Trash2 } from "lucide-react";
