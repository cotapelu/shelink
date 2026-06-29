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

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { Check, Plus, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { ClientOption } from "@/app/(app)/matters/_components/matters-view";
import { searchEnterpriseCandidates, type EnterpriseSearchItem } from "@/server/yuandian/enterprise";

type YuandianCandidate = EnterpriseSearchItem;

export function ClientCombobox({
  clientId,
  clientName,
  clientType,
  options,
  onPickExisting,
  onTypeNew,
  onPickYuandian,
  onClear,
  triggerClassName
}: {
  clientId: string;
  clientName: string;
  clientType: string;
  options: ClientOption[];
  onPickExisting: (id: string, name: string) => void;
  onTypeNew: (name: string) => void;
  onPickYuandian: (candidate: YuandianCandidate) => void;
  onClear: () => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [yuandianResults, setYuandianResults] = useState<YuandianCandidate[]>([]);
  const [yuandianLoading, setYuandianLoading] = useState(false);
  const [yuandianConfigured, setYuandianConfigured] = useState(true);
  const [, startTransition] = useTransition();
  const searchVersionRef = useRef(0);

  const display = clientId
    ? options.find((o) => o.id === clientId)?.name ?? clientName ?? ""
    : clientName;

  const filtered = options
    .filter((o) => !query || o.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 20);

  const hasExactMatch = filtered.some(
    (o) => o.name.toLowerCase() === query.trim().toLowerCase()
  );

  const searchYuandian = useCallback((q: string, version: number) => {
    startTransition(async () => {
      try {
        const res = await searchEnterpriseCandidates(q);
        if (version !== searchVersionRef.current) return;
        setYuandianConfigured(res.configured);
        setYuandianResults(res.items);
      } catch {
        if (version !== searchVersionRef.current) return;
        setYuandianResults([]);
      } finally {
        if (version === searchVersionRef.current) {
          setYuandianLoading(false);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setYuandianResults([]);
      setYuandianLoading(false);
      return;
    }
  }, [open]);

  useEffect(() => {
    const isCompany = clientType === "COMPANY" || clientType === "ORGANIZATION";
    if (!isCompany || !open || query.trim().length < 2 || !yuandianConfigured) {
      setYuandianResults([]);
      setYuandianLoading(false);
      return;
    }

    setYuandianLoading(true);
    const version = ++searchVersionRef.current;
    const timer = setTimeout(() => searchYuandian(query.trim(), version), 300);
    return () => {
      clearTimeout(timer);
      // bump version so in-flight response is ignored
      searchVersionRef.current = version + 1;
    };
  }, [query, clientType, open, yuandianConfigured, searchYuandian]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between font-normal",
            triggerClassName,
            !display && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-1.5 truncate text-xs">
            {display || "搜索或直接输入名称"}
            {!clientId && clientName && (
              <span className="ml-1 rounded-sm bg-primary/10 px-1 text-[10px] text-primary/80">
                新客户
              </span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        portalled={false}
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="输入姓名 / 公司名"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.trim() && !hasExactMatch && (
              <CommandGroup heading="作为新客户使用">
                <CommandItem
                  value={`__new__${query}`}
                  onSelect={() => {
                    onTypeNew(query.trim());
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>
                    新建 <span className="text-primary">{query.trim()}</span> 为委托方
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {filtered.length > 0 && (
              <CommandGroup heading="已有客户">
                {filtered.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => {
                      onPickExisting(o.id, o.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        clientId === o.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {o.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {(yuandianLoading || yuandianResults.length > 0) && yuandianConfigured && (
              <CommandGroup heading="企业信息库（元典）">
                {yuandianLoading && yuandianResults.length === 0 && (
                  <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    搜索中…
                  </div>
                )}
                {yuandianResults.map((c) => (
                  <CommandItem
                    key={`yd-${c.id}`}
                    value={`yd-${c.name}`}
                    onSelect={() => {
                      onPickYuandian(c);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span className="truncate">{c.name}</span>
                    {c.creditCode && (
                      <span className="ml-auto shrink-0 text-[10px] font-mono text-muted-foreground">
                        {c.creditCode}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!query && filtered.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                开始输入以搜索 / 新建
              </div>
            )}

            {display && (
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onClear();
                    setOpen(false);
                  }}
                  className="text-xs text-muted-foreground"
                >
                  清除选择
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
