import { DashboardProvider } from "@/components/layout/DashboardContext";
import DashboardViews from "@/components/layout/DashboardViews";
import MemberDetailModal from "@/components/domain/genealogy/members/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Person, Relationship } from "@/types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string }>;
}

export default async function FamilyTreePage({ searchParams }: PageProps) {
  const { rootId } = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    api.setToken(token);
  }

  const authResponse = await api.get<{ id: string; role?: string }>(API_ENDPOINTS.AUTH.ME);
  const user = authResponse.data;

  if (!user) {
    redirect("/login");
  }

  const profileResponse = await api.get<{ role?: string }>(API_ENDPOINTS.PROFILE_BY_ID(user.id));
  const profile = profileResponse.data;

  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const personsResponse = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST, {
    params: { order: "birth_year.asc_nulls_first" }
  });
  const relsResponse = await api.get<Relationship[]>(API_ENDPOINTS.RELATIONSHIPS_LIST);

  const persons = personsResponse.data || [];
  const relationships = relsResponse.data || [];

  const personsMap = new Map<string, Person>();
  persons.forEach((p) => personsMap.set(p.id, p));

  const childIds = new Set(
    relationships
      .filter(
        (r) => r.type === "biological_child" || r.type === "adopted_child",
      )
      .map((r) => r.person_b),
  );

  let finalRootId = rootId;

  if (!finalRootId || !personsMap.has(finalRootId)) {
    const rootsFallback = persons.filter((p) => !childIds.has(p.id));
    if (rootsFallback.length > 0) {
      finalRootId = rootsFallback[0].id;
    } else if (persons.length > 0) {
      finalRootId = persons[0].id;
    }
  }

  return (
    <DashboardProvider>
      <ViewToggle />
      <DashboardViews
        persons={persons}
        relationships={relationships}
        canEdit={canEdit}
      />

      <MemberDetailModal />
    </DashboardProvider>
  );
}