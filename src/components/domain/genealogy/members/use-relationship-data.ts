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
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api/client";
import { getToken } from "@/lib/storage/auth";
import { Person, RelationshipType } from "@/types";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

export interface EnrichedRelationship {
  id: string;
  type: RelationshipType;
  direction: "parent" | "child" | "spouse" | "child_in_law";
  targetPerson: Person;
  note: string | null;
}

interface RelationshipApiResponse {
  id: string;
  type: RelationshipType;
  person_a: string;
  person_b: string;
  person_a_data?: Person;
  person_b_data?: Person;
  note: string | null;
}

interface UseRelationshipDataProps {
  personId: string;
}

export function useRelationshipData({ personId }: UseRelationshipDataProps) {
  const [relationships, setRelationships] = useState<EnrichedRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Relationship State
  const [isAdding, setIsAdding] = useState(false);
  const [newRelType, setNewRelType] =
    useState<RelationshipType>("biological_child");
  const [newRelDirection, setNewRelDirection] = useState<
    "parent" | "child" | "spouse"
  >("parent");
  const [newRelTargetPersonId, setNewRelTargetPersonId] = useState("");
  const [newRelNote, setNewRelNote] = useState("");

  // Edit Relationship State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRelType, setEditRelType] = useState<RelationshipType>("biological_child");
  const [editRelTargetPersonId, setEditRelTargetPersonId] = useState("");
  const [editRelNote, setEditRelNote] = useState("");

  const router = useRouter();

  // Initialize API token
  useEffect(() => {
    const token = getToken();
    if (token) {
      api.setToken(token);
    }
  }, []);

  // Fetch relationships helpers
  const buildBaseEnrichedRels = useCallback((data: RelationshipApiResponse[], pid: string): EnrichedRelationship[] => {
    const formattedRels: EnrichedRelationship[] = [];
    data.forEach((r) => {
      let direction: "parent" | "child" | "spouse" | "child_in_law" = "spouse";
      if (r.type === "marriage") direction = "spouse";
      else if (r.type === "biological_child" || r.type === "adopted_child") {
        direction = r.person_a === pid ? "child" : "parent";
      }

      formattedRels.push({
        id: r.id,
        type: r.type,
        direction,
        targetPerson: r.person_a === pid
          ? (r.person_b_data as Person)
          : (r.person_a_data as Person),
        note: r.note,
      });
    });
    return formattedRels;
  }, []);

  const fetchChildInLawRels = useCallback(async (childrenIds: string[]): Promise<EnrichedRelationship[]> => {
    if (childrenIds.length === 0) return [];
    const marriagesResult = await api.get<RelationshipApiResponse[]>(
      API_ENDPOINTS.RELATIONSHIPS_LIST,
      {
        params: {
          type: "marriage",
          person_ids: childrenIds.join(","),
        },
      }
    );
    const inLawRels: EnrichedRelationship[] = [];
    marriagesResult.data?.forEach((m) => {
      const isAChild = childrenIds.includes(m.person_a);
      const childPerson = isAChild ? m.person_a_data : m.person_b_data;
      const spousePerson = isAChild ? m.person_b_data : m.person_a_data;
      if (!spousePerson || !childPerson) return;
      const spouseGender = spousePerson.gender;
      let noteLabel = `Vợ/chồng của ${childPerson.full_name}`;
      if (spouseGender === "female")
        noteLabel = `Con dâu (vợ của ${childPerson.full_name})`;
      if (spouseGender === "male")
        noteLabel = `Con rể (chồng của ${childPerson.full_name})`;
      if (m.note) noteLabel += ` - ${m.note}`;
      inLawRels.push({
        id: m.id + "_inlaw",
        type: "marriage",
        direction: "child_in_law",
        targetPerson: spousePerson,
        note: noteLabel,
      });
    });
    return inLawRels;
  }, []);

  // Fetch relationships
  const fetchRelationships = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<RelationshipApiResponse[]>(
        API_ENDPOINTS.RELATIONSHIPS_LIST,
        { params: { person_id: personId } }
      );
      if (res.error) throw new Error(res.error);
      const baseRels = buildBaseEnrichedRels(res.data ?? [], personId);
      const childrenIds = baseRels
        .filter((r) => r.direction === "child")
        .map((r) => r.targetPerson.id);
      const inLawRels = await fetchChildInLawRels(childrenIds);
      setRelationships([...baseRels, ...inLawRels]);
    } catch (err) {
      console.error("Failed to fetch relationships:", err);
    } finally {
      setLoading(false);
    }
  }, [personId, buildBaseEnrichedRels, fetchChildInLawRels]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // Add relationship
  const addRelationship = useCallback(async () => {
    if (!newRelTargetPersonId) return;
    try {
      let personA = personId;
      let personB = newRelTargetPersonId;
      let type: RelationshipType = newRelType;

      if (newRelDirection === "parent") {
        personA = newRelTargetPersonId;
        personB = personId;
      } else if (newRelDirection === "spouse") {
        type = "marriage";
      }

      await api.post("/api/relationships", {
        person_a: personA,
        person_b: personB,
        type,
        note: newRelNote || null,
      });
      setIsAdding(false);
      setNewRelTargetPersonId("");
      setNewRelNote("");
      fetchRelationships();
    } catch (err) {
      console.error("Failed to add relationship:", err);
    }
  }, [personId, newRelTargetPersonId, newRelDirection, newRelType, newRelNote, fetchRelationships]);

  // Update relationship
  const updateRelationship = useCallback(
    async (id: string) => {
      try {
        await api.put(`/api/relationships/${id}`, {
          type: editRelType,
          note: editRelNote || null,
        });
        setEditingId(null);
        fetchRelationships();
      } catch (err) {
        console.error("Failed to update relationship:", err);
      }
    },
    [editRelType, editRelNote, fetchRelationships]
  );

  // Delete relationship
  const deleteRelationship = useCallback(
    async (id: string) => {
      if (!confirm("确定删除这层关系？")) return;
      try {
        await api.delete(`/api/relationships/${id}`);
        fetchRelationships();
      } catch (err) {
        console.error("Failed to delete relationship:", err);
      }
    },
    [fetchRelationships]
  );

  return {
    relationships,
    loading,
    // Add state
    isAdding,
    setIsAdding,
    newRelType,
    setNewRelType,
    newRelDirection,
    setNewRelDirection,
    newRelTargetPersonId,
    setNewRelTargetPersonId,
    newRelNote,
    setNewRelNote,
    // Edit state
    editingId,
    setEditingId,
    editRelType,
    setEditRelType,
    editRelTargetPersonId,
    setEditRelTargetPersonId,
    editRelNote,
    setEditRelNote,
    // Actions
    fetchRelationships,
    addRelationship,
    updateRelationship,
    deleteRelationship,
  };
}
