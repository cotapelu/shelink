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
      toast.warning("请至少填写一个姓名或证件号");
      return;
    }
    startTransition(async () => {
      try {
        const res = await runCheckAndSave({ queries: cleaned });
        setResults(res.hits);
        setHasRun(true);
        toast.success(`检索完成，命中 ${res.hits.length} 条`);
      } catch (err) {
        toast.error("检索失败", { description: err instanceof Error ? err.message : "" });
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
