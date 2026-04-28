import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) redirect("/login?error=missing");

  try {
    const result = await api.login({ username, password });
    await setSessionCookie(result.sessionToken);
  } catch (err) {
    const code = err instanceof ApiError ? err.code : "internal_error";
    redirect(`/login?error=${encodeURIComponent(code)}`);
  }
  redirect("/dashboard");
}

const errorMessages: Record<string, string> = {
  missing: "Vui lòng nhập đầy đủ.",
  unauthenticated: "Tên đăng nhập hoặc mật khẩu không đúng.",
  validation_error: "Dữ liệu không hợp lệ.",
  internal_error: "Lỗi hệ thống. Thử lại sau.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : null;
  const errorMessage = errorCode ? (errorMessages[errorCode] ?? errorCode) : null;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden p-6">
      {/* Background — soft emerald gradient + subtle grid */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-background to-amber-50/40 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/10" />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex aspect-square size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">SkillBot</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Đăng nhập để tiếp tục
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-xl shadow-foreground/5 p-6 space-y-5">
          {errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 mt-2">
              Đăng nhập
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
