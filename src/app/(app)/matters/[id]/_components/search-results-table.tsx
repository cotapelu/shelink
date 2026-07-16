"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, BookmarkPlus, Check } from "lucide-react";
import type { CaseSearchHit, VectorCaseHit } from "@/server/yuandian/cases";

interface SearchResultsTableProps {
  keywordResults: { total: number; items: CaseSearchHit[]; pointsCharged: number } | null;
  vectorResults: { items: VectorCaseHit[]; pointsCharged: number } | null;
  onSaveCase: (caseHit: CaseSearchHit) => void;
  savedIds: Set<string>;
}

export function SearchResultsTable({ keywordResults, vectorResults, onSaveCase, savedIds }: SearchResultsTableProps) {
  const items = keywordResults?.items ?? vectorResults?.items ?? [];

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-normal">案号</th>
            <th className="px-3 py-2 text-left font-normal">标题</th>
            <th className="px-2 py-2 text-left font-normal w-24">法院</th>
            <th className="px-2 py-2 text-left font-normal w-20">日期</th>
            <th className="px-2 py-2 text-left font-normal w-20">相似度</th>
            <th className="px-2 py-2 text-right font-normal w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item: any) => (
            <tr key={item.id} className="hover:bg-muted/20">
              <td className="px-3 py-2 font-mono text-xs">{item.caseNo}</td>
              <td className="px-3 py-2 line-clamp-2">{item.title}</td>
              <td className="px-2 py-2 text-xs">{item.courtName}</td>
              <td className="px-2 py-2 text-xs">{item.publishDate?.slice(0, 10)}</td>
              <td className="px-2 py-2 text-xs">{item.score != null ? (item.score * 100).toFixed(1) + "%" : "—"}</td>
              <td className="px-2 py-2 text-right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/cases/${item.id}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                  </Button>
                  <Button size="sm" onClick={() => onSaveCase(item)} disabled={savedIds.has(item.id)}>
                    {savedIds.has(item.id) ? <Check className="h-3 w-3" /> : <BookmarkPlus className="h-3 w-3" />}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
