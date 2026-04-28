import { redirect } from "next/navigation";
import { hasSessionCookie } from "@/lib/auth";

export default async function Home() {
  redirect((await hasSessionCookie()) ? "/dashboard" : "/login");
}
