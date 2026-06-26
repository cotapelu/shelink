import KinshipFinder from "@/components/domain/genealogy/familytree/KinshipFinder";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Person, Relationship } from "@/types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Tra cứu danh xưng",
};

export default async function KinshipPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    api.setToken(token);
  }

  const authResponse = await api.get<{ id: string }>(API_ENDPOINTS.AUTH.ME);
  const user = authResponse.data;

  if (!user) redirect("/login");

  const personsResponse = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST, {
    params: { select: "id,full_name,gender,birth_year,birth_order,generation,is_in_law" }
  });
  const relsResponse = await api.get<Relationship[]>(API_ENDPOINTS.RELATIONSHIPS_LIST, {
    params: { select: "type,person_a,person_b" }
  });

  const persons = personsResponse.data || [];
  const relationships = relsResponse.data || [];

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800">
          Tra cứu danh xưng
        </h1>
        <p className="text-stone-500 mt-1 text-sm">
          Chọn hai thành viên để tự động tính cách gọi theo quan hệ gia phả
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <KinshipFinder
          persons={persons ?? []}
          relationships={relationships ?? []}
        />
      </main>
    </div>
  );
}
