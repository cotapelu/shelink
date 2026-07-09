"use client";

interface Props {
  personGender: string;
  newSpouseName: string;
  setNewSpouseName: (name: string) => void;
  newSpouseBirthYear: string;
  setNewSpouseBirthYear: (year: string) => void;
  newSpouseNote: string;
  setNewSpouseNote: (note: string) => void;
  processing: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
  error: string | null;
}

function NameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-rose-700 mb-1">Họ và Tên *</label>
      <input
        type="text"
        placeholder="Nhập họ và tên..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors"
      />
    </div>
  );
}

function BirthYearField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-rose-700 mb-1">Năm sinh (Tuỳ chọn)</label>
      <input
        type="number"
        placeholder="VD: 1980"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors"
      />
    </div>
  );
}

function NoteField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-rose-700 mb-1">Ghi chú mối quan hệ (Ví dụ: Vợ cả, Chồng thứ...)</label>
      <input
        type="text"
        placeholder="Tuỳ chọn..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors"
      />
    </div>
  );
}

function GenderNote({ personGender }: { personGender: string }) {
  return (
    <p className="text-xs text-stone-500 italic mt-1">
      * Giới tính sẽ tự động gán là {personGender === "male" ? "Nữ" : personGender === "female" ? "Nam" : "Nữ"}{" "}
      (dựa theo giới tính người hiện tại).
    </p>
  );
}

function FormButtons({
  onSave,
  onCancel,
  processing,
  disabled,
}: {
  onSave: () => Promise<void>;
  onCancel: () => void;
  processing: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        onClick={onSave}
        disabled={disabled || processing}
        className="flex-1 bg-rose-600 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
      >
        {processing ? "Đang lưu..." : "Lưu"}
      </button>
      <button
        onClick={onCancel}
        className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors"
      >
        Hủy
      </button>
    </div>
  );
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {error}
    </div>
  );
}

export default function QuickAddSpouseForm({
  personGender,
  newSpouseName,
  setNewSpouseName,
  newSpouseBirthYear,
  setNewSpouseBirthYear,
  newSpouseNote,
  setNewSpouseNote,
  processing,
  onSave,
  onCancel,
  error,
}: Props) {
  return (
    <div className="mt-4 bg-rose-50/50 p-4 sm:p-5 rounded-xl border border-rose-200 shadow-sm">
      <h4 className="font-bold text-rose-800 mb-3 text-sm">Thêm Nhanh Vợ/Chồng</h4>
      <div className="space-y-3">
        <NameField value={newSpouseName} onChange={setNewSpouseName} />
        <BirthYearField value={newSpouseBirthYear} onChange={setNewSpouseBirthYear} />
        <NoteField value={newSpouseNote} onChange={setNewSpouseNote} />
        <GenderNote personGender={personGender} />
        <FormButtons onSave={onSave} onCancel={onCancel} processing={processing} disabled={!newSpouseName.trim()} />
        {error && <ErrorDisplay error={error} />}
      </div>
    </div>
  );
}
