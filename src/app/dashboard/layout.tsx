import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <>{children}</>;
}

