import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getExpressSettingsPublic } from "@/server/express/actions";
import { ExpressSettingsForm } from "./_components/express-settings-form";

export default async function ExpressSettingsPage() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");
  const current = await getExpressSettingsPublic();
  return <ExpressSettingsForm initial={current} />;
}
