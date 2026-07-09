"use client";

import Image from "next/image";
import DefaultAvatar from "@/components/ui/Avatar/DefaultAvatar";
import type { EnrichedRelationship } from "./use-relationship-data";

interface Props {
  rel: EnrichedRelationship;
  isAdmin: boolean;
  canEdit: boolean;
  onPersonClick: (id: string) => void;
  onEdit: (rel: EnrichedRelationship) => void;
  onDelete: (id: string) => void;
}

function PersonInfo({
  rel,
  onClick,
}: {
  rel: EnrichedRelationship;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 flex-1 text-left"
    >
      <div className="size-10 rounded-full bg-stone-100 overflow-hidden shrink-0">
        {rel.targetPerson.avatar_url ? (
          <Image
            src={rel.targetPerson.avatar_url}
            alt={rel.targetPerson.full_name}
            width={40}
            height={40}
            className="object-cover"
          />
        ) : (
          <DefaultAvatar gender={rel.targetPerson.gender} />
        )}
      </div>
      <div>
        <div className="font-medium text-stone-900 text-sm">
          {rel.targetPerson.full_name}
        </div>
        <div className="text-xs text-stone-500">
          {rel.note && <span>{rel.note}</span>}
        </div>
      </div>
    </button>
  );
}

function CardActions({
  rel,
  isAdmin,
  canEdit,
  onEdit,
  onDelete,
}: {
  rel: EnrichedRelationship;
  isAdmin: boolean;
  canEdit: boolean;
  onEdit: (rel: EnrichedRelationship) => void;
  onDelete: (id: string) => void;
}) {
  if (!isAdmin && !canEdit) return null;
  return (
    <div className="flex gap-1 shrink-0">
      <button
        onClick={() => onEdit(rel)}
        className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded"
        title="Sửa"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
      <button
        onClick={() => onDelete(rel.id)}
        className="p-1.5 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded"
        title="Xóa"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

export default function RelationshipCard(props: Props) {
  const { rel, isAdmin, canEdit, onPersonClick, onEdit, onDelete } = props;
  return (
    <div className="border border-stone-200 rounded-lg p-3 bg-white relative group hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <PersonInfo
          rel={rel}
          onClick={() => onPersonClick(rel.targetPerson.id)}
        />
        <CardActions
          rel={rel}
          isAdmin={isAdmin}
          canEdit={canEdit}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
