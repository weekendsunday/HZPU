import { clearSessionCookie } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

export const POST = handle(async () => {
  clearSessionCookie();
  return ok({});
});
