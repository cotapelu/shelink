"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { runCheckAndSave } from "@/server/conflicts/actions";
import { ConflictSearchBar } from "./conflict-search-bar";
import { ConflictResults } from "./conflict-results";
import { ConflictsHeader } from "./conflicts-header";
import type { QueryRow } from "./conflict-query-types";
import type { HitResult } from "./conflict-list-item";

export function ConflictsView() {
  const [isPending, startTransition] = useTransition();
  const [queries, setQueries] = useState<QueryRow[]>([{ role: "CLIENT_PARTY", name: "", idNumber: "" }]);
  const [results, setResults] = useState<HitResult[] | null>(null);
  const [hasRun, setHasRun] = useState(false);

  function handleRun() {
    const cleaned = queries
      .map(q => ({ role: q.role, name: q.name.trim(), idNumber: q.idNumber.trim() }))
      .filter(q => q.name || q.idNumber);
    if (cleaned.length === 0) {
      toast.warning("Hãy điền ít nhất một họ tên hoặc số giấy tờ");
      return;
    }
    startTransition(async () => {
      try {
        const res = await runCheckAndSave({ queries: cleaned });
        setResults(res.hits);
        setHasRun(true);
        toast.success(`Tra xong, khớp ${res.hits.length} mục`);
      } catch (err) {
        toast.error("Tra thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      <ConflictsHeader />
      <ConflictSearchBar queries={queries} onQueriesChange={setQueries} onRun={handleRun} isPending={isPending} />
      <ConflictResults results={results} hasRun={hasRun} />
    </motion.div>
  );
}
