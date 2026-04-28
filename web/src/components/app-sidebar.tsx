"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Database,
  GitBranch,
  FormInput,
  ScrollText,
  FileText,
  MessageSquare,
  Clock,
  Building2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const dataNav: NavItem[] = [
  { href: "/dashboard", title: "Tổng quan", icon: LayoutDashboard },
  { href: "/collections", title: "Bảng dữ liệu", icon: Database },
  { href: "/workflows", title: "Quy trình", icon: GitBranch },
  { href: "/forms", title: "Form nhập liệu", icon: FormInput },
  { href: "/files", title: "Tệp tin", icon: FileText },
];

const adminNav: NavItem[] = [
  { href: "/users", title: "Người dùng", icon: Users },
  { href: "/sessions", title: "Phiên chat", icon: MessageSquare },
  { href: "/crons", title: "Lịch tự động", icon: Clock },
  { href: "/audit", title: "Lịch sử thao tác", icon: ScrollText },
];

const superNav: NavItem[] = [
  { href: "/tenants", title: "Cơ sở (tenants)", icon: Building2 },
];

interface AppSidebarProps {
  tenantName: string | null;
  userDisplayName: string;
  userRole: string;
  isSuperAdmin: boolean;
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.title}
        render={<Link href={item.href} />}
      >
        <item.icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  tenantName,
  userDisplayName,
  userRole,
  isSuperAdmin,
}: AppSidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-2.5">
          <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/30">
            <Sparkles className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold tracking-tight">SkillBot</span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {tenantName ?? "—"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dữ liệu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataNav.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quản trị</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Hệ thống</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superNav.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item.href)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/account" />}>
              <Avatar className="size-8 ring-2 ring-sidebar-primary/30">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
                  {userDisplayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userDisplayName}</span>
                <span className="truncate text-xs text-sidebar-foreground/60 capitalize flex items-center gap-1">
                  {isSuperAdmin && <ShieldCheck className="size-3" />}
                  {isSuperAdmin ? "Super Admin" : userRole}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
