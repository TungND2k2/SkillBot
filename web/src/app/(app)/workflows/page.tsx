import { redirect } from "next/navigation";
import Link from "next/link";
import {
  GitBranch,
  Play,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/page-header";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { WorkflowInstanceDto, WorkflowTemplateDto } from "@shared/dto";

const statusStyles: Record<string, { tone: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  active:    { tone: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",          icon: Play,         label: "Đang chạy" },
  completed: { tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", icon: CheckCircle2, label: "Hoàn tất" },
  failed:    { tone: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",            icon: AlertCircle,  label: "Thất bại" },
};

function TemplateCard({ template }: { template: WorkflowTemplateDto }) {
  return (
    <Link href={`/workflows/templates/${template.id}`} className="group">
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/40">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <GitBranch className="size-5" />
            </div>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
          </div>

          <div>
            <h3 className="font-semibold truncate">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {template.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge variant={template.status === "active" ? "default" : "secondary"}>
              {template.status}
            </Badge>
            {template.domain && (
              <Badge variant="outline" className="font-mono">
                <Tag className="size-2.5 mr-1" />
                {template.domain}
              </Badge>
            )}
            <span className="text-muted-foreground">v{template.version}</span>
          </div>

          {template.stages.length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">{template.stages.length} bước</p>
              <div className="flex flex-wrap gap-1.5">
                {template.stages.slice(0, 4).map((s) => (
                  <Badge key={s.id} variant="secondary" className="text-xs font-normal">
                    {s.name}
                  </Badge>
                ))}
                {template.stages.length > 4 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    +{template.stages.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function InstanceCard({
  instance,
  template,
}: {
  instance: WorkflowInstanceDto;
  template: WorkflowTemplateDto | undefined;
}) {
  const style = statusStyles[instance.status] ?? statusStyles.active;
  const Icon = style.icon;
  const stageIdx = template?.stages.findIndex((s) => s.id === instance.currentStageId) ?? -1;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">
              {instance.templateName ?? <span className="text-muted-foreground italic">Template đã xóa</span>}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {instance.initiatedBy}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${style.tone} shrink-0`}>
            <Icon className="size-3" />
            {style.label}
          </span>
        </div>

        {template && template.stages.length > 0 && (
          <WorkflowStepper
            stages={template.stages}
            currentIndex={stageIdx >= 0 ? stageIdx : undefined}
            compact
          />
        )}

        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <span>
            Bước hiện tại: <span className="font-mono text-foreground">{instance.currentStageId ?? "—"}</span>
          </span>
          <span>{new Date(instance.updatedAt).toLocaleString("vi-VN")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function WorkflowsPage() {
  if (!(await getCurrentUser())) redirect("/login");

  const [{ templates }, { instances }] = await Promise.all([
    api.listWorkflowTemplates(),
    api.listWorkflowInstances(),
  ]);

  const tplById = new Map(templates.map((t) => [t.id, t]));

  return (
    <div className="space-y-8">
      <PageHeader
        icon={GitBranch}
        title="Quy trình"
        description={`${templates.length} quy trình mẫu, ${instances.filter((i) => i.status === "active").length} đang chạy.`}
      />

      <section>
        <h2 className="text-base font-semibold tracking-tight mb-3">Quy trình mẫu (templates)</h2>
        {templates.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={GitBranch}
                title="Chưa có quy trình nào"
                description="Tạo qua chat: 'Tạo workflow B1-B6 cho đơn hàng may thêu'"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold tracking-tight mb-3">
          Đang chạy ({instances.filter((i) => i.status === "active").length})
        </h2>
        {instances.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Play}
                title="Không có workflow nào đang chạy"
                description="Khi user khởi động workflow qua chat, instance sẽ xuất hiện ở đây."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {instances.map((i) => (
              <InstanceCard key={i.id} instance={i} template={tplById.get(i.templateId)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
