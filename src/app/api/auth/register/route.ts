import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

const registerSchema = z.object({
  studentId: z
    .string()
    .regex(new RegExp(process.env.STUDENT_ID_PATTERN || "^\\d{12}$"), "学号格式不正确"),
  name: z.string().min(2, "用户名至少 2 个字符").max(20, "用户名最多 20 个字符"),
  password: z.string().min(6, "密码至少 6 个字符").max(64, "密码最多 64 个字符"),
});

export const POST = handle(async (req) => {
  const body = registerSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({
    where: { studentId: body.studentId },
  });
  if (existing) throw new ApiError(409, "该学号已注册");

  const passwordHash = bcrypt.hashSync(body.password, 10);
  const user = await prisma.user.create({
    data: {
      studentId: body.studentId,
      name: body.name,
      passwordHash,
    },
    select: { id: true, studentId: true, name: true, role: true, status: true },
  });

  await setSessionCookie(user);
  return ok({ user });
});
