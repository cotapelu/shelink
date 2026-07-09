"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { Person } from "@/types";

interface UseRelationshipSearchProps {
  personId: string;
  isAdding: boolean;
}

export function useRelationshipSearch({ personId, isAdding }: UseRelationshipSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [recentMembers, setRecentMembers] = useState<Person[]>([]);

  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      const result = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST, { params: { search: searchTerm, exclude_id: personId, limit: 5 } });
      if (result.data) setSearchResults(result.data);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, personId]);

  useEffect(() => {
    if (isAdding && recentMembers.length === 0) {
      (async () => {
        const result = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST, { params: { exclude_id: personId, order: "created_at.desc", limit: 10 } });
        if (result.data) setRecentMembers(result.data);
      })();
    }
  }, [isAdding, personId, recentMembers.length]);

  return { searchTerm, setSearchTerm, searchResults, setSearchResults, recentMembers, setRecentMembers };
}
