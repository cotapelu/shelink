import LineageManager from "@/components/domain/genealogy/familytree/LineageManager";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Person, Relationship } from "@/types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function LineagePage() {
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

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const personsResponse = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST, {
    params: { order: "birth_year.asc_nulls_first" }
  });
  const relsResponse = await api.get<Relationship[]>(API_ENDPOINTS.RELATIONSHIPS_LIST);

  const persons = personsResponse.data || [];
  const relationships = relsResponse.data || [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
            Thứ tự gia phả
          </h2>
          <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
            Tự động tính toán và cập nhật{" "}
            <strong className="text-stone-700">thế hệ</strong> (đời thứ mấy tính
            từ tổ) và <strong className="text-stone-700">thứ tự sinh</strong>{" "}
            (con trưởng, con thứ…) cho tất cả thành viên. Xem preview trước khi
            áp dụng.
          </p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/60 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌳</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">
                  Thế hệ (Generation)
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Dùng thuật toán BFS từ các tổ tiên gốc (người chưa có thông
                  tin bố/mẹ trong hệ thống). Tổ tiên = Đời 1, con = Đời 2, cháu
                  = Đời 3... Con dâu/rể kế thừa đời của người bạn đời.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/60 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👶</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">
                  Thứ tự sinh (Birth Order)
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Trong danh sách anh/chị/em cùng cha, sắp xếp theo năm sinh
                  tăng dần và gán số thứ tự 1, 2, 3... Con dâu/rể không được
                  tính thứ tự.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Manager */}
        <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-5 sm:p-8">
          <LineageManager persons={persons} relationships={relationships} />
        </div>
      </div>
    </main>
  );
}