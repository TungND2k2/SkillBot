import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
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

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  delete: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

function actionTone(action: string): string {
  for (const key of Object.keys(actionColors)) {
    if (action.toLowerCase().includes(key)) return actionColors[key];
  }
  return "bg-muted text-muted-foreground";
}

export default async function AuditPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const { logs } = await api.listAuditLogs();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        title="Lịch sử thao tác"
        description={`${logs.length} thao tác gần đây — ai làm gì lúc nào.`}
      />

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="Chưa có thao tác"
              description="Mọi hành động qua chat hoặc skill sẽ được ghi lại đây — mục đích minh bạch."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lúc</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Resource</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{log.userName ?? log.userId}</span>
                        {log.userRole && (
                          <span className="text-xs text-muted-foreground ml-1.5">
                            · {log.userRole}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${actionTone(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-mono text-xs">{log.resourceTable}</span>
                        {log.resourceId && (
                          <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                            #{log.resourceId.slice(0, 8)}
                          </span>
                        )}
                      </div>
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
