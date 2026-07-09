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

import { RelationshipType } from "@/types";
import RelationshipCard from "./RelationshipCard";
import type { EnrichedRelationship } from "./use-relationship-data";

interface RelationshipSectionProps {
  group: string;
  items: EnrichedRelationship[];
  isAdmin: boolean;
  canEdit: boolean;
  onPersonClick: (id: string) => void;
  onEdit: (rel: EnrichedRelationship) => void;
  onDelete: (id: string) => void;
}

const titles: Record<string, string> = {
  parent: "Bố / Mẹ",
  spouse: "Vợ / Chồng",
  child: "Con cái",
  child_in_law: "Con dâu / Con rể",
};

export default function RelationshipSection({
  group,
  items,
  isAdmin,
  canEdit,
  onPersonClick,
  onEdit,
  onDelete,
}: RelationshipSectionProps) {
  if (items.length === 0) return null;
  const title = titles[group] || group;

  return (
    <div className="border-b border-stone-100 pb-4 last:border-0">
      <h4 className="font-bold text-stone-700 mb-3 text-sm uppercase tracking-wide">
        {title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((rel) => (
          <RelationshipCard
            key={rel.id}
            rel={rel}
            isAdmin={isAdmin}
            canEdit={canEdit}
            onPersonClick={onPersonClick}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
