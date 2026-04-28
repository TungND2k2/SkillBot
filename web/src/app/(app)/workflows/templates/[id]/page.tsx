import { redirect } from "next/navigation";
import Link from "next/link";
import { GitBranch, ArrowLeft, Tag, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export default async function WorkflowTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getCurrentUser())) redirect("/login");
  const { id } = await params;
  const template = await api.getWorkflowTemplate(id);
  const { instances } = await api.listWorkflowInstances();
  const myInstances = instances.filter((i) => i.templateId === id);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/workflows" />}>
        <ArrowLeft className="size-4" />
        <span className="ml-1">Quy trình</span>
      </Button>

      <PageHeader
        icon={GitBranch}
        title={template.name}
        description={template.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={template.status === "active" ? "default" : "secondary"}>
              {template.status}
            </Badge>
            {template.domain && (
              <Badge variant="outline" className="font-mono text-xs">
                <Tag className="size-3 mr-1" />
                {template.domain}
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs">
              <Hash className="size-3 mr-1" />
              v{template.version}
            </Badge>
          </div>
        }
      />

      {/* Stage list as horizontal stepper for high-level overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Các bước ({template.stages.length})</CardTitle>
          <CardDescription>Luồng phê duyệt từ trái qua phải</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkflowStepper stages={template.stages} />
        </CardContent>
      </Card>

      {/* Detailed stage breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết từng bước</CardTitle>
          <CardDescription>Người chịu trách nhiệm cho mỗi bước</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkflowStepper stages={template.stages} orientation="vertical" />
        </CardContent>
      </Card>

      {/* Active instances of this template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Đang chạy ({myInstances.filter((i) => i.status === "active").length})
          </CardTitle>
          <CardDescription>Instances đang xử lý theo template này</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {myInstances.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Chưa có workflow nào đang chạy với template này.
            </p>
          ) : (
            myInstances.map((inst) => {
              const stageIdx = template.stages.findIndex((s) => s.id === inst.currentStageId);
              return (
                <div key={inst.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        Khởi tạo bởi: <span className="font-mono">{inst.initiatedBy}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cập nhật: {new Date(inst.updatedAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <Badge
                      variant={inst.status === "active" ? "default" : inst.status === "completed" ? "secondary" : "destructive"}
                    >
                      {inst.status}
                    </Badge>
                  </div>
                  <WorkflowStepper
                    stages={template.stages}
                    currentIndex={stageIdx >= 0 ? stageIdx : undefined}
                    compact
                  />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
