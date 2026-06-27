import FamilyStats from "@/components/domain/genealogy/stats/FamilyStats";
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

export const metadata = {
  title: "Thống kê gia phả",
};

export default async function StatsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Load all data
  const { persons: prismaPersons } = await getPersons({ page: 1, limit: 100 });
  const relsData = await getRelationships();

  const persons: Person[] = prismaPersons.map(mapPrismaPerson);
  const relationships: Relationship[] = relsData.map(mapRelationship);

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
        <FamilyStats persons={persons} relationships={relationships} />
      </main>
    </div>
  );
}
