import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

const tenantColors = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
];

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return tenantColors[hash % tenantColors.length];
}

export default async function TenantsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.session.isSuperAdmin) redirect("/dashboard");

  const { tenants } = await api.listTenants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cơ sở (tenants)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mỗi cơ sở có một bot Telegram riêng và dữ liệu cô lập.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {tenants.length} cơ sở
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách cơ sở</CardTitle>
          <CardDescription>Click vào tên để xem dữ liệu của từng cơ sở</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex aspect-square size-14 items-center justify-center rounded-full bg-muted">
                <Building2 className="size-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-base font-medium">Chưa có cơ sở nào</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Chạy <code className="font-mono px-1.5 py-0.5 rounded bg-muted text-foreground">npm run db:seed</code>
                {" "}với <code className="font-mono px-1.5 py-0.5 rounded bg-muted text-foreground">SEED_BOT_TOKEN</code> để tạo cơ sở đầu tiên.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên cơ sở</TableHead>
                  <TableHead>Bot Telegram</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className={colorFor(t.id)}>
                            {t.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {t.id.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.botUsername ? (
                        <a
                          href={`https://t.me/${t.botUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary transition-colors"
                        >
                          @{t.botUsername}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">— chưa đặt —</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={t.status === "active" ? "default" : "secondary"}
                        className={t.status === "active" ? "" : ""}
                      >
                        <span
                          className={`size-1.5 rounded-full mr-1.5 ${
                            t.status === "active" ? "bg-emerald-400" : "bg-muted-foreground"
                          }`}
                        />
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
