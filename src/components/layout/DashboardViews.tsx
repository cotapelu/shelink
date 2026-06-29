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

import { useDashboard } from "@/components/layout/DashboardContext";
import DashboardMemberList from "@/components/domain/genealogy/members/DashboardMemberList";
import FamilyTree from "@/components/domain/genealogy/familytree/FamilyTree";
import MindmapTree from "@/components/domain/genealogy/familytree/MindmapTree";
import RootSelector from "@/components/layout/RootSelector";
import { Person, Relationship } from "@/types";
import { useMemo } from "react";

interface DashboardViewsProps {
  persons: Person[];
  relationships: Relationship[];
  canEdit?: boolean;
}

export default function DashboardViews({
  persons,
  relationships,
  canEdit = false,
}: DashboardViewsProps) {
  const { view: currentView, rootId } = useDashboard();

  // Prepare map and roots for tree views
  const { personsMap, roots, defaultRootId } = useMemo(() => {
    const pMap = new Map<string, Person>();
    persons.forEach((p) => pMap.set(p.id, p));

    const childIds = new Set(
      relationships
        .filter(
          (r) => r.type === "biological_child" || r.type === "adopted_child",
        )
        .map((r) => r.person_b),
    );

    let finalRootId = rootId;

    // If no rootId is provided, fallback to the earliest created person
    if (!finalRootId || !pMap.has(finalRootId)) {
      const rootsFallback = persons.filter((p) => !childIds.has(p.id));
      if (rootsFallback.length > 0) {
        finalRootId = rootsFallback[0].id;
      } else if (persons.length > 0) {
        finalRootId = persons[0].id; // ultimate fallback
      }
    }

    let calculatedRoots: Person[] = [];
    if (finalRootId && pMap.has(finalRootId)) {
      calculatedRoots = [pMap.get(finalRootId)!];
    }

    return {
      personsMap: pMap,
      roots: calculatedRoots,
      defaultRootId: finalRootId,
    };
  }, [persons, relationships, rootId]);

  const activeRootId = rootId || defaultRootId;

  return (
    <>
      <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col">
        {currentView !== "list" && persons.length > 0 && activeRootId && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 w-full flex flex-col sm:flex-row flex-wrap items-center sm:justify-between gap-4 relative z-20">
            <RootSelector persons={persons} currentRootId={activeRootId} />
            <div
              id="tree-toolbar-portal"
              className="flex items-center gap-2 flex-wrap justify-center"
            />
          </div>
        )}

        {currentView === "list" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10">
            <DashboardMemberList initialPersons={persons} canEdit={canEdit} />
          </div>
        )}

        <div className="flex-1 w-full relative z-10">
          {currentView === "tree" && (
            <FamilyTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
          {currentView === "mindmap" && (
            <MindmapTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
        </div>
      </main>
    </>
  );
}
