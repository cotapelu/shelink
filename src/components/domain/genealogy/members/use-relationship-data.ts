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

export interface EnrichedRelationship {
  id: string;
  type: RelationshipType;
  direction: "parent" | "child" | "spouse" | "child_in_law";
  targetPerson: Person;
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

  // Fetch relationships
  const fetchRelationships = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<EnrichedRelationship[]>(
        `/api/relationships?personId=${personId}`
      );
      setRelationships(res.data ?? []);
    } catch (err) {
      console.error("Failed to fetch relationships:", err);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // Add relationship
  const addRelationship = useCallback(async () => {
    if (!newRelTargetPersonId) return;
    try {
      await api.post("/api/relationships", {
        person_a: personId,
        person_b: newRelTargetPersonId,
        type: newRelType,
        note: newRelNote || null,
      });
      setIsAdding(false);
      setNewRelTargetPersonId("");
      setNewRelNote("");
      fetchRelationships();
    } catch (err) {
      console.error("Failed to add relationship:", err);
    }
  }, [personId, newRelTargetPersonId, newRelType, newRelNote, fetchRelationships]);

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
