import { redirect } from "next/navigation";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

async function logout() {
  "use server";
  try {
    await api.logout();
  } catch {
    // ignore — we still clear the local cookie
  }
  await clearSessionCookie();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me || !me.user) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar
        tenantName={me.tenant?.name ?? null}
        userDisplayName={me.user.displayName}
        userRole={me.user.role}
        isSuperAdmin={me.session.isSuperAdmin}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              <span className="ml-2 hidden sm:inline">Đăng xuất</span>
            </Button>
          </form>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
