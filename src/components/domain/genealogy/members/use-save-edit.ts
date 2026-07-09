"use client";

import { useCallback } from "react";

interface UseSaveEditProps {
  editingId: string | null;
  updateRelationship: (id: string) => Promise<void>;
  setEditingId: (id: string | null) => void;
  setEditRelNote: (note: string) => void;
  setProcessing: (p: boolean) => void;
}

export function useSaveEdit({
  editingId,
  updateRelationship,
  setEditingId,
  setEditRelNote,
  setProcessing,
}: UseSaveEditProps) {
  return useCallback(async () => {
    if (!editingId) return;
    setProcessing(true);
    try {
      await updateRelationship(editingId);
      setEditingId(null);
      setEditRelNote("");
    } finally {
      setProcessing(false);
    }
  }, [editingId, updateRelationship, setEditingId, setEditRelNote, setProcessing]);
}
