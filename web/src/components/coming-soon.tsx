import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
  /** Lucide icon component for the page header */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional list of features that will land on this page */
  features?: string[];
}

export function ComingSoon({ title, description, icon: Icon, features }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="flex aspect-square size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <Badge variant="secondary" className="text-xs">
              Sắp ra mắt
            </Badge>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex aspect-square size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Construction className="size-6" />
          </div>
          <p className="mt-5 text-base font-medium">Đang phát triển</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            Trang này sẽ có sẵn ở bản kế tiếp. Trong thời gian chờ, bạn vẫn có
            thể thao tác qua chat Telegram với bot — AI sẽ ghi nhận đầy đủ.
          </p>

          {features && features.length > 0 && (
            <div className="mt-8 w-full max-w-md text-left">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Sẽ có
              </p>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 size-1.5 rounded-full bg-primary/60 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
