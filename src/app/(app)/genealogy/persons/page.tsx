/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
import { DashboardProvider } from "@/components/layout/DashboardContext";
import DashboardMemberList from "@/components/domain/genealogy/members/DashboardMemberList";
import ViewToggle from "@/components/ViewToggle";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import { getPersons } from "@/server/genealogy/actions";
import type { Person } from "@/types";

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



export default async function PersonsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Load persons via server action
  const { persons: prismaPersons } = await getPersons({ page: 1, limit: 100 });
  const persons: Person[] = prismaPersons.map(mapPrismaPerson);



  // Determine edit permissions (simplified)
  const canEdit = session.user.role === "ADMIN" || session.user.role === "EDITOR";

  return (
    <DashboardProvider>
      <ViewToggle />
      <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
        <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
              Quản lý thành viên
            </h2>
            <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
              Danh sách các thành viên trong gia phả. Thêm, sửa, xóa và xem mối quan hệ.
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              {/* TODO: Search input */}
            </div>
            <div className="flex items-center gap-2">
              {/* TODO: Add person button */}
            </div>
          </div>

          {/* Member List */}
          <DashboardMemberList
            initialPersons={persons}
            canEdit={canEdit}
          />
        </div>
      </main>
    </DashboardProvider>
  );
}
