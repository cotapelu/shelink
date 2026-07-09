"use client";

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

function handleBulkAddLogic({
  personId,
  bulkChildren,
  selectedSpouseId,
  setError,
  setProcessing,
  fetchRelationships,
  setBulkChildren,
  setSelectedSpouseId,
}: {
  personId: string;
  bulkChildren: BulkChild[];
  selectedSpouseId: string;
  setError: (err: string | null) => void;
  setProcessing: (p: boolean) => void;
  fetchRelationships: () => Promise<void>;
  setBulkChildren: (c: BulkChild[]) => void;
  setSelectedSpouseId: (id: string) => void;
}) {
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

      const personResult = await fetch(`/api/persons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personPayload),
      }).then(r => r.json());

      if (!personResult.id) {
        console.error("Error inserting child:", child.name, personResult.error);
        continue;
      }

      const newChildId = personResult.id;

      await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_a: personId,
          person_b: newChildId,
          type: "biological_child",
        }),
      });

      if (selectedSpouseId && selectedSpouseId !== "unknown") {
        await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            person_a: selectedSpouseId,
            person_b: newChildId,
            type: "biological_child",
          }),
        });
      }

      successCount++;
    }

    if (successCount === validChildren.length) {
      setBulkChildren([{ name: "", gender: "male", birthYear: "", isProcessing: false }]);
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
}

export function useBulkAdd({ personId, setError, setProcessing, fetchRelationships }: UseBulkAddProps) {
  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>("");
  const [bulkChildren, setBulkChildren] = useState<BulkChild[]>([
    { name: "", gender: "male", birthYear: "", isProcessing: false },
  ]);

  const handleBulkAdd = () =>
    handleBulkAddLogic({
      personId,
      bulkChildren,
      selectedSpouseId,
      setError,
      setProcessing,
      fetchRelationships,
      setBulkChildren,
      setSelectedSpouseId,
    });

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
