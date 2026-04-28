import { redirect } from "next/navigation";
import { FileText, FileImage, FileSpreadsheet, File as FileIcon } from "lucide-react";
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

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  if (mime.includes("pdf") || mime.includes("text") || mime.includes("document")) return FileText;
  return FileIcon;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function FilesPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const { files } = await api.listFiles();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Tệp tin"
        description={`${files.length} tệp đã upload qua bot Telegram.`}
      />

      <Card>
        <CardContent className="p-0">
          {files.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Chưa có tệp nào"
              description="User upload qua Telegram (ảnh, PDF, Excel) sẽ xuất hiện ở đây — kèm text đã extract."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên file</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Người upload</TableHead>
                  <TableHead>Lúc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => {
                  const Icon = fileIcon(f.mimeType);
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex aspect-square size-8 items-center justify-center rounded bg-muted text-muted-foreground">
                            <Icon className="size-4" />
                          </div>
                          <span className="font-medium truncate">{f.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {f.mimeType.split("/")[1] ?? f.mimeType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{formatSize(f.fileSize)}</TableCell>
                      <TableCell className="font-mono text-xs">{f.uploadedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(f.createdAt).toLocaleString("vi-VN")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
