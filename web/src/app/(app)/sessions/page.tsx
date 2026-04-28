import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function relative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

export default async function SessionsPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const { sessions } = await api.listConversationSessions();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title="Phiên chat"
        description={`${sessions.length} phiên chat — lịch sử user trao đổi với bot.`}
      />

      <Card>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Chưa có phiên chat"
              description="Khi user nhắn bot, mỗi user sẽ có 1 phiên. Phiên giữ lịch sử gần nhất + form đang fill dở."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Số tin nhắn</TableHead>
                  <TableHead>Form đang fill</TableHead>
                  <TableHead>Tin nhắn cuối</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{s.userName ?? s.channelUserId}</p>
                        <p className="text-xs text-muted-foreground font-mono">{s.channel}:{s.channelUserId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.userRole ? (
                        <Badge variant="outline" className="capitalize">{s.userRole}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.messageCount}</TableCell>
                    <TableCell>
                      {s.hasActiveForm ? (
                        <Badge variant="default" className="text-xs">Đang fill</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {relative(s.lastMessageAt)}
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
