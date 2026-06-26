import { DashboardProvider } from "@/components/layout/DashboardContext";
import EventsList from "@/components/domain/genealogy/events/EventsList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import { getPersons } from "@/server/genealogy/actions";
import { getEvents } from "@/server/genealogy/actions";
import type { Person } from "@/types";
import { CustomEventRecord } from "@/utils/eventHelpers";

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

function mapPrismaEventToCustom(e: any): CustomEventRecord {
  return {
    id: e.id,
    name: e.name || e.type,
    content: e.description,
    event_date: e.eventDate.toISOString().split("T")[0],
    location: e.location,
    created_by: null,
  };
}

export const metadata = {
  title: "Sự kiện gia phả",
};

export default async function EventsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Load all persons for events computation
  const { persons: prismaPersons } = await getPersons({ page: 1, limit: 100 });
  const persons: Person[] = prismaPersons.map(mapPrismaPerson);

  // Load events
  const eventsData = await getEvents();
  const customEvents: CustomEventRecord[] = eventsData.map(mapPrismaEventToCustom);

  return (
    <DashboardProvider>
      <div className="flex-1 w-full relative flex flex-col pb-12">
        <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800">
            Sự kiện gia phả
          </h1>
          <p className="text-stone-500 mt-1 text-sm">
            Sinh nhật, ngày giỗ (âm lịch) và các sự kiện tuỳ chỉnh
          </p>
        </div>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
          <EventsList persons={persons} customEvents={customEvents} />
        </main>
      </div>
    </DashboardProvider>
  );
}
