import { redirect } from "next/navigation";
import { UserCircle, KeyRound, ShieldCheck, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCurrentUser } from "@/lib/auth";

export default async function AccountPage() {
  const me = await getCurrentUser();
  if (!me || !me.user) redirect("/login");
  const { user, tenant, session } = me;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
            {user.displayName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.displayName}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="font-mono text-xs">
              @{user.username}
            </Badge>
            <Badge variant={session.isSuperAdmin ? "default" : "secondary"}>
              {session.isSuperAdmin && <ShieldCheck className="size-3 mr-1" />}
              {session.isSuperAdmin ? "Super Admin" : user.role}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard icon={UserCircle} label="Cơ sở" value={tenant?.name ?? "—"} />
        <InfoCard icon={KeyRound} label="Mật khẩu" value="Đã đặt — đổi qua Telegram /setweb" />
        {user.linkedChannelUserId && (
          <InfoCard
            icon={Link2}
            label="Telegram đã liên kết"
            value={`${user.linkedChannel ?? "telegram"} · ${user.linkedChannelUserId}`}
          />
        )}
        <InfoCard
          icon={ShieldCheck}
          label="Phiên hết hạn"
          value={new Date(session.expiresAt).toLocaleString("vi-VN")}
        />
      </div>

      <Card className="bg-muted/40 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
          <CardDescription>
            Mở Telegram, chat với bot và gửi:{" "}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-background">
              /setweb &lt;mật khẩu mới&gt;
            </code>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
