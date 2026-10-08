import { getCurrentUser, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "请先登录");
  return ok({ user });
});
