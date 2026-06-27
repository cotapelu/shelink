import KinshipFinder from "@/components/domain/genealogy/familytree/KinshipFinder";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import { getPersons } from "@/server/genealogy/actions";
import { getRelationships } from "@/server/genealogy/actions";

interface PersonNode {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_order: number | null;
  generation: number | null;
  is_in_law: boolean;
  avatar_url?: string | null;
}

interface RelEdge {
  type: string;
  person_a: string;
  person_b: string;
}

function mapPerson(p: any): PersonNode {
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
    birth_order: p.birthOrder ?? null,
    generation: p.generation ?? null,
    is_in_law: p.isInLaw,
    avatar_url: p.avatarUrl ?? null,
  };
}

function mapRel(r: any): RelEdge {
  return {
    type: r.type.toLowerCase(),
    person_a: r.fromPersonId,
    person_b: r.toPersonId,
  };
}

export const metadata = {
  title: "Tra cứu danh xưng",
};

export default async function KinshipPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Load data via server actions
  const { persons: prismaPersons } = await getPersons({ page: 1, limit: 100 });
  const relsData = await getRelationships();

  const persons: PersonNode[] = prismaPersons.map(mapPerson);
  const relationships: RelEdge[] = relsData.map(mapRel);

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
        <KinshipFinder persons={persons} relationships={relationships} />
      </main>
    </div>
  );
}
