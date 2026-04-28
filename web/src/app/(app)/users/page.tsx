import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, EmptyState } from "@/components/page-header";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { users } = await api.listTenantUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Người dùng"
        description={`Người dùng chat qua bot Telegram trong cơ sở này — ${users.length} tài khoản.`}
      />

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState icon={Users} title="Chưa có người dùng" description="User sẽ tự xuất hiện khi họ chat /register với bot." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Kênh</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                            {u.displayName.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.displayName}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {u.channelUserId}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs capitalize">
                        {u.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span
                          className={`size-1.5 rounded-full ${
                            u.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                          }`}
                        />
                        {u.isActive ? "Đang dùng" : "Tạm khóa"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                    </TableCell>
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
