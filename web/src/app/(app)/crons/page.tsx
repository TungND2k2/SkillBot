import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
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

function fmt(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("vi-VN");
}

export default async function CronsPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const { jobs } = await api.listCrons();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Clock}
        title="Lịch tự động"
        description={`${jobs.length} cron — nhắc mua vải, báo cáo tuần, dọn cache...`}
      />

      <Card>
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Chưa có lịch nào"
              description="Tạo cron qua chat: 'Mỗi thứ Hai 9h sáng gửi báo cáo tồn kho cho admin'"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Lịch chạy</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Lần kế</TableHead>
                  <TableHead>Lần gần nhất</TableHead>
                  <TableHead>Đã chạy</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.name}</TableCell>
                    <TableCell>
                      <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">
                        {j.schedule}
                      </code>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{j.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(j.nextRunAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(j.lastRunAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{j.runCount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={j.status === "active" ? "default" : j.status === "error" ? "destructive" : "secondary"}
                      >
                        {j.status}
                      </Badge>
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
