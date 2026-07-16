"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { ConflictListItem, type HitResult } from "./conflict-list-item";

interface ConflictResultsProps {
  results: HitResult[] | null;
  hasRun: boolean;
}

export function ConflictResults({ results, hasRun }: ConflictResultsProps) {
  if (!hasRun) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h2 className="mb-3 text-sm font-semibold">
        检索结果{" "}
        <span className="font-mono text-xs text-muted-foreground tabular">({results?.length ?? 0})</span>
      </h2>

      {!results || results.length === 0 ? (
        <div className="rounded-md border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#4ADE80]" />
            <span>未命中任何历史客户或案件</span>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map((hit) => (
            <ConflictListItem key={hit.id} hit={hit} />
          ))}
        </ul>
      )}
    </motion.section>
  );
}
