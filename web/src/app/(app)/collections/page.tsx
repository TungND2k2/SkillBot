import { redirect } from "next/navigation";
import Link from "next/link";
import { Database, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/page-header";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export default async function CollectionsPage() {
  if (!(await getCurrentUser())) redirect("/login");

  const { collections } = await api.listCollections();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Database}
        title="Bảng dữ liệu"
        description={`${collections.length} bảng — đơn hàng, vải, NCC, định mức, tồn kho...`}
      />

      {collections.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Database}
              title="Chưa có bảng nào"
              description="Tạo bảng qua chat Telegram: 'Tạo bảng đơn hàng có cột: ID, Khách hàng, Số lượng, Ngày giao'"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} href={`/collections/${c.id}`} className="group">
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/40">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Database className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">/{c.slug}</p>
                  </div>
                  {c.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                  )}
                  <div className="flex items-center gap-3 pt-2 text-xs">
                    <Badge variant="secondary" className="font-mono">
                      {c.fieldCount} cột
                    </Badge>
                    <Badge variant="secondary" className="font-mono">
                      {c.rowCount} dòng
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
