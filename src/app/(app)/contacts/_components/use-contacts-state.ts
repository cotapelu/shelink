"use client";

import { useState } from "react";
import type { ExternalContactCategory } from "@prisma/client";
import type { ExternalContactItem } from "./contacts-types";

export function useContactsState() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalContactItem | null>(null);
  const [filter, setFilter] = useState<"ALL" | ExternalContactCategory>("ALL");
  const [search, setSearch] = useState("");

  const handleAdd = () => { setEditing(null); setDialogOpen(true); };
  const handleEdit = (c: ExternalContactItem) => { setEditing(c); setDialogOpen(true); };
  const handleClose = () => setDialogOpen(false);

  return {
    dialogOpen, setDialogOpen,
    editing, setEditing,
    filter, setFilter,
    search, setSearch,
    handleAdd,
    handleEdit,
    handleClose
  };
}
