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

export default function RelationshipSection({ group, items, isAdmin, canEdit, onPersonClick, onEdit, onDelete }: RelationshipSectionProps) {
  if (items.length === 0) return null;
  const title = titles[group] || group;
  return <div className="border-b border-stone-100 pb-4 last:border-0"><h4 className="font-bold text-stone-700 mb-3 text-sm uppercase tracking-wide">{title}</h4><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{items.map((rel) => (<RelationshipCard key={rel.id} rel={rel} isAdmin={isAdmin} canEdit={canEdit} onPersonClick={onPersonClick} onEdit={onEdit} onDelete={onDelete} />))}</div></div>;
}