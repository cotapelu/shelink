import { DashboardProvider } from "@/components/layout/DashboardContext";
import DashboardMemberList from "@/components/domain/genealogy/members/DashboardMemberList";
import ViewToggle from "@/components/ViewToggle";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Person, Relationship } from "@/types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function PersonsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; rootId?: string }>;
}) {
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

  // Load persons & relationships for context
  const personsResponse = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST, {
    params: { order: "birth_year.asc_nulls_first" }
  });
  const relsResponse = await api.get<Relationship[]>(API_ENDPOINTS.RELATIONSHIPS_LIST);

  const persons = personsResponse.data || [];
  const relationships = relsResponse.data || [];

  return (
    <DashboardProvider>
      <ViewToggle />
      <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
        <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
              Thành viên
            </h2>
            <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
              Quản lý thông tin các thành viên trong gia phả. Thêm, chỉnh sửa,
              xóa và xem chi tiết.
            </p>
          </div>

          {/* Member List */}
          <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-5 sm:p-8">
            <DashboardMemberList initialPersons={persons} canEdit={canEdit} />
          </div>
        </div>
      </main>
    </DashboardProvider>
  );
}
