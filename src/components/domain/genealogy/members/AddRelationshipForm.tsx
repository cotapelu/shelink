"use client";

import { useState } from "react";
import { Person, RelationshipType } from "@/types";
import { formatDisplayDate } from "@/utils/dateHelpers";

interface Props {
  personId: string;
  newRelNote: string;
  setNewRelNote: (note: string) => void;
  newRelDirection: "parent" | "child" | "spouse";
  setNewRelDirection: (dir: "parent" | "child" | "spouse") => void;
  newRelType: RelationshipType;
  setNewRelType: (type: RelationshipType) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: Person[];
  setSearchResults: (results: Person[]) => void;
  recentMembers: Person[];
  selectedTargetId: string;
  setSelectedTargetId: (id: string) => void;
  addRelationship: () => Promise<void>;
  processing: boolean;
  onCancel: () => void;
}

function NoteField({ note, setNote }: { note: string; setNote: (s: string) => void }) {
  return <div><label className="block text-xs font-medium text-stone-500 mb-1">Ghi chú mối quan hệ (tuỳ chọn)</label><input type="text" placeholder="VD: Vợ cả, Vợ hai, Chồng trước..." value={note} onChange={e => setNote(e.target.value)} className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border mb-3 transition-colors" /></div>;
}

function DirectionSelect({ direction, setDirection }: { direction: "parent" | "child" | "spouse"; setDirection: (d: "parent" | "child" | "spouse") => void }) {
  return <div><label className="block text-xs font-medium text-stone-500 mb-1">Loại quan hệ</label><select value={direction} onChange={e => setDirection(e.target.value as "parent" | "child" | "spouse")} className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"><option value="parent">Người này là Con của...</option><option value="spouse">Người này là Vợ/Chồng của...</option><option value="child">Người này là Bố/Mẹ của...</option></select></div>;
}

function ChildTypeSelect({ type, setType }: { type: RelationshipType; setType: (t: RelationshipType) => void }) {
  return <div><label className="block text-xs font-medium text-stone-500 mb-1">Chi tiết</label><select value={type} onChange={e => setType(e.target.value as RelationshipType)} className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"><option value="biological_child">Con ruột</option><option value="adopted_child">Con nuôi</option></select></div>;
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div><label className="block text-xs font-medium text-stone-500 mb-1">Tìm người thân</label><input type="text" placeholder="Nhập tên để tìm..." value={value} onChange={e => onChange(e.target.value)} className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors" /></div>;
}

function SearchResultItem({ p, onSelect }: { p: Person; onSelect: (p: Person) => void }) {
  return <button onClick={() => onSelect(p)} className="px-3 py-2 hover:bg-amber-50 text-sm flex items-center justify-between border-b border-stone-100 last:border-0"><div className="flex items-center gap-2"><span className={`flex items-center justify-center text-[8px] font-bold size-3 rounded-full text-white shrink-0 ${p.gender === "male" ? "bg-sky-500" : p.gender === "female" ? "bg-rose-500" : "bg-stone-400"}`}>{p.gender === "male" ? "♂" : p.gender === "female" ? "♀" : "?"}</span><span className="font-medium text-stone-800">{p.full_name}</span></div><span className="text-[10px] text-stone-400">{formatDisplayDate(p.birth_year, p.birth_month, p.birth_day)}</span></button>;
}

function SearchResults({ searchResults, recentMembers, onSelect, show }: { searchResults: Person[]; recentMembers: Person[]; onSelect: (p: Person) => void; show: boolean }) {
  if (!show) return null;
  const list = searchResults.length > 0 ? searchResults : recentMembers;
  return <div className="mt-2 bg-white border border-stone-200 rounded-md shadow-lg max-h-[250px] overflow-y-auto"><div className="px-3 py-1.5 bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wide border-b border-stone-200 sticky top-0 z-10">{searchResults.length > 0 ? "Kết quả tìm kiếm" : "Thành viên vừa thêm gần đây"}</div>{list.map(p => <SearchResultItem key={p.id} p={p} onSelect={onSelect} />)}</div>;
}

function SelectedTargetDisplay({ selectedTargetId, searchTerm }: { selectedTargetId: string; searchTerm: string }) {
  if (!selectedTargetId) return null;
  return <p className="text-xs text-green-600 mt-1">Đã chọn: {searchTerm}</p>;
}

function FormButtons({ onSave, onCancel, processing, disabled }: { onSave: () => void; onCancel: () => void; processing: boolean; disabled: boolean }) {
  return <div className="flex gap-2 pt-2"><button onClick={onSave} disabled={disabled || processing} className="flex-1 bg-amber-700 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors">{processing ? "Đang lưu..." : "Lưu"}</button><button onClick={onCancel} className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors">Hủy</button></div>;
}

function FormFields({ newRelNote, setNewRelNote, newRelDirection, setNewRelDirection, newRelType, setNewRelType }: { newRelNote: string; setNewRelNote: (s: string) => void; newRelDirection: "parent" | "child" | "spouse"; setNewRelDirection: (d: "parent" | "child" | "spouse") => void; newRelType: RelationshipType; setNewRelType: (t: RelationshipType) => void }) {
  return <> <NoteField note={newRelNote} setNote={setNewRelNote} /> <DirectionSelect direction={newRelDirection} setDirection={setNewRelDirection} /> {(newRelDirection === "child" || newRelDirection === "parent") && <ChildTypeSelect type={newRelType} setType={setNewRelType} />} </>;
}

function FormUI({
  newRelNote,
  setNewRelNote,
  newRelDirection,
  setNewRelDirection,
  newRelType,
  setNewRelType,
  searchTerm,
  setSearchTerm,
  searchResults,
  setSearchResults,
  recentMembers,
  selectedTargetId,
  setSelectedTargetId,
  onSave,
  onCancel,
  processing,
  showDropdown,
  localError,
}: any) {
  return (
    <div className="mt-4 bg-stone-50/50 p-4 sm:p-5 rounded-xl border border-stone-200 shadow-sm">
      <h4 className="font-bold text-stone-800 mb-3 text-sm">Thêm Quan Hệ Mới</h4>
      <div className="space-y-3">
        <FormFields newRelNote={newRelNote} setNewRelNote={setNewRelNote} newRelDirection={newRelDirection} setNewRelDirection={setNewRelDirection} newRelType={newRelType} setNewRelType={setNewRelType} />
        <div>
          <SearchInput value={searchTerm} onChange={setSearchTerm} />
          <SearchResults searchResults={searchResults} recentMembers={recentMembers} onSelect={(p) => { setSelectedTargetId(p.id); setSearchTerm(p.full_name); setSearchResults([]); }} show={showDropdown} />
          <SelectedTargetDisplay selectedTargetId={selectedTargetId} searchTerm={searchTerm} />
        </div>
        {localError && <p className="text-xs text-red-600 font-medium">{localError}</p>}
        <FormButtons onSave={onSave} onCancel={onCancel} processing={processing} disabled={!selectedTargetId} />
      </div>
    </div>
  );
}

export default function AddRelationshipForm(props: Props) {
  const [localError, setLocalError] = useState<string | null>(null);
  const { newRelNote, setNewRelNote, newRelDirection, setNewRelDirection, newRelType, setNewRelType, searchTerm, setSearchTerm, searchResults, setSearchResults, recentMembers, selectedTargetId, setSelectedTargetId, addRelationship, processing, onCancel } = props;
  const showDropdown = searchResults.length > 0 || (searchTerm.length === 0 && !selectedTargetId && recentMembers.length > 0);
  const handleSave = async () => {
    if (!selectedTargetId) { setLocalError("Vui lòng chọn người liên quan"); return; }
    setLocalError(null);
    await addRelationship();
    setSearchTerm(""); setSelectedTargetId(""); setNewRelNote("");
  };
  return <FormUI {...props} localError={localError} onSave={handleSave} showDropdown={showDropdown} />;
}
