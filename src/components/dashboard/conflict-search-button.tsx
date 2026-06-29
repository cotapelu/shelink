/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ConflictDialog } from "@/components/conflict-dialog";
import { cn } from "@/lib/utils";

/** v0.43：工作台问候栏的「利益冲突预检」入口（原在 HeroBlock，重构后保留） */
export function ConflictSearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium",
          "border border-border bg-background text-foreground/90 transition-colors hover:bg-muted/60"
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
        利益冲突预检
      </button>
      <ConflictDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
