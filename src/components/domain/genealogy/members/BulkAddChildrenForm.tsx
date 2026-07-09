"use client";

interface BulkChild {
  name: string;
  gender: "male" | "female" | "other";
  birthYear: string;
  isProcessing: boolean;
}

interface SpouseOption {
  id: string;
  full_name: string;
  note: string | null;
}

interface Props {
  spouses: SpouseOption[];
  selectedSpouseId: string;
  setSelectedSpouseId: (id: string) => void;
  bulkChildren: BulkChild[];
  setBulkChildren: (children: BulkChild[]) => void;
  processing: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

function SpouseSelect({
  spouses,
  selectedSpouseId,
  setSelectedSpouseId,
}: {
  spouses: SpouseOption[];
  selectedSpouseId: string;
  setSelectedSpouseId: (id: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">Chọn người mẹ/cha còn lại</label>
      <select value={selectedSpouseId} onChange={e => setSelectedSpouseId(e.target.value)} className="flex-1 bg-white text-stone-900 placeholder-stone-400 text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 sm:p-2.5 border transition-colors">
        <option value="unknown">Không rõ (hoặc Vợ/Chồng khác chưa thêm)</option>
        {spouses.map(rel => (
          <option key={rel.id} value={rel.id}>{rel.full_name} {rel.note ? `(${rel.note})` : ""}</option>
        ))}
      </select>
    </div>
  );
}

function ChildRow({
  child,
  index,
  onChange,
  onRemove,
}: {
  child: BulkChild;
  index: number;
  onChange: (index: number, field: keyof BulkChild, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-stone-400 text-xs w-4">{index + 1}.</span>
      <input type="text" placeholder="Họ và tên..." value={child.name} onChange={e => onChange(index, "name", e.target.value)} className="flex-2 bg-white text-stone-900 placeholder-stone-400 text-sm rounded-md border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border" />
      <select value={child.gender} onChange={e => onChange(index, "gender", e.target.value as "male" | "female" | "other")} className="flex-1 bg-white text-stone-900 text-sm rounded-md border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border">
        <option value="male">Nam</option>
        <option value="female">Nữ</option>
        <option value="other">Khác</option>
      </select>
      <input type="number" placeholder="Năm sinh" value={child.birthYear} onChange={e => onChange(index, "birthYear", e.target.value)} className="flex-1 bg-white text-stone-900 placeholder-stone-400 text-sm rounded-md border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border w-24" />
      <button type="button" onClick={() => onRemove(index)} className="text-stone-400 hover:text-red-500 p-2" title="Xóa dòng">✕</button>
    </div>
  );
}

function ChildList({
  bulkChildren,
  setBulkChildren,
}: {
  bulkChildren: BulkChild[];
  setBulkChildren: (children: BulkChild[]) => void;
}) {
  const handleChange = (index: number, field: keyof BulkChild, value: string) => {
    const newBulk = [...bulkChildren];
    newBulk[index] = { ...newBulk[index], [field]: value };
    setBulkChildren(newBulk);
  };
  const handleRemove = (index: number) => {
    const newBulk = bulkChildren.filter((_, i) => i !== index);
    if (newBulk.length === 0) {
      newBulk.push({ name: "", gender: "male", birthYear: "", isProcessing: false });
    }
    setBulkChildren(newBulk);
  };
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-stone-500 mb-1">Danh sách các con</label>
      {bulkChildren.map((child, index) => (
        <ChildRow key={index} index={index} child={child} onChange={handleChange} onRemove={handleRemove} />
      ))}
      <button type="button" onClick={() => setBulkChildren([...bulkChildren, { name: "", gender: "male", birthYear: "", isProcessing: false }])} className="text-sky-600 text-xs font-semibold hover:text-sky-800 mt-2 px-6">+ Thêm dòng</button>
    </div>
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
    <div className="flex gap-2 pt-4 border-t border-stone-200">
      <button onClick={onSave} disabled={processing || disabled} className="flex-1 bg-sky-600 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors">{processing ? "Đang lưu..." : "Lưu Tất Cả"}</button>
      <button onClick={onCancel} className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors">Hủy</button>
    </div>
  );
}

export default function BulkAddChildrenForm({
  spouses,
  selectedSpouseId,
  setSelectedSpouseId,
  bulkChildren,
  setBulkChildren,
  processing,
  onSave,
  onCancel,
}: Props) {
  return (
    <div className="mt-4 bg-sky-50/50 p-4 sm:p-5 rounded-xl border border-sky-200 shadow-sm">
      <h4 className="font-bold text-sky-800 mb-3 text-sm">Thêm Nhanh Nhiều Con</h4>
      <div className="space-y-4">
        <SpouseSelect spouses={spouses} selectedSpouseId={selectedSpouseId} setSelectedSpouseId={setSelectedSpouseId} />
        <ChildList bulkChildren={bulkChildren} setBulkChildren={setBulkChildren} />
        <FormButtons onSave={onSave} onCancel={onCancel} processing={processing} disabled={bulkChildren.every(c => c.name.trim() === "")} />
      </div>
    </div>
  );
}
