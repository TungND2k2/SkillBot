import { redirect } from "next/navigation";
import { FormInput, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/page-header";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export default async function FormsPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const { forms } = await api.listForms();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FormInput}
        title="Form nhập liệu"
        description={`${forms.length} form template — phiếu nhập kho, QC checklist, tiến độ đơn hàng...`}
      />

      {forms.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FormInput}
              title="Chưa có form nào"
              description="Tạo form qua chat — 'Tạo form phiếu nhập kho có các trường: mã vải, số lượng, NCC, giá'"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <Card key={f.id} className="transition-all hover:shadow-md hover:border-primary/40">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                    <FormInput className="size-5" />
                  </div>
                  <Badge variant={f.status === "active" ? "default" : "secondary"} className="text-xs">
                    {f.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold">{f.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Hash className="size-3" />
                      v{f.version}
                    </span>
                    <span>·</span>
                    <span>{f.fieldCount} trường</span>
                  </div>
                </div>

                <div className="pt-3 border-t text-xs text-muted-foreground">
                  Cập nhật: {new Date(f.updatedAt).toLocaleDateString("vi-VN")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
