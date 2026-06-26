import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";

/**
 * Server Component / Server Action 中读取当前 session。
 * 未登录返回 null。
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * 要求登录，未登录强制跳 /login。
 * 在 Server Component / Server Action 中使用。
 */
export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
