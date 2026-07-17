"use client";

import { BookUser } from "lucide-react";
import { ColleagueList } from "./colleague-list";
import type { ColleagueItem } from "./contacts-types";

interface ColleagueSectionProps {
  colleagues: ColleagueItem[];
}

export function ColleagueSection({ colleagues }: ColleagueSectionProps) {
  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-medium">本所同事 ({colleagues.length})</h2>
      </header>
      <ColleagueList colleagues={colleagues} />
    </div>
  );
}
