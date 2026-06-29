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

import { Person, Relationship } from "@/types";
import api from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { getToken } from "@/lib/storage/auth";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

interface LineageManagerProps {
  persons: Person[];
  relationships: Relationship[];
}

interface ComputedUpdate {
  id: string;
  full_name: string;
  old_generation: number | null;
  new_generation: number | null;
  old_birth_order: number | null;
  new_birth_order: number | null;
  changed: boolean;
}

// ─── Algorithm helpers ────────────────────────────────────────────────────────

export function computeGenerations(
  persons: Person[],
  relationships: Relationship[],
): Map<string, number> {
  // Build child→parents map (only biological/adopted relationships)
  const childParents = new Map<string, string[]>();
  // Build parent→children map
  const parentChildren = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      // person_a = parent, person_b = child
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, []);
      childParents.get(r.person_b)!.push(r.person_a);

      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    }
  }

  // Build marriage map: person → spouses
  const spouseMap = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      spouseMap.get(r.person_a)!.push(r.person_b);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_b)!.push(r.person_a);
    }
  }

  // Roots = persons who have no parent in the child→parents map
  //   AND are not in-laws (in-laws get generation from their spouse)
  const roots = persons.filter((p) => !childParents.has(p.id) && !p.is_in_law);

  const genMap = new Map<string, number>();

  // BFS from roots
  const queue: Array<{ id: string; gen: number }> = roots.map((r) => ({
    id: r.id,
    gen: 1,
  }));

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (genMap.has(id)) continue; // already visited — keep the first (shallowest) assignment
    genMap.set(id, gen);

    // Propagate to children
    const children = parentChildren.get(id) || [];
    for (const childId of children) {
      if (!genMap.has(childId)) {
        queue.push({ id: childId, gen: gen + 1 });
      }
    }
  }

  // Assign generation to in-laws based on their spouse's generation
  // (do multiple passes in case spouses haven't been processed yet)
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of persons) {
      if (!p.is_in_law || genMap.has(p.id)) continue;
      const spouses = spouseMap.get(p.id) || [];
      for (const spouseId of spouses) {
        if (genMap.has(spouseId)) {
          genMap.set(p.id, genMap.get(spouseId)!);
          changed = true;
          break;
        }
      }
    }
  }

  // Persons not reachable from any root (orphaned or disconnected in-laws)
  // leave generation as null -- we don't assign them
  return genMap;
}

export function computeBirthOrders(
  persons: Person[],
  relationships: Relationship[],
): Map<string, number> {
  // For each parent→children group, sort by birth_year and assign order
  const parentChildren = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    }
  }

  const personsById = new Map(persons.map((p) => [p.id, p]));
  const orderMap = new Map<string, number>();

  for (const [, childIds] of parentChildren) {
    // Sort children by birth_year (nulls last), then by name alphabetically
    const sorted = [...childIds].sort((a, b) => {
      const pa = personsById.get(a);
      const pb = personsById.get(b);
      const aYear = pa?.birth_year ?? Infinity;
      const bYear = pb?.birth_year ?? Infinity;
      if (aYear !== bYear) return aYear - bYear;
      return (pa?.full_name ?? "").localeCompare(pb?.full_name ?? "", "vi");
    });

    // Only assign order to non-in-law children
    let order = 1;
    for (const childId of sorted) {
      const p = personsById.get(childId);
      if (p && !p.is_in_law) {
        // Keep smallest order if already assigned (from another parent)
        if (!orderMap.has(childId) || orderMap.get(childId)! > order) {
          orderMap.set(childId, order);
        }
        order++;
      }
    }
  }

  return orderMap;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LineageManager({
  persons,
  relationships,
}: LineageManagerProps) {
  const [updates, setUpdates] = useState<ComputedUpdate[] | null>(null);
  const [computing, setComputing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.setToken(token);
    }
  }, []);

  const handleCompute = () => {
    setComputing(true);
    setApplied(false);
    setError(null);

    try {
      const genMap = computeGenerations(persons, relationships);
      const orderMap = computeBirthOrders(persons, relationships);

      const result: ComputedUpdate[] = persons.map((p) => {
        const newGen = genMap.has(p.id) ? genMap.get(p.id)! : null;
        const newOrder = orderMap.has(p.id) ? orderMap.get(p.id)! : null;
        return {
          id: p.id,
          full_name: p.full_name,
          old_generation: p.generation,
          new_generation: newGen,
          old_birth_order: p.birth_order,
          new_birth_order: newOrder,
          changed: newGen !== p.generation || newOrder !== p.birth_order,
        };
      });

      // Sort: changed first, then by new generation, then by new birth_order
      result.sort((a, b) => {
        if (a.changed !== b.changed) return a.changed ? -1 : 1;
        const gA = a.new_generation ?? 999;
        const gB = b.new_generation ?? 999;
        if (gA !== gB) return gA - gB;
        const oA = a.new_birth_order ?? 999;
        const oB = b.new_birth_order ?? 999;
        return oA - oB;
      });

      setUpdates(result);
    } catch (err) {
      setError((err as Error).message || "Lỗi tính toán.");
    } finally {
      setComputing(false);
    }
  };

const handleApply = async () => {
  if (!updates) return;
  setApplying(true);
  setError(null);

  try {
    const changedOnly = updates.filter((u) => u.changed);
    const CHUNK = 20;
    for (let i = 0; i < changedOnly.length; i += CHUNK) {
      const chunk = changedOnly.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((u) =>
          api.patch(API_ENDPOINTS.PERSONS_UPDATE(u.id), {
            generation: u.new_generation,
            birth_order: u.new_birth_order,
          }),
        ),
      );
    }
    setApplied(true);
  } catch (err) {
    setError((err as Error).message || "Lỗi khi cập nhật dữ liệu.");
  } finally {
    setApplying(false);
  }
};

  const changedCount = updates?.filter((u) => u.changed).length ?? 0;
  const displayedRows = showAll
    ? (updates ?? [])
    : (updates ?? []).slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCompute}
          disabled={computing || applying}
          className="btn-secondary"
        >
          {computing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {computing ? "Đang tính..." : "Tính toán"}
        </button>

        {updates && changedCount > 0 && !applied && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="btn-primary"
          >
            {applying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {applying
              ? "Đang cập nhật..."
              : `Áp dụng (${changedCount} thay đổi)`}
          </button>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 text-sm font-medium"
          >
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {applied && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-4 text-sm font-semibold"
          >
            <CheckCircle2 className="size-5 shrink-0" />
            Đã áp dụng thành công {changedCount} thay đổi! Tải lại trang để xem
            kết quả.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview table */}
      {updates && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-stone-500 font-medium">
              <span className="text-stone-800 font-bold">{changedCount}</span>{" "}
              thành viên sẽ được cập nhật /&nbsp;
              <span className="text-stone-800 font-bold">
                {updates.length}
              </span>{" "}
              tổng
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200/80">
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">
                      Tên
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">
                      Thế hệ (cũ → mới)
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">
                      Thứ tự sinh (cũ → mới)
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-stone-600">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-stone-100 last:border-0 transition-colors ${
                        u.changed ? "bg-amber-50/40" : ""
                      } ${i % 2 === 0 && !u.changed ? "bg-white" : !u.changed ? "bg-stone-50/30" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-stone-800">
                        {u.full_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-stone-400">
                          {u.old_generation ?? "—"}
                        </span>
                        {u.old_generation !== u.new_generation && (
                          <>
                            <span className="mx-2 text-stone-300">→</span>
                            <span className="font-bold text-amber-700">
                              {u.new_generation ?? "—"}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-stone-400">
                          {u.old_birth_order ?? "—"}
                        </span>
                        {u.old_birth_order !== u.new_birth_order && (
                          <>
                            <span className="mx-2 text-stone-300">→</span>
                            <span className="font-bold text-amber-700">
                              {u.new_birth_order ?? "—"}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.changed ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200/60">
                            Cập nhật
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-400 border border-stone-200/60">
                            Không đổi
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {updates.length > 20 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-amber-700 transition-colors mx-auto"
            >
              {showAll ? (
                <>
                  <ChevronUp className="size-4" /> Thu gọn
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" /> Xem tất cả {updates.length}{" "}
                  thành viên
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
