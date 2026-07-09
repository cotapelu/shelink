"use client";

import type { EnrichedRelationship } from "./use-relationship-data";
import { RelationshipType } from "@/types";

interface Props {
  rel: EnrichedRelationship;
  type: RelationshipType;
  setType: (type: RelationshipType) => void;
  note: string;
  setNote: (note: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  processing: boolean;
}

function PersonInfo({ rel }: { rel: EnrichedRelationship }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">Người liên quan</label>
      <div className="flex items-center gap-2 p-2 bg-white rounded border border-stone-200">
        <div className="size-8 rounded-full overflow-hidden shrink-0">
          {rel.targetPerson.avatar_url ? (
            <img src={rel.targetPerson.avatar_url} alt={rel.targetPerson.full_name} width={32} height={32} className="object-cover" />
          ) : (
            <div className="size-8 bg-stone-200 flex items-center justify-center text-xs text-stone-500">
              {rel.targetPerson.gender === "male" ? "♂" : rel.targetPerson.gender === "female" ? "♀" : "?"}
            </div>
          )}
        </div>
        <span className="text-sm text-stone-800">{rel.targetPerson.full_name}</span>
      </div>
    </div>
  );
}

function FormFields({
  type,
  setType,
  note,
  setNote,
}: {
  type: RelationshipType;
  setType: (type: RelationshipType) => void;
  note: string;
  setNote: (note: string) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Loại quan hệ</label>
        <select
          value={type}
          onChange={e => setType(e.target.value as RelationshipType)}
          className="flex-1 bg-white text-stone-900 text-sm rounded-md border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border"
        >
          <option value="biological_child">Con ruột</option>
          <option value="adopted_child">Con nuôi</option>
          <option value="marriage">Hôn nhân</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Ghi chú</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ghi chú (nếu có)"
          className="flex-1 bg-white text-stone-900 placeholder-stone-400 text-sm rounded-md border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border"
        />
      </div>
    </>
  );
}

export default function EditRelationshipDialog({
  rel,
  type,
  setType,
  note,
  setNote,
  onSave,
  onCancel,
  processing,
}: Props) {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 sm:p-5 mb-4">
      <h3 className="font-bold text-amber-800 mb-3 text-sm">Chỉnh sửa quan hệ</h3>
      <div className="space-y-3">
        <PersonInfo rel={rel} />
        <FormFields type={type} setType={setType} note={note} setNote={setNote} />
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onSave} disabled={processing} className="flex-1 bg-amber-700 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors">
          {processing ? "Đang lưu..." : "Lưu"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors">
          Hủy
        </button>
      </div>
    </div>
  );
}
