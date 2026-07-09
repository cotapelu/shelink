"use client";

import { useState } from "react";
import api from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";

interface UseQuickAddSpouseProps {
  personId: string;
  personGender: string;
  setError: (err: string | null) => void;
  setProcessing: (p: boolean) => void;
  fetchRelationships: () => Promise<void>;
}

async function handleQuickAddSpouseLogic({
  personId,
  personGender,
  newSpouseName,
  newSpouseBirthYear,
  newSpouseNote,
  setNewSpouseName,
  setNewSpouseBirthYear,
  setNewSpouseNote,
  setError,
  setProcessing,
  fetchRelationships,
  setIsAddingSpouse,
}: {
  personId: string;
  personGender: string;
  newSpouseName: string;
  newSpouseBirthYear: string;
  newSpouseNote: string;
  setNewSpouseName: (n: string) => void;
  setNewSpouseBirthYear: (y: string) => void;
  setNewSpouseNote: (n: string) => void;
  setError: (err: string | null) => void;
  setProcessing: (p: boolean) => void;
  fetchRelationships: () => Promise<void>;
  setIsAddingSpouse: (v: boolean) => void;
}) {
  if (!newSpouseName.trim()) {
    setError("Vui lòng nhập tên Vợ/Chồng.");
    setTimeout(() => setError(null), 5000);
    return;
  }

  setProcessing(true);
  setError(null);
  try {
    const newSpouseGender =
      personGender === "male"
        ? "female"
        : personGender === "female"
          ? "male"
          : "female";

    const personPayload: {
      full_name: string;
      gender: "male" | "female" | "other";
      birth_year?: number;
    } = {
      full_name: newSpouseName.trim(),
      gender: newSpouseGender,
    };

    if (newSpouseBirthYear.trim() !== "") {
      const year = parseInt(newSpouseBirthYear);
      if (!isNaN(year)) personPayload.birth_year = year;
    }

    const personResult = await api.post<{ id: string }>(
      API_ENDPOINTS.PERSONS_CREATE,
      personPayload
    );

    if (personResult.error || !personResult.data)
      throw new Error(personResult.error);

    const newSpouseId = personResult.data.id;

    await api.post(API_ENDPOINTS.RELATIONSHIPS_CREATE, {
      person_a: personId,
      person_b: newSpouseId,
      type: "marriage",
      note: newSpouseNote.trim() || null,
    });

    setIsAddingSpouse(false);
    setNewSpouseName("");
    setNewSpouseBirthYear("");
    setNewSpouseNote("");
    fetchRelationships();
  } catch (err: unknown) {
    const e = err as Error;
    setError("Không thể thêm vợ/chồng: " + e.message);
    setTimeout(() => setError(null), 5000);
  } finally {
    setProcessing(false);
  }
}

export function useQuickAddSpouse({
  personId,
  personGender,
  setError,
  setProcessing,
  fetchRelationships,
}: UseQuickAddSpouseProps) {
  const [isAddingSpouse, setIsAddingSpouse] = useState(false);
  const [newSpouseName, setNewSpouseName] = useState("");
  const [newSpouseBirthYear, setNewSpouseBirthYear] = useState("");
  const [newSpouseNote, setNewSpouseNote] = useState("");

  const handleQuickAddSpouse = () =>
    handleQuickAddSpouseLogic({
      personId,
      personGender,
      newSpouseName,
      newSpouseBirthYear,
      newSpouseNote,
      setNewSpouseName,
      setNewSpouseBirthYear,
      setNewSpouseNote,
      setError,
      setProcessing,
      fetchRelationships,
      setIsAddingSpouse,
    });

  return {
    isAddingSpouse,
    setIsAddingSpouse,
    newSpouseName,
    setNewSpouseName,
    newSpouseBirthYear,
    setNewSpouseBirthYear,
    newSpouseNote,
    setNewSpouseNote,
    handleQuickAddSpouse,
  };
}
