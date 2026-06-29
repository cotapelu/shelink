/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { DashboardProvider } from "@/components/layout/DashboardContext";
import DashboardViews from "@/components/layout/DashboardViews";
import MemberDetailModal from "@/components/domain/genealogy/members/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import { getPersons } from "@/server/genealogy/actions";
import { getRelationships } from "@/server/genealogy/actions";
import type { Person, Relationship } from "@/types";

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string }>;
}

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

export default async function FamilyTreePage({ searchParams }: PageProps) {
  const { rootId } = await searchParams;

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const canEdit = session.user.role === "ADMIN" || session.user.role === "EDITOR";

  // Load all persons and relationships via server actions
  const { persons: prismaPersons } = await getPersons({ page: 1, limit: 1000 });
  const relsData = await getRelationships();

  const persons: Person[] = prismaPersons.map(mapPrismaPerson);
  const relationships: Relationship[] = relsData.map(mapRelationship);

  const personsMap = new Map<string, Person>();
  persons.forEach((p) => personsMap.set(p.id, p));

  const childIds = new Set(
    relationships
      .filter(
        (r) => r.type === "biological_child" || r.type === "adopted_child"
      )
      .map((r) => r.person_b)
  );

  let finalRootId = rootId;

  if (!finalRootId || !personsMap.has(finalRootId)) {
    const rootsFallback = persons.filter((p) => !childIds.has(p.id));
    if (rootsFallback.length > 0) {
      finalRootId = rootsFallback[0].id;
    } else if (persons.length > 0) {
      finalRootId = persons[0].id;
    }
  }

  return (
    <DashboardProvider>
      <ViewToggle />
      <DashboardViews
        persons={persons}
        relationships={relationships}
        canEdit={canEdit}
      />

      <MemberDetailModal />
    </DashboardProvider>
  );
}
