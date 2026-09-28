import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { cookieNames } from "@/lib/spotify/session";

export default async function DashboardPage() {
  const store = await cookies();
  if (!store.has(cookieNames.access) && !store.has(cookieNames.refresh))
    redirect("/");
  return <Dashboard />;
}
