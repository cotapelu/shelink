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

import { useState, useEffect, useMemo, useTransition } from "react";
import { ChevronRight, ChevronsUpDown, Loader2, X } from "lucide-react";
import type { MatterCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { searchCauses, type CauseSearchResult } from "@/server/causes/actions";
import { cn } from "@/lib/utils";

type Node = CauseSearchResult;

type Props = {
  value: string;
  onChange: (id: string, name: string) => void;
  category: MatterCategory;
  disabled?: boolean;
};

/**
 * Bộ chọn nguyên nhân cấp dẫn
 * - Kéo toàn bộ nguyên nhân của category một lần
 * - Bỏ cấp 1, cấp dẫn từ cấp 2: cấp 2 / cấp 3 / cấp 4, mở dần (chọn xong cấp trước mới hiện cột sau)
 * - Bấm đơn là chọn: có cấp con → mở cột sau; không có cấp con (lá) → chọn thẳng. Hai lần bấm là chọn được nguyên nhân cấp 3 thông dụng.
 * - Thu hẹp bề rộng cột, lớp bật lên theo số cột tăng, tránh mở ra là phủ kín trang
 * - Tên quá dài thì cắt, hover hiện tên đầy đủ
 */
export function CauseCombobox({ value, onChange, category, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedName, setSelectedName] = useState<string>("");

  const [pickedL2, setPickedL2] = useState<string | null>(null);
  const [pickedL3, setPickedL3] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState<string>("");

  // Khi mở thì kéo toàn bộ
  function handleOpen(o: boolean) {
    setOpen(o);
    if (o && allNodes.length === 0) {
      startTransition(async () => {
        const data = await searchCauses({ category, limit: 2000 });
        setAllNodes(data);
      });
    }
    if (o) {
      // Reset trạng thái picked (tránh sót lại lần trước)
      setPickedL2(null);
      setPickedL3(null);
      setSearchInput("");
    }
  }

  // Khi category đổi thì reset
  useEffect(() => {
    setAllNodes([]);
    if (value) {
      onChange("", "");
      setSelectedName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Đồng bộ hiển thị tên đã chọn / đường dẫn l2
  useEffect(() => {
    if (value && allNodes.length > 0) {
      const found = allNodes.find((o) => o.id === value);
      if (found) {
        setSelectedName(found.name);
      }
    }
  }, [value, allNodes]);

  // Bỏ cấp 1: cấp 2 trải phẳng thành cột đầu
  const l2Nodes = useMemo(() => allNodes.filter((n) => n.level === 2), [allNodes]);
  const l3Nodes = useMemo(
    () => (pickedL2 ? allNodes.filter((n) => n.level === 3 && n.parentId === pickedL2) : []),
    [allNodes, pickedL2]
  );
  const l4Nodes = useMemo(
    () => (pickedL3 ? allNodes.filter((n) => n.level === 4 && n.parentId === pickedL3) : []),
    [allNodes, pickedL3]
  );

  // Lọc tìm kiếm (mờ xuyên cấp)
  const searchMatched = useMemo(() => {
    const q = searchInput.trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    return allNodes
      .filter((n) => n.level >= 3 && n.name.toLowerCase().includes(lower))
      .slice(0, 60);
  }, [allNodes, searchInput]);

  function hasChildren(n: Node) {
    return allNodes.some((x) => x.parentId === n.id);
  }

  // Chọn một nguyên nhân: mọi cấp đều chọn trực tiếp được.
  // Có cấp con → chọn đồng thời mở cột sau (có thể xuống sâu tiếp, hoặc dừng ở đây); lá → chọn và đóng.
  function selectNode(node: Node, level: number) {
    onChange(node.id, node.name);
    setSelectedName(node.name);
    if (hasChildren(node)) {
      if (level === 2) {
        setPickedL2(node.id);
        setPickedL3(null);
      } else if (level === 3) {
        setPickedL3(node.id);
      }
    } else {
      setOpen(false);
    }
  }

  // Kết quả tìm kiếm chọn thẳng và đóng
  function pickNode(node: Node) {
    onChange(node.id, node.name);
    setSelectedName(node.name);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between rounded-sm font-normal"
        >
          {value && selectedName ? (
            <span className="truncate">{selectedName}</span>
          ) : (
            <span className="text-muted-foreground">Bấm để chọn</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        avoidCollisions={false}
        portalled={false}
        className="w-auto max-w-[92vw] p-0"
      >
        {/* Thanh tìm kiếm */}
        <div className="border-b border-border p-2">
          <div className="relative w-[240px]">
            <Input
              placeholder="Tìm nguyên nhân, hoặc duyệt theo cấp bên dưới"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 pr-7 text-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {isPending ? (
          <div className="flex w-[240px] items-center justify-center py-10 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="ml-2">Đang tải kho nguyên nhân...</span>
          </div>
        ) : searchMatched ? (
          // Chế độ tìm: kết quả phẳng kèm đường dẫn
          <div className="max-h-[360px] w-[320px] overflow-y-auto p-1">
            {searchMatched.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Không tìm thấy kết quả khớp</p>
            ) : (
              searchMatched.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => pickNode(n)}
                  title={n.name}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12.5px] hover:bg-muted/60"
                >
                  <span className="truncate">{n.name}</span>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground">
                    {n.l2Name ?? ""}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          // Chế độ cấp dẫn: mở dần (chọn xong cấp trước mới hiện cột sau)
          // Bấm đơn bất kỳ cấp nào là chọn; có cấp con thì đồng thời mở cột sau, có thể xuống sâu tiếp hoặc dừng
          <div className="flex divide-x divide-border">
            <Column
              title="Cấp 2"
              items={l2Nodes}
              activeId={pickedL2}
              hasChildren={hasChildren}
              onPick={(n) => selectNode(n, 2)}
            />
            {pickedL2 && (
              <Column
                title="Cấp 3"
                items={l3Nodes}
                activeId={pickedL3}
                empty="Cấp 2 này không có cấp 3"
                hasChildren={hasChildren}
                onPick={(n) => selectNode(n, 3)}
              />
            )}
            {pickedL3 && l4Nodes.length > 0 && (
              <Column
                title="Cấp 4"
                items={l4Nodes}
                activeId={null}
                hasChildren={() => false}
                onPick={(n) => selectNode(n, 4)}
              />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Column({
  title,
  items,
  activeId,
  empty = "—",
  hasChildren,
  onPick
}: {
  title: string;
  items: Node[];
  activeId: string | null;
  empty?: string;
  hasChildren: (n: Node) => boolean;
  onPick: (n: Node) => void;
}) {
  return (
    <div className="flex max-h-[360px] w-[176px] flex-col">
      <div className="border-b border-border bg-muted/30 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-muted-foreground/60">{empty}</p>
        ) : (
          items.map((n) => {
            const branching = hasChildren(n);
            const isActive = activeId === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onPick(n)}
                title={n.name}
                className={cn(
                  "flex w-full items-center justify-between gap-1 rounded px-2 py-1.5 text-left text-[12.5px] transition-colors",
                  isActive ? "bg-primary/15 text-primary" : "hover:bg-muted/60"
                )}
              >
                <span className="truncate">{n.name}</span>
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0 text-muted-foreground/50",
                    isActive && "text-primary",
                    !branching && "invisible"
                  )}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
