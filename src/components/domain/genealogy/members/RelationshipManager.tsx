/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2025
 */
"use client";

import { DashboardContext, useDashboard } from "@/components/layout/DashboardContext";
import { Person, RelationshipType } from "@/types";
import { formatDisplayDate } from "@/utils/dateHelpers";
import api from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { useRelationshipData } from "./use-relationship-data";
import RelationshipCard from "./RelationshipCard";
import EditRelationshipDialog from "./EditRelationshipDialog";
import AddRelationshipForm from "./AddRelationshipForm";
import BulkAddChildrenForm from "./BulkAddChildrenForm";
import QuickAddSpouseForm from "./QuickAddSpouseForm";
import RelationshipSection from "./RelationshipSection";
import { useBulkAdd } from "./use-bulk-add";
import { useQuickAddSpouse } from "./use-quick-add-spouse";

interface RelationshipManagerProps {
  personId: string;
  isAdmin: boolean;
  canEdit?: boolean;
  personGender: string;
}

interface EnrichedRelationship {
  id: string;
  type: RelationshipType;
  direction: "parent" | "child" | "spouse" | "child_in_law";
  targetPerson: Person;
  note: string | null;
}

export default function RelationshipManager({
  personId,
  isAdmin,
  canEdit = false,
  personGender,
}: RelationshipManagerProps) {
  const dashboardContext = useContext(DashboardContext);
  const { setMemberModalId } = useDashboard();
  const router = useRouter();

  const relationshipData = useRelationshipData({ personId });
  const {
    relationships,
    loading,
    isAdding,
    setIsAdding,
    newRelType,
    setNewRelType,
    newRelDirection,
    setNewRelDirection,
    newRelTargetPersonId: selectedTargetId,
    setNewRelTargetPersonId: setSelectedTargetId,
    newRelNote,
    setNewRelNote,
    fetchRelationships,
    updateRelationship,
    editingId,
    setEditingId,
    editRelType,
    setEditRelType,
    editRelTargetPersonId,
    setEditRelTargetPersonId,
    editRelNote,
    setEditRelNote,
    deleteRelationship,
  } = relationshipData;

  // If inside DashboardProvider → open modal; otherwise → navigate to full page
  const handlePersonClick = (id: string) => {
    if (dashboardContext !== undefined) {
      setMemberModalId(id);
    } else {
      router.push(`/dashboard/members/${id}`);
    }
  };

  // Edit relationship
  const handleEdit = (rel: EnrichedRelationship) => {
    setEditingId(rel.id);
    setEditRelType(rel.type);
    setEditRelTargetPersonId(rel.targetPerson.id);
    setEditRelNote(rel.note || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setProcessing(true);
    try {
      await updateRelationship(editingId);
      setEditingId(null);
      setEditRelNote("");
    } finally {
      setProcessing(false);
    }
  };

  // UI state (search, etc.)
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [recentMembers, setRecentMembers] = useState<Person[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk & Quick logic extracted into custom hooks
  const bulkAdd = useBulkAdd({
    personId,
    setError,
    setProcessing,
    fetchRelationships,
  });

  const quickAdd = useQuickAddSpouse({
    personId,
    personGender,
    setError,
    setProcessing,
    fetchRelationships,
  });

  // Search for people to add
  useEffect(() => {
    const searchPeople = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      const result = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST, {
        params: { search: searchTerm, exclude_id: personId, limit: 5 },
      });

      if (result.data) setSearchResults(result.data);
    };

    const timeoutId = setTimeout(searchPeople, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, personId]);

  // Fetch recent members when opening Add form
  useEffect(() => {
    if (isAdding && recentMembers.length === 0) {
      const fetchRecent = async () => {
        const result = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST, {
          params: { exclude_id: personId, order: "created_at.desc", limit: 10 },
        });
        if (result.data) setRecentMembers(result.data);
      };
      fetchRecent();
    }
  }, [isAdding, personId, recentMembers.length]);

  const groupByType = (type: string) =>
    relationships.filter((r) => r.direction === type);

  const editRel = editingId ? relationships.find(r => r.id === editingId) ?? null : null;

  if (loading)
    return (
      <div className="text-stone-500 text-sm">
        Đang tải thông tin gia đình...
      </div>
    );

  return (
    <div className="space-y-6">
      {["parent", "spouse", "child", "child_in_law"].map((group) => (
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

      {/* Edit Relationship Dialog */}
      {editingId && editRel && (
        <EditRelationshipDialog
          rel={editRel}
          type={editRelType}
          setType={setEditRelType}
          note={editRelNote}
          setNote={setEditRelNote}
          onSave={handleSaveEdit}
          onCancel={() => {
            setEditingId(null);
            setEditRelNote("");
          }}
          processing={processing}
        />
      )}

      {/* Add Button (Admin) */}
      {canEdit && !isAdding && !bulkAdd.isAddingBulk && !quickAdd.isAddingSpouse && !editingId && (
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={() => setIsAdding(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-amber-400 hover:text-amber-700 transition-all duration-200"
          >
            + Thêm Quan Hệ
          </button>

          <button
            onClick={() => bulkAdd.setIsAddingBulk(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-sky-400 hover:text-sky-700 transition-all duration-200"
          >
            + Thêm Con
          </button>

          <button
            onClick={() => quickAdd.setIsAddingSpouse(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-rose-400 hover:text-rose-700 transition-all duration-200"
          >
            + Thêm Vợ/Chồng
          </button>
        </div>
      )}

      {error && !isAdding && !bulkAdd.isAddingBulk && !quickAdd.isAddingSpouse && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 transition-colors p-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Add Form (Admin) */}
      {canEdit && isAdding && (
        <AddRelationshipForm
          personId={personId}
          newRelNote={newRelNote}
          setNewRelNote={setNewRelNote}
          newRelDirection={newRelDirection}
          setNewRelDirection={setNewRelDirection}
          newRelType={newRelType}
          setNewRelType={setNewRelType}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          recentMembers={recentMembers}
          selectedTargetId={selectedTargetId}
          setSelectedTargetId={setSelectedTargetId}
          addRelationship={relationshipData.addRelationship}
          processing={processing}
          onCancel={() => {
            setIsAdding(false);
            setSelectedTargetId("");
            setSearchTerm("");
            setNewRelNote("");
          }}
        />
      )}

      {/* Bulk Add Children Form (Admin) */}
      {canEdit && bulkAdd.isAddingBulk && (
        <BulkAddChildrenForm
          spouses={groupByType("spouse").map(rel => ({
            id: rel.targetPerson.id,
            full_name: rel.targetPerson.full_name,
            note: rel.note,
          }))}
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

      {/* Quick Add Spouse Form (Admin) */}
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
