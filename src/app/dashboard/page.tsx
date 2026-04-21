import { redirect } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return <StudioShell email={session.user.email} />;
}
