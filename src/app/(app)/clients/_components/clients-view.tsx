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

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search, Users, X } from "lucide-react";
import type { Client, ClientType, Contact } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ClientSheet } from "./client-sheet";
import { ClientsTable } from "./clients-table";

type ClientRow = Client & {
  contacts: Contact[];
  _count: { matters: number; intakes: number };
};

type Props = {
  initialData: {
    items: ClientRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  initialFilters: {
    search: string;
    type: ClientType | "ALL";
  };
};

export function ClientsView({ initialData, initialFilters }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilters.search);
  const [type, setType] = useState<ClientType | "ALL">(initialFilters.type);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);

  const updateUrl = useCallback(
    (next: { search?: string; type?: string }) => {
      const params = new URLSearchParams();
      const s = next.search ?? search;
      const t = next.type ?? type;
      if (s) params.set("search", s);
      if (t && t !== "ALL") params.set("type", t);
      startTransition(() => {
        router.replace(`/clients${params.toString() ? `?${params.toString()}` : ""}`);
      });
    },
    [router, search, type]
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ search });
  }

  function clearFilters() {
    setSearch("");
    setType("ALL");
    startTransition(() => router.replace("/clients"));
  }

  function handleNew() {
    setEditingClient(null);
    setSheetOpen(true);
  }

  function handleEdit(client: ClientRow) {
    setEditingClient(client);
    setSheetOpen(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <header className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-medium tracking-tight">客户管理</h1>
            <p className="text-[13px] text-muted-foreground">
              共 <span className="font-mono tabular text-foreground">{initialData.total}</span> 位客户
            </p>
          </div>
          <Button onClick={handleNew} className="h-9 gap-1.5 px-4 shadow-sm">
            <Plus className="h-4 w-4" strokeWidth={2} />
            新建客户
          </Button>
        </div>
        <div className="ll-rule" />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative min-w-0 sm:min-w-64 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.8}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => updateUrl({ search })}
            placeholder="搜索客户名称 / 身份证号 / 电话 / 邮箱"
            className="h-9 border-border bg-card pl-9"
          />
        </form>

        <Select
          value={type}
          onValueChange={(v) => {
            const next = v as ClientType | "ALL";
            setType(next);
            updateUrl({ type: next });
          }}
        >
          <SelectTrigger
            className="h-9 w-36 border-border bg-card"
          >
            <SelectValue placeholder="客户类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部类型</SelectItem>
            <SelectItem value="INDIVIDUAL">自然人</SelectItem>
            <SelectItem value="COMPANY">公司</SelectItem>
            <SelectItem value="ORGANIZATION">其他组织</SelectItem>
          </SelectContent>
        </Select>

        {(search || type !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3.5 w-3.5" />
            清除筛选
          </Button>
        )}
      </div>

      {/* 列表 */}
      <ClientsTable items={initialData.items} onEdit={handleEdit} />

      {/* 抽屉 */}
      <ClientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingClient={editingClient}
      />
    </motion.div>
  );
}
