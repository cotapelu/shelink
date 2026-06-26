import DeleteMemberButton from "@/components/domain/genealogy/members/DeleteMemberButton";
import MemberDetailContent from "@/components/domain/genealogy/members/MemberDetailContent";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Person } from "@/types";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    api.setToken(token);
  }

  const { id } = await params;

  const authResponse = await api.get<{ id: string }>(API_ENDPOINTS.AUTH.ME);
  const user = authResponse.data;

  if (!user) {
    redirect("/login");
  }

  const profileResponse = await api.get<{ role?: string }>(API_ENDPOINTS.PROFILE_BY_ID(user.id));
  const profile = profileResponse.data;

  const isAdmin = profile?.role === "admin";
  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const personResponse = await api.get<Person>(API_ENDPOINTS.PERSON_BY_ID(id));
  const person = personResponse.data;

  if (!person) {
    notFound();
  }

  let privateData = null;
  if (isAdmin) {
    const privateResponse = await api.get<{ data: Record<string, unknown> }>(`/person-details-private/${id}`);
    privateData = privateResponse.data?.data || null;
  }

  return (
    <div className="flex-1 w-full relative flex flex-col pb-8">
      {/* Decorative background blurs */}
      {/* <div className="absolute -top-[20%] left-0 w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-[120px] pointer-events-none" /> */}
      {/* <div className="absolute top-[40%] right-0 w-[400px] h-[400px] bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className="w-full relative z-20 py-4 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex items-center justify-between">
        <Link
          href="/dashboard"
          className="group flex items-center text-stone-500 hover:text-amber-700 font-medium text-sm transition-colors"
        >
          <span className="mr-1 group-hover:-translate-x-1 transition-transform">
            ←
          </span>
          Quay lại
        </Link>
        {canEdit && (
          <div className="flex items-center gap-2.5">
            <Link
              href={`/dashboard/members/${id}/edit`}
              className="px-4 py-2 bg-stone-100/80 text-stone-700 rounded-lg hover:bg-stone-200 hover:text-stone-900 font-medium text-sm transition-all shadow-sm"
            >
              Chỉnh sửa
            </Link>
            <DeleteMemberButton memberId={id} />
          </div>
        )}
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 w-full flex-1">
        <div className="bg-white/60 rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <MemberDetailContent
            person={person}
            privateData={privateData}
            isAdmin={isAdmin}
            canEdit={canEdit}
          />
        </div>
      </main>
    </div>
  );
}