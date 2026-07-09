"use client";

interface AddButtonsProps {
  onAdd: () => void;
  onBulkAdd: () => void;
  onQuickAddSpouse: () => void;
  canEdit: boolean;
  isAdding: boolean;
  isAddingBulk: boolean;
  isAddingSpouse: boolean;
  editingId: string | null;
}

export default function AddButtons({
  onAdd,
  onBulkAdd,
  onQuickAddSpouse,
  canEdit,
  isAdding,
  isAddingBulk,
  isAddingSpouse,
  editingId,
}: AddButtonsProps) {
  if (!canEdit || isAdding || isAddingBulk || isAddingSpouse || editingId) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-4">
      <button
        onClick={onAdd}
        className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-amber-400 hover:text-amber-700 transition-all duration-200"
      >
        + Thêm Quan Hệ
      </button>

      <button
        onClick={onBulkAdd}
        className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-sky-400 hover:text-sky-700 transition-all duration-200"
      >
        + Thêm Con
      </button>

      <button
        onClick={onQuickAddSpouse}
        className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-rose-400 hover:text-rose-700 transition-all duration-200"
      >
        + Thêm Vợ/Chồng
      </button>
    </div>
  );
}
