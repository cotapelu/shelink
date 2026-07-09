"use client";

import { useState } from "react";
import api from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";

interface BulkChild {
  name: string;
  gender: "male" | "female" | "other";
  birthYear: string;
  isProcessing: boolean;
}

interface UseBulkAddProps {
  personId: string;
  setError: (err: string | null) => void;
  setProcessing: (p: boolean) => void;
  fetchRelationships: () => Promise<void>;
}

export function useBulkAdd({
  personId,
  setError,
  setProcessing,
  fetchRelationships,
}: UseBulkAddProps) {
  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>("");
  const [bulkChildren, setBulkChildren] = useState<BulkChild[]>([
    { name: "", gender: "male", birthYear: "", isProcessing: false },
  ]);

  const handleBulkAdd = async () => {
    const validChildren = bulkChildren.filter((c) => c.name.trim() !== "");
    if (validChildren.length === 0) {
      setError("Vui lòng nhập ít nhất tên của 1 người con.");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setProcessing(true);
    setError(null);
    let successCount = 0;

    try {
      for (let i = 0; i < validChildren.length; i++) {
        const child = validChildren[i];

        const personPayload: {
          full_name: string;
          gender: "male" | "female" | "other";
          birth_year?: number;
        } = {
          full_name: child.name.trim(),
          gender: child.gender,
        };
        if (child.birthYear.trim() !== "") {
          const year = parseInt(child.birthYear);
          if (!isNaN(year)) personPayload.birth_year = year;
        }

        const personResult = await api.post<{ id: string }>(
          API_ENDPOINTS.PERSONS_CREATE,
          personPayload,
        );

        if (personResult.error || !personResult.data) {
          console.error("Error inserting child:", child.name, personResult.error);
          continue;
        }

        const newChildId = personResult.data.id;

        await api.post(API_ENDPOINTS.RELATIONSHIPS_CREATE, {
          person_a: personId,
          person_b: newChildId,
          type: "biological_child",
        });

        if (selectedSpouseId && selectedSpouseId !== "unknown") {
          await api.post(API_ENDPOINTS.RELATIONSHIPS_CREATE, {
            person_a: selectedSpouseId,
            person_b: newChildId,
            type: "biological_child",
          });
        }

        successCount++;
      }

      if (successCount === validChildren.length) {
        setIsAddingBulk(false);
        setBulkChildren([
          { name: "", gender: "male", birthYear: "", isProcessing: false },
        ]);
        setSelectedSpouseId("");
        fetchRelationships();
      } else {
        setError(
          `Đã xảy ra lỗi. Chỉ lưu thành công ${successCount}/${validChildren.length} người.`,
        );
        setTimeout(() => setError(null), 5000);
        fetchRelationships();
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError("Không thể thêm danh sách con: " + e.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  return {
    isAddingBulk,
    setIsAddingBulk,
    selectedSpouseId,
    setSelectedSpouseId,
    bulkChildren,
    setBulkChildren,
    handleBulkAdd,
  };
}
