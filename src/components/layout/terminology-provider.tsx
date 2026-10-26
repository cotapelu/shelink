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

/**
 * Cung cấp thuật ngữ hiển thị đã cấu hình (TD-G1) cho toàn bộ app qua context.
 * Nguồn: (app)/layout đọc SystemSetting rồi bọc provider; useTerminology() đọc từ đây.
 */

import { createContext } from "react";
import type { Terms } from "@/hooks/use-terminology";

export const TerminologyContext = createContext<Terms | null>(null);

export function TerminologyProvider({
  terms,
  children
}: {
  terms: Terms;
  children: React.ReactNode;
}) {
  return <TerminologyContext.Provider value={terms}>{children}</TerminologyContext.Provider>;
}
