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

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useTerminology } from "./use-terminology";
import { TerminologyProvider } from "@/components/layout/terminology-provider";
import { DEFAULT_TERMS } from "@/lib/terminology";

function makeWrapper(overrides: Partial<Record<string, string>>) {
  return function TerminologyWrapper({ children }: { children: ReactNode }) {
    return (
      <TerminologyProvider terms={{ ...DEFAULT_TERMS, ...overrides }}>{children}</TerminologyProvider>
    );
  };
}

describe("useTerminology", () => {
  it("trả mặc định khi không có provider và không truyền stored", () => {
    const { result } = renderHook(() => useTerminology());
    expect(result.current).toEqual(DEFAULT_TERMS);
  });

  it("đọc thuật ngữ từ provider", () => {
    const { result } = renderHook(() => useTerminology(), {
      wrapper: makeWrapper({ matter: "Đơn hàng", intake: "Cơ hội" })
    });
    expect(result.current.matter).toBe("Đơn hàng");
    expect(result.current.intake).toBe("Cơ hội");
  });

  it("ưu tiên stored truyền trực tiếp hơn provider", () => {
    const { result } = renderHook(() => useTerminology({ client: "Chủ đầu tư" }), {
      wrapper: makeWrapper({ client: "Khách" })
    });
    expect(result.current.client).toBe("Chủ đầu tư");
  });

  it("bỏ qua stored null/undefined và dùng provider", () => {
    const { result } = renderHook(() => useTerminology(null), {
      wrapper: makeWrapper({ expense: "Phiếu chi" })
    });
    expect(result.current.expense).toBe("Phiếu chi");
  });
});
