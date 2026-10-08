import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

const bodySchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "BANNED"]).optional(),
});

type Params = { params: { id: string } };

export const POST = handle(async (req: NextRequest, { params }: Params) => {
  const admin = await requireAdmin();
  const body = bodySchema.parse(await req.json());
  if (params.id === admin.id) throw new ApiError(403, "不能修改自己的账号");
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) throw new ApiError(404, "用户不存在");
  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(body.role ? { role: body.role } : {}),
      ...(body.status ? { status: body.status } : {}),
    },
    select: { id: true, studentId: true, name: true, role: true, status: true },
  });
  return ok(updated);
});
