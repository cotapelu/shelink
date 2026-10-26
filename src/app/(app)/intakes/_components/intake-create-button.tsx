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

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntakeSheet, type Colleague } from "./intake-sheet";
import type { ClientOption } from "@/app/(app)/matters/_components/matters-view";
import { listClients } from "@/server/clients/actions";
import { listActiveColleagues } from "@/server/users/actions";

/**
 * Nút "Tạo tiếp nhận" cho trang pipeline /intakes (follow-up AUTO-41).
 * Tái dùng IntakeSheet; chỉ nạp (lazy) danh sách khách + đồng nghiệp khi mở lần đầu.
 */
export function CreateIntakeButton({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  const loadOptions = useCallback(async () => {
    if (optionsLoaded) return;
    try {
      const [clientsRes, users] = await Promise.all([
        listClients({ pageSize: 100 }),
        listActiveColleagues()
      ]);
      setClientOptions(clientsRes.items.map((c) => ({ id: c.id, name: c.name, type: c.type })));
      setColleagues(users);
    } catch {
      // Sheet vẫn mở được; form tự báo lỗi nếu thiếu dữ liệu.
    }
    setOptionsLoaded(true);
  }, [optionsLoaded]);

  useEffect(() => {
    if (open) void loadOptions();
  }, [open, loadOptions]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) onCreated?.();
  }

  return (
    <>
      <Button size="sm" className="h-8 gap-1" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Tạo tiếp nhận
      </Button>
      <IntakeSheet
        open={open}
        onOpenChange={handleOpenChange}
        clientOptions={clientOptions}
        colleagues={colleagues}
      />
    </>
  );
}
