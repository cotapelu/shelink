/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  CauseRecommendation,
  CauseConfidence
} from "@/server/ai/recommend-cause";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  loading: boolean;
  candidates: CauseRecommendation[];
  errorMessage: string | null;
  onSelect: (causeId: string, causeName: string) => void;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
};

const confidenceStyle: Record<CauseConfidence, { label: string; cls: string }> = {
  HIGH: { label: "高置信", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MEDIUM: { label: "中置信", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  LOW: { label: "低置信", cls: "bg-slate-50 text-slate-600 border-slate-200" }
};

export function CauseRecommendationDialog({
  open,
  loading,
  candidates,
  errorMessage,
  onSelect,
  onOpenChange,
  onRetry
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-500" />
            AI 案由推荐
          </DialogTitle>
          <DialogDescription className="text-xs">
            基于起诉状内容生成，仅作参考，请人工核对后选用
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在分析案情
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center gap-3 py-8 text-sm">
              <p className="text-center text-rose-600">{errorMessage}</p>
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  重试
                </Button>
              )}
            </div>
          ) : candidates.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              暂无推荐
            </p>
          ) : (
            candidates.map((c) => {
              const conf = confidenceStyle[c.confidence];
              const path = [c.cause.l1Name, c.cause.l2Name].filter(Boolean).join(" / ");
              return (
                <button
                  key={c.cause.id}
                  type="button"
                  onClick={() => onSelect(c.cause.id, c.cause.name)}
                  className="flex flex-col items-start gap-1 rounded border border-border bg-background px-3 py-2.5 text-left transition hover:border-foreground/30 hover:bg-muted/30"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.cause.name}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none",
                        conf.cls
                      )}
                    >
                      {conf.label}
                    </span>
                  </div>
                  {path && (
                    <span className="text-[11px] text-muted-foreground">{path}</span>
                  )}
                  {c.reason && (
                    <span className="text-xs text-foreground/70">{c.reason}</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t border-border px-5 py-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
            不选用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
