import FamilyStats from "@/components/domain/genealogy/stats/FamilyStats";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Person, Relationship } from "@/types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Thống kê gia phả",
};

export default async function StatsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    api.setToken(token);
  }

  const authResponse = await api.get<{ id: string }>(API_ENDPOINTS.AUTH.ME);
  const user = authResponse.data;

  if (!user) redirect("/login");

  const personsResponse = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST);
  const relsResponse = await api.get<Relationship[]>(API_ENDPOINTS.RELATIONSHIPS_LIST);

  const persons = personsResponse.data || [];
  const relationships = relsResponse.data || [];

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800">
          Thống kê gia phả
        </h1>
        <p className="text-stone-500 mt-1 text-sm">
          Tổng quan số liệu về các thành viên trong dòng họ
        </p>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <FamilyStats
          persons={persons ?? []}
          relationships={relationships ?? []}
        />
      </main>
    </div>
  );
}