import AdminUserList from "@/components/domain/genealogy/members/AdminUserList";
import { AdminUserData } from "@/types";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    api.setToken(token);
  }

  const authResponse = await api.get<{ id: string }>(API_ENDPOINTS.AUTH.ME);
  const user = authResponse.data;

  if (!user) {
    redirect("/login");
  }

  const profileResponse = await api.get<{ role?: string }>(API_ENDPOINTS.PROFILE_BY_ID(user.id));
  const profile = profileResponse.data;

  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const usersResponse = await api.get<AdminUserData[]>(API_ENDPOINTS.USERS_LIST);

  const typedUsers = usersResponse.data || [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      {/* Decorative background blurs */}
      {/* <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-[100px] pointer-events-none" /> */}
      {/* <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
              Quản lý Người dùng
            </h2>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Danh sách các tài khoản đang tham gia vào hệ thống.
            </p>
          </div>
        </div>
        <AdminUserList initialUsers={typedUsers} currentUserId={user.id} />
      </div>
    </main>
  );
}
