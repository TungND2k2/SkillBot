import { Check, User, Bot } from "lucide-react";
import type { WorkflowStageDto } from "@shared/dto";

interface WorkflowStepperProps {
  stages: WorkflowStageDto[];
  /** Index of the current stage. Stages before are "done", after are "pending". */
  currentIndex?: number;
  /** Visual orientation. */
  orientation?: "horizontal" | "vertical";
  /** Compact mode hides actor / description for tight spaces. */
  compact?: boolean;
}

const actorColor: Record<string, string> = {
  admin: "text-rose-600",
  manager: "text-blue-600",
  qc: "text-violet-600",
  user: "text-emerald-600",
};

function actorIcon(actor?: string): React.ComponentType<{ className?: string }> {
  if (actor === "ai" || actor === "bot" || actor === "system") return Bot;
  return User;
}

export function WorkflowStepper({
  stages,
  currentIndex,
  orientation = "horizontal",
  compact = false,
}: WorkflowStepperProps) {
  if (stages.length === 0) return null;

  return (
    <div
      className={
        orientation === "vertical"
          ? "flex flex-col gap-0"
          : "flex items-start gap-0 overflow-x-auto pb-2"
      }
    >
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1;
        const status =
          currentIndex === undefined
            ? "pending"
            : idx < currentIndex
              ? "done"
              : idx === currentIndex
                ? "current"
                : "pending";

        const dotClasses =
          status === "done"
            ? "bg-primary text-primary-foreground"
            : status === "current"
              ? "bg-primary/15 text-primary ring-4 ring-primary/20"
              : "bg-muted text-muted-foreground";

        const ActorIcon = actorIcon(stage.actor);
        const actorTone = stage.actor ? (actorColor[stage.actor] ?? "text-muted-foreground") : "text-muted-foreground";

        if (orientation === "vertical") {
          return (
            <div key={stage.id} className="flex gap-3 min-h-[64px]">
              <div className="flex flex-col items-center">
                <div className={`flex aspect-square size-8 items-center justify-center rounded-full text-xs font-semibold ${dotClasses}`}>
                  {status === "done" ? <Check className="size-4" /> : idx + 1}
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 w-0.5 mt-1 ${
                      status === "done" ? "bg-primary/40" : "bg-border"
                    }`}
                  />
                )}
              </div>
              <div className={`pb-6 ${isLast ? "" : "min-h-[40px]"} flex-1 min-w-0`}>
                <p className={`font-medium text-sm ${status === "current" ? "text-foreground" : status === "pending" ? "text-muted-foreground" : ""}`}>
                  {stage.name}
                </p>
                {!compact && stage.actor && (
                  <p className={`mt-0.5 inline-flex items-center gap-1 text-xs ${actorTone}`}>
                    <ActorIcon className="size-3" />
                    {stage.actor}
                  </p>
                )}
                {!compact && stage.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{stage.description}</p>
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={stage.id}
            className={`flex items-start gap-3 ${isLast ? "" : "flex-1"} min-w-[120px]`}
          >
            <div className="flex flex-col items-center min-w-[32px]">
              <div className={`flex aspect-square size-8 items-center justify-center rounded-full text-xs font-semibold ${dotClasses}`}>
                {status === "done" ? <Check className="size-4" /> : idx + 1}
              </div>
              <p className={`mt-2 text-xs text-center font-medium leading-tight max-w-[100px] ${status === "pending" ? "text-muted-foreground" : ""}`}>
                {stage.name}
              </p>
            </div>
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mt-4 ${
                  status === "done" ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
