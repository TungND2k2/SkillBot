import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  GitBranch,
  Users,
  ScrollText,
  Clock,
  FileText,
  FormInput,
  TrendingUp,
  Bell,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

interface StatItem {
  title: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for the icon tile background. */
  tone: "emerald" | "amber" | "blue" | "violet" | "rose" | "slate";
  href?: string;
}

const tones: Record<StatItem["tone"], { bg: string; fg: string }> = {
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40", fg: "text-emerald-600 dark:text-emerald-400" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/40",     fg: "text-amber-600 dark:text-amber-400" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/40",       fg: "text-blue-600 dark:text-blue-400" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/40",   fg: "text-violet-600 dark:text-violet-400" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-950/40",       fg: "text-rose-600 dark:text-rose-400" },
  slate:   { bg: "bg-slate-100 dark:bg-slate-900",       fg: "text-slate-600 dark:text-slate-400" },
};

function StatCard({ item }: { item: StatItem }) {
  const tone = tones[item.tone];
  const inner = (
    <Card className="group transition-all hover:shadow-md hover:border-primary/30 cursor-pointer h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex aspect-square size-10 items-center justify-center rounded-lg ${tone.bg} ${tone.fg}`}>
            <item.icon className="size-5" />
          </div>
          {item.href && (
            <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
          <p className="text-3xl font-semibold tracking-tight">{item.value}</p>
          {item.hint && <p className="text-xs text-muted-foreground">{item.hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return item.href ? <Link href={item.href}>{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me || !me.user) redirect("/login");

  const stats = await api.dashboardStats();
  const greeting = getGreeting();

  const items: StatItem[] = [
    { title: "Bảng dữ liệu",        value: stats.collections,     hint: `${stats.rows} bản ghi`, icon: Database,  tone: "emerald", href: "/collections" },
    { title: "Workflow đang chạy",  value: stats.activeWorkflows,                                  icon: GitBranch, tone: "blue",    href: "/workflows" },
    { title: "Form đang hoạt động", value: stats.activeForms,                                      icon: FormInput, tone: "violet",  href: "/forms" },
    { title: "Người dùng",          value: stats.users,                                            icon: Users,     tone: "amber",   href: "/users" },
    { title: "Cron tự động",        value: stats.activeCrons,                                      icon: Clock,     tone: "rose",    href: "/crons" },
    { title: "Tệp đã upload",       value: stats.files,                                            icon: FileText,  tone: "slate",   href: "/files" },
    { title: "Thao tác 24h qua",    value: stats.auditLast24h,                                     icon: ScrollText, tone: "emerald", href: "/audit" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/95 to-primary p-6 sm:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.18),_transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium opacity-80">{greeting}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {me.user.displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm opacity-90">
              <span>{me.tenant?.name ?? "Toàn hệ thống"}</span>
              <span className="opacity-50">•</span>
              <Badge variant="secondary" className="bg-white/15 text-primary-foreground hover:bg-white/20 border-0">
                {me.session.isSuperAdmin ? "Super Admin" : me.user.role}
              </Badge>
            </div>
          </div>
          <Button variant="secondary" className="bg-white/15 text-primary-foreground hover:bg-white/25 border-0">
            <Bell className="size-4" />
            <span className="ml-2">{stats.auditLast24h} thao tác hôm nay</span>
          </Button>
        </div>
      </div>

      {/* ── Stats grid ─────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Tổng quan dữ liệu</h2>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="size-3.5" />
            Real-time
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <StatCard key={item.title} item={item} />
          ))}
        </div>
      </div>

      {/* ── Bottom row: tip + recent placeholder ───────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
                <CardDescription>Các thao tác trong 24 giờ qua</CardDescription>
              </div>
              <Button variant="ghost" size="sm" render={<Link href="/audit" />}>
                Xem tất cả <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.auditLast24h === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex aspect-square size-12 items-center justify-center rounded-full bg-muted">
                  <ScrollText className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">Chưa có hoạt động</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Khi có người chat với bot hoặc thao tác trên dashboard, lịch sử sẽ hiện ở đây.
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {stats.auditLast24h} thao tác — chi tiết tại trang Audit Log.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="size-4 text-amber-600 dark:text-amber-400" />
              Lần đầu dùng SkillBot?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Web dashboard chỉ là cửa sổ xem dữ liệu. Toàn bộ thao tác chính —
              nhập đơn, duyệt định mức, tra tồn kho, ký workflow — đều thực
              hiện qua chat Telegram để AI ghi nhận.
            </p>
            <p className="text-xs">
              Hỏi bot tiếng Việt tự nhiên, vd: <em>&ldquo;Tồn kho VL-001 còn bao nhiêu?&rdquo;</em>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}
