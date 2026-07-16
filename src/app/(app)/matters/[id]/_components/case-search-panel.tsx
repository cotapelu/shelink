"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { MatterCategory } from "@prisma/client";
import { CaseSearchTabs } from "./case-search-tabs";
import { KeywordSearchForm } from "./keyword-search-form";
import { SearchResultsTable } from "./search-results-table";
import { searchSimilarCases, type CaseSearchHit } from "@/server/yuandian/cases";
import { saveCaseToMatter } from "@/server/yuandian/save-case";

type Props = {
  matterId: string;
  matterCategory: MatterCategory;
  defaultCauseName: string | null;
};

type SearchMode = "keyword" | "vector";

export function CaseSearchPanel({ matterId, matterCategory, defaultCauseName }: Props) {
  const [mode, setMode] = useState<SearchMode>("keyword");
  const [causeInput, setCauseInput] = useState(defaultCauseName ?? "");
  const [qw, setQw] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [wszl, setWszl] = useState<Array<"判决书" | "裁定书" | "调解书" | "决定书">>(["判决书"]);
  const [jaStart, setJaStart] = useState("");
  const [jaEnd, setJaEnd] = useState("");

  const [pending, startTransition] = useTransition();
  const [keywordResult, setKeywordResult] = useState<{ total: number; items: CaseSearchHit[]; pointsCharged: number } | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [topK, setTopK] = useState(10);

  function runSearch() {
    startTransition(async () => {
      try {
        const res = await searchSimilarCases({
          matterId,
          ay: causeInput ? [causeInput] : undefined,
          qw: qw || undefined,
          xzqh_p: provinces.length ? provinces : undefined,
          wszl: wszl as any,
          ja_start: jaStart || undefined,
          ja_end: jaEnd || undefined,
          top_k: topK
        });
        setKeywordResult(res);
        toast.success(`检索完成，命中 ${res.total} 条`);
      } catch (err) {
        toast.error("检索失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handleSaveCase(caseHit: CaseSearchHit) {
    startTransition(async () => {
      try {
        await saveCaseToMatter({ matterId, caseHit });
        setSavedIds(p => new Set([...p, caseHit.id]));
        toast.success("已保存关联案例");
      } catch (err) {
        toast.error("保存失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <CaseSearchTabs mode={mode} onModeChange={setMode} />
      {mode === "keyword" && (
        <KeywordSearchForm
          causeInput={causeInput}
          qw={qw}
          provinces={provinces}
          wszl={wszl}
          jaStart={jaStart}
          jaEnd={jaEnd}
          onCauseChange={setCauseInput}
          onQwChange={setQw}
          onProvincesChange={setProvinces}
          onWszlChange={setWszl}
          onJaStartChange={setJaStart}
          onJaEndChange={setJaEnd}
          onSearch={runSearch}
        />
      )}
      {mode === "vector" && (
        <div className="rounded-lg border p-4">
          <p>向量检索（开发中）</p>
        </div>
      )}
      {keywordResult && (
        <SearchResultsTable
          keywordResults={keywordResult}
          vectorResults={null}
          onSaveCase={handleSaveCase}
          savedIds={savedIds}
        />
      )}
    </div>
  );
}
