"use client";
interface ErrorDisplayProps { error: string | null; onClose: () => void; isAdding: boolean; isAddingBulk: boolean; isAddingSpouse: boolean; }
export default function ErrorDisplay({ error, onClose, isAdding, isAddingBulk, isAddingSpouse }: ErrorDisplayProps) {
  if (!error || isAdding || isAddingBulk || isAddingSpouse) return null;
  return (
    <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{error}</span>
      </div>
      <button onClick={onClose} className="text-red-400 hover:text-red-600 transition-colors p-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
