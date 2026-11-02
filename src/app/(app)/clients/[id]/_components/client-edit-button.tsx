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
import { Pencil } from "lucide-react";
import type { Client, Contact } from "@prisma/client";
import { ClientSheet } from "@/app/(app)/clients/_components/client-sheet";

/**
 * v0.39: cửa vào「sửa thông tin」ở trang chi tiết khách hàng.
 * Trang chi tiết là component phía server, ở đây bọc một lớp state phía client để tái dùng ClientSheet hiện có (gồm sửa + người liên hệ).
 */
export function ClientEditButton({
  client
}: {
  client: Client & { contacts?: Contact[] };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-primary"
      >
        <Pencil className="h-3.5 w-3.5" />
        Sửa thông tin
      </button>
      <ClientSheet open={open} onOpenChange={setOpen} editingClient={client} />
    </>
  );
}
