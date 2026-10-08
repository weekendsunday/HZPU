import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { setSessionCookie, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

const registerSchema = z.object({
  studentId: z
    .string()
    .regex(new RegExp(process.env.STUDENT_ID_PATTERN || "^\\d{12}$"), "学号格式不正确"),
  name: z
    .string()
    .trim()
    .min(2, "昵称至少 2 个字符")
    .max(20, "昵称最多 20 个字符"),
  realName: z
    .string()
    .trim()
    .min(2, "真实姓名至少 2 个字符")
    .max(20, "真实姓名最多 20 个字符"),
  password: z.string().min(6, "密码至少 6 个字符").max(64, "密码最多 64 个字符"),
});

export const POST = handle(async (req) => {
  const body = registerSchema.parse(await req.json());

  // 学号与昵称都要求唯一；真实姓名允许重名（同名同姓很常见）
  const [byStudentId, byName] = await Promise.all([
    prisma.user.findUnique({ where: { studentId: body.studentId } }),
    prisma.user.findUnique({ where: { name: body.name } }),
  ]);
  if (byStudentId) throw new ApiError(409, "该学号已注册");
  if (byName) throw new ApiError(409, "该昵称已被使用，请换一个");

  const passwordHash = bcrypt.hashSync(body.password, 10);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        studentId: body.studentId,
        name: body.name,
        realName: body.realName,
        passwordHash,
      },
      select: {
        id: true,
        studentId: true,
        name: true,
        realName: true,
        role: true,
        status: true,
      },
    });
  } catch (e) {
    // 并发注册时唯一约束兜底：P2002 -> 409
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String(e.meta?.target ?? "");
      throw new ApiError(
        409,
        target.includes("student_id") ? "该学号已注册" : "该昵称已被使用，请换一个"
      );
    }
    throw e;
  }

  await setSessionCookie(user);
  return ok({ user });
});
