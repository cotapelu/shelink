import AdminUserList from "@/components/domain/genealogy/members/AdminUserList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import { getUsers } from "@/server/genealogy/users/actions";
import type { AdminUserData } from "@/types";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Load users via server action
  const users = await getUsers();

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
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
        <AdminUserList initialUsers={users as any} currentUserId={session.user.id} />
      </div>
    </main>
  );
}
