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

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search, X } from "lucide-react";
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

function useFilterState(initial: { search: string; type: ClientType | "ALL" }) {
  const [search, setSearch] = useState(initial.search);
  const [type, setType] = useState<ClientType | "ALL">(initial.type);
  return { search, setSearch, type, setType };
}

function FilterControls({ search, type, onSearchChange, onTypeChange, onClear, updateUrl }: { search: string; type: ClientType | "ALL"; onSearchChange: (v: string) => void; onTypeChange: (v: ClientType | "ALL") => void; onClear: () => void; updateUrl: () => void; }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={(e) => { e.preventDefault(); updateUrl(); }} className="relative min-w-0 sm:min-w-64 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
        <Input value={search} onChange={e => onSearchChange(e.target.value)} onBlur={updateUrl} placeholder="Tìm kiếm theo tên / số CMND/CCCD / điện thoại / email" className="h-9 border-border bg-card pl-9" />
      </form>
      <Select value={type} onValueChange={v => onTypeChange(v as ClientType | "ALL")}>
        <SelectTrigger className="h-9 w-36 border-border bg-card">
          <SelectValue placeholder="Loại khách hàng" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả loại</SelectItem>
          <SelectItem value="INDIVIDUAL">Cá nhân</SelectItem>
          <SelectItem value="COMPANY">Công ty</SelectItem>
          <SelectItem value="ORGANIZATION">Tổ chức khác</SelectItem>
        </SelectContent>
      </Select>
      {(search || type !== "ALL") && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
          <X className="h-3.5 w-3.5" />Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}

function ClientsHeader({ total, onCreate }: { total: number; onCreate: () => void }) {
  return (
    <header className="space-y-2">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Quản lý khách hàng</h1>
          <p className="text-[13px] text-muted-foreground">Có <span className="font-mono tabular text-foreground">{total}</span> khách hàng</p>
        </div>
        <Button onClick={onCreate} className="h-9 gap-1.5 px-4 shadow-sm">
          <Plus className="h-4 w-4" strokeWidth={2} />Tạo khách hàng mới
        </Button>
      </div>
      <div className="ll-rule" />
    </header>
  );
}

type Props = {
  initialData: { items: ClientRow[]; total: number; page: number; pageSize: number };
  initialFilters: { search: string; type: ClientType | "ALL" };
};

export function ClientsView({ initialData, initialFilters }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const filter = useFilterState(initialFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);

  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.search) params.set("search", filter.search);
    if (filter.type && filter.type !== "ALL") params.set("type", filter.type);
    startTransition(() => {
      router.replace(`/clients${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }, [router, filter.search, filter.type]);

  const clearFilters = useCallback(() => {
    filter.setSearch("");
    filter.setType("ALL");
    startTransition(() => router.replace("/clients"));
  }, [router, filter]);

  const handleNew = useCallback(() => { setEditingClient(null); setSheetOpen(true); }, []);
  const handleEdit = useCallback((client: ClientRow) => { setEditingClient(client); setSheetOpen(true); }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
      <ClientsHeader total={initialData.total} onCreate={handleNew} />
      <FilterControls search={filter.search} type={filter.type} onSearchChange={filter.setSearch} onTypeChange={filter.setType} onClear={clearFilters} updateUrl={updateUrl} />
      <ClientsTable items={initialData.items} onEdit={handleEdit} />
      <ClientSheet open={sheetOpen} onOpenChange={setSheetOpen} editingClient={editingClient} />
    </motion.div>
  );
}
