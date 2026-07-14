"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PageCountCopiesProps {
  pageCount: number;
  setPageCount: (v: number) => void;
  copies: number;
  setCopies: (v: number) => void;
}

export function PageCountCopies({
  pageCount,
  setPageCount,
  copies,
  setCopies
}: PageCountCopiesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Label className="text-[11px]">页数</Label>
        <Input
          type="number"
          min={1}
          value={pageCount}
          onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-[11px]">份数</Label>
        <Input
          type="number"
          min={1}
          value={copies}
          onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
          className="mt-1"
        />
      </div>
    </div>
  );
}
