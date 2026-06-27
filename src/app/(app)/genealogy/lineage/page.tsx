import LineageManager from "@/components/domain/genealogy/familytree/LineageManager";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import { getPersons } from "@/server/genealogy/actions";
import { getRelationships } from "@/server/genealogy/actions";
import type { Person, Relationship } from "@/types";

function mapPrismaPerson(p: any): Person {
  const genderMap: Record<string, "male" | "female" | "other"> = {
    MALE: "male",
    FEMALE: "female",
    OTHER: "other",
  };
  return {
    id: p.id,
    full_name: p.fullName,
    gender: genderMap[p.gender] || "other",
    birth_year: p.birthYear ?? null,
    birth_month: p.birthMonth ?? null,
    birth_day: p.birthDay ?? null,
    death_year: p.deathYear ?? null,
    death_month: p.deathMonth ?? null,
    death_day: p.deathDay ?? null,
    avatar_url: p.avatarUrl ?? null,
    note: p.note ?? null,
    phone_number: p.phoneNumber ?? null,
    occupation: p.occupation ?? null,
    current_residence: p.currentResidence ?? null,
    is_deceased: p.isDeceased,
    is_in_law: p.isInLaw,
    birth_order: p.birthOrder ?? null,
    generation: p.generation ?? null,
    other_names: p.otherNames ?? null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

function mapRelationship(r: any): Relationship {
  return {
    id: r.id,
    type: r.type.toLowerCase() as any,
    person_a: r.fromPersonId,
    person_b: r.toPersonId,
    note: r.note ?? null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

export default async function LineagePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Only admin can access lineage management
  if (session.user.role !== "ADMIN" && session.user.role !== "LAWYER") {
    redirect("/dashboard");
  }

  // Load all persons and relationships
  const { persons: prismaPersons } = await getPersons({ page: 1, limit: 100 });
  const relsData = await getRelationships();

  const persons: Person[] = prismaPersons.map(mapPrismaPerson);
  const relationships: Relationship[] = relsData.map(mapRelationship);

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
                  (nhỏ đến lớn). Được tính từ <strong>cùng một cha và cùng một
                  mẹ</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lineage Manager */}
        <LineageManager
          persons={persons}
          relationships={relationships}
        />
      </div>
    </main>
  );
}
