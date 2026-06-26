"use client";

import { Person } from "@/types";
import { useDashboard } from "@/components/layout/DashboardContext";
import PersonSelector from "@/components/domain/genealogy/members/PersonSelector";

export default function RootSelector({
  persons,
  currentRootId,
}: {
  persons: Person[];
  currentRootId: string;
}) {
  const { setRootId } = useDashboard();

  return (
    <PersonSelector
      persons={persons}
      selectedId={currentRootId}
      onSelect={(id) => {
        if (id) setRootId(id);
      }}
      placeholder="Chọn người..."
      label="Gốc hiển thị"
      className="w-full sm:w-72"
    />
  );
}
