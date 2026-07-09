"use client";

import { Person, RelationshipType } from "@/types";
import RelationshipSection from "./RelationshipSection";
import EditRelationshipDialog from "./EditRelationshipDialog";
import AddButtons from "./AddButtons";
import ErrorDisplay from "./ErrorDisplay";
import AddRelationshipForm from "./AddRelationshipForm";
import BulkAddChildrenForm from "./BulkAddChildrenForm";
import QuickAddSpouseForm from "./QuickAddSpouseForm";
import { BulkChild } from "./BulkAddChildrenForm";
import { EnrichedRelationship } from "./use-relationship-data";

interface RelationshipManagerViewProps {
  personId: string;
  isAdmin: boolean;
  canEdit: boolean;
  personGender: string;
  processing: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  relationshipData: {
    relationships: EnrichedRelationship[];
    loading: boolean;
    isAdding: boolean;
    setIsAdding: (v: boolean) => void;
    newRelNote: string;
    setNewRelNote: (s: string) => void;
    newRelDirection: "parent" | "child" | "spouse";
    setNewRelDirection: (d: "parent" | "child" | "spouse") => void;
    newRelType: RelationshipType;
    setNewRelType: (t: RelationshipType) => void;
    newRelTargetPersonId: string;
    setNewRelTargetPersonId: (id: string) => void;
    addRelationship: () => Promise<void>;
    editingId: string | null;
    editRelType: RelationshipType;
    setEditRelType: (t: RelationshipType) => void;
    editRelNote: string;
    setEditRelNote: (s: string) => void;
    setEditingId: (id: string | null) => void;
  };
  bulkAdd: {
    isAddingBulk: boolean;
    setIsAddingBulk: (v: boolean) => void;
    selectedSpouseId: string;
    setSelectedSpouseId: (id: string) => void;
    bulkChildren: BulkChild[];
    setBulkChildren: (c: BulkChild[]) => void;
    handleBulkAdd: () => Promise<void>;
  };
  quickAdd: {
    isAddingSpouse: boolean;
    setIsAddingSpouse: (v: boolean) => void;
    newSpouseName: string;
    setNewSpouseName: (n: string) => void;
    newSpouseBirthYear: string;
    setNewSpouseBirthYear: (y: string) => void;
    newSpouseNote: string;
    setNewSpouseNote: (n: string) => void;
    handleQuickAddSpouse: () => Promise<void>;
  };
  search: {
    searchTerm: string;
    setSearchTerm: (t: string) => void;
    searchResults: Person[];
    setSearchResults: (p: Person[]) => void;
    recentMembers: Person[];
  };
  handlePersonClick: (id: string) => void;
  handleEdit: (rel: EnrichedRelationship) => void;
  handleSaveEdit: () => Promise<void>;
  deleteRelationship: (id: string) => void;
}

export default function RelationshipManagerView(p: RelationshipManagerViewProps) {
  const {
    isAdmin,
    canEdit,
    personGender,
    processing,
    error,
    setError,
    relationshipData,
    bulkAdd,
    quickAdd,
    search,
    handlePersonClick,
    handleEdit,
    handleSaveEdit,
    deleteRelationship,
  } = p;
  const {
    relationships,
    isAdding,
    setIsAdding,
    newRelNote,
    setNewRelNote,
    newRelDirection,
    setNewRelDirection,
    newRelType,
    setNewRelType,
    newRelTargetPersonId,
    setNewRelTargetPersonId,
    addRelationship,
    editingId,
    editRelType,
    setEditRelType,
    editRelNote,
    setEditRelNote,
    setEditingId,
  } = relationshipData;
  const groupByType = (type: string) => relationships.filter(r => r.direction === type);
  const spouseOptions = groupByType("spouse").map(rel => ({
    id: rel.targetPerson.id,
    full_name: rel.targetPerson.full_name,
    note: rel.note,
  }));
  const editRel = editingId ? relationships.find(r => r.id === editingId) ?? null : null;
  return (
    <div className="space-y-6">
      {["parent", "spouse", "child", "child_in_law"].map(group => (
        <RelationshipSection
          key={group}
          group={group}
          items={groupByType(group)}
          isAdmin={isAdmin}
          canEdit={canEdit}
          onPersonClick={handlePersonClick}
          onEdit={handleEdit}
          onDelete={deleteRelationship}
        />
      ))}
      <EditRelationshipDialog
        rel={editRel!}
        type={editRelType}
        setType={setEditRelType}
        note={editRelNote}
        setNote={setEditRelNote}
        onSave={handleSaveEdit}
        onCancel={() => { setEditingId(null); setEditRelNote(""); }}
        processing={processing}
      />
      <AddButtons
        onAdd={() => setIsAdding(true)}
        onBulkAdd={() => bulkAdd.setIsAddingBulk(true)}
        onQuickAddSpouse={() => quickAdd.setIsAddingSpouse(true)}
        canEdit={canEdit}
        isAdding={isAdding}
        isAddingBulk={bulkAdd.isAddingBulk}
        isAddingSpouse={quickAdd.isAddingSpouse}
        editingId={editingId}
      />
      <ErrorDisplay
        error={error}
        onClose={() => setError(null)}
        isAdding={isAdding}
        isAddingBulk={bulkAdd.isAddingBulk}
        isAddingSpouse={quickAdd.isAddingSpouse}
      />
      {canEdit && isAdding && (
        <AddRelationshipForm
          personId={p.personId}
          newRelNote={newRelNote}
          setNewRelNote={setNewRelNote}
          newRelDirection={newRelDirection}
          setNewRelDirection={setNewRelDirection}
          newRelType={newRelType}
          setNewRelType={setNewRelType}
          searchTerm={search.searchTerm}
          setSearchTerm={search.setSearchTerm}
          searchResults={search.searchResults}
          setSearchResults={search.setSearchResults}
          recentMembers={search.recentMembers}
          selectedTargetId={newRelTargetPersonId}
          setSelectedTargetId={setNewRelTargetPersonId}
          addRelationship={addRelationship}
          processing={processing}
          onCancel={() => {
            setIsAdding(false);
            setNewRelTargetPersonId("");
            search.setSearchTerm("");
            setNewRelNote("");
          }}
        />
      )}
      {canEdit && bulkAdd.isAddingBulk && (
        <BulkAddChildrenForm
          spouses={spouseOptions}
          selectedSpouseId={bulkAdd.selectedSpouseId}
          setSelectedSpouseId={bulkAdd.setSelectedSpouseId}
          bulkChildren={bulkAdd.bulkChildren}
          setBulkChildren={bulkAdd.setBulkChildren}
          processing={processing}
          onSave={bulkAdd.handleBulkAdd}
          onCancel={() => {
            bulkAdd.setIsAddingBulk(false);
            bulkAdd.setBulkChildren([
              { name: "", gender: "male", birthYear: "", isProcessing: false },
            ]);
            bulkAdd.setSelectedSpouseId("");
          }}
        />
      )}
      {canEdit && quickAdd.isAddingSpouse && (
        <QuickAddSpouseForm
          personGender={personGender}
          newSpouseName={quickAdd.newSpouseName}
          setNewSpouseName={quickAdd.setNewSpouseName}
          newSpouseBirthYear={quickAdd.newSpouseBirthYear}
          setNewSpouseBirthYear={quickAdd.setNewSpouseBirthYear}
          newSpouseNote={quickAdd.newSpouseNote}
          setNewSpouseNote={quickAdd.setNewSpouseNote}
          processing={processing}
          onSave={quickAdd.handleQuickAddSpouse}
          onCancel={() => {
            quickAdd.setIsAddingSpouse(false);
            quickAdd.setNewSpouseName("");
            quickAdd.setNewSpouseBirthYear("");
            quickAdd.setNewSpouseNote("");
          }}
          error={error}
        />
      )}
    </div>
  );
}
