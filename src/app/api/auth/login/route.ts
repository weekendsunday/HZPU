import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

const loginSchema = z.object({
  studentId: z.string().min(1, "学号不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

export const POST = handle(async (req) => {
  const body = loginSchema.parse(await req.json());

  const user = await prisma.user.findUnique({
    where: { studentId: body.studentId },
  });
  if (!user || !bcrypt.compareSync(body.password, user.passwordHash)) {
    throw new ApiError(401, "学号或密码错误");
  }
  if (user.status === "BANNED") {
    throw new ApiError(403, "账号已被封禁");
  }

  const sessionUser = {
    id: user.id,
    studentId: user.studentId,
    name: user.name,
    role: user.role,
    status: user.status,
  };
  await setSessionCookie(sessionUser);
  return ok({ user: sessionUser });
});
