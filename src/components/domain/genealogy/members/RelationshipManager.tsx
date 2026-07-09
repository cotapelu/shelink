"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { DashboardContext, useDashboard } from "@/components/layout/DashboardContext";
import { useRelationshipData } from "./use-relationship-data";
import { useBulkAdd } from "./use-bulk-add";
import { useQuickAddSpouse } from "./use-quick-add-spouse";
import { useRelationshipSearch } from "./use-relationship-search";
import { useSaveEdit } from "./use-save-edit";
import RelationshipManagerView from "./RelationshipManagerView";
import { EnrichedRelationship } from "./use-relationship-data";

interface RelationshipManagerProps {
  personId: string;
  isAdmin: boolean;
  canEdit?: boolean;
  personGender: string;
}

export default function RelationshipManager({ personId, isAdmin, canEdit = false, personGender }: RelationshipManagerProps) {
  const [processing, setProcessing] = useState(false), [error, setError] = useState<string | null>(null);
  const rd = useRelationshipData({ personId });
  const bulkAdd = useBulkAdd({ personId, setError, setProcessing, fetchRelationships: rd.fetchRelationships });
  const quickAdd = useQuickAddSpouse({ personId, personGender, setError, setProcessing, fetchRelationships: rd.fetchRelationships });
  const search = useRelationshipSearch({ personId, isAdding: rd.isAdding });
  const handleSaveEdit = useSaveEdit({ editingId: rd.editingId, updateRelationship: rd.updateRelationship, setEditingId: rd.setEditingId, setEditRelNote: rd.setEditRelNote, setProcessing });
  const dc = useContext(DashboardContext); const { setMemberModalId } = useDashboard(); const router = useRouter();
  const handlePersonClick = (id: string) => { if (dc !== undefined) setMemberModalId(id); else router.push(`/dashboard/members/${id}`); };
  const handleEdit = (rel: EnrichedRelationship) => { rd.setEditingId(rel.id); rd.setEditRelType(rel.type); rd.setEditRelTargetPersonId(rel.targetPerson.id); rd.setEditRelNote(rel.note || ""); };
  if (rd.loading) return <div className="text-stone-500 text-sm">Đang tải thông tin gia đình...</div>;
  return <RelationshipManagerView personId={personId} isAdmin={isAdmin} canEdit={canEdit} personGender={personGender} processing={processing} error={error} setError={setError} relationshipData={rd} bulkAdd={bulkAdd} quickAdd={quickAdd} search={search} handlePersonClick={handlePersonClick} handleEdit={handleEdit} handleSaveEdit={handleSaveEdit} deleteRelationship={rd.deleteRelationship} />;
}
