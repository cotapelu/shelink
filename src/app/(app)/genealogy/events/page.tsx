import { DashboardProvider } from "@/components/layout/DashboardContext";
import EventsList from "@/components/domain/genealogy/events/EventsList";
import MemberDetailModal from "@/components/domain/genealogy/members/MemberDetailModal";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Person } from "@/types";
import { CustomEventRecord } from "@/utils/eventHelpers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sự kiện gia phả",
};

export default async function EventsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    api.setToken(token);
  }

  const authResponse = await api.get<{ id: string }>(API_ENDPOINTS.AUTH.ME);
  const user = authResponse.data;

  if (!user) redirect("/login");

  const personsResponse = await api.get<Person[]>(API_ENDPOINTS.PERSONS_LIST, {
    params: { select: "id,full_name,birth_year,birth_month,birth_day,death_year,death_month,death_day,is_deceased" }
  });
  const eventsResponse = await api.get<CustomEventRecord[]>(API_ENDPOINTS.EVENTS_LIST);

  const persons = personsResponse.data || [];
  const customEvents = eventsResponse.data || [];

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
          <EventsList persons={persons ?? []} customEvents={customEvents ?? []} />
        </main>
      </div>

      {/* Modal for member details when clicking an event card */}
      <MemberDetailModal />
    </DashboardProvider>
  );
}