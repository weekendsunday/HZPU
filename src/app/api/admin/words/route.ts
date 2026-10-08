import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

export const GET = handle(async () => {
  await requireAdmin();
  const words = await prisma.sensitiveWord.findMany({
    orderBy: { id: "desc" },
    select: { id: true, word: true },
  });
  return ok({ words });
});

const bodySchema = z.object({ word: z.string().min(1).max(50) });

export const POST = handle(async (req: NextRequest) => {
  await requireAdmin();
  const { word } = bodySchema.parse(await req.json());
  const exists = await prisma.sensitiveWord.findUnique({ where: { word } });
  if (exists) return ok(exists);
  const created = await prisma.sensitiveWord.create({ data: { word } });
  return ok(created, { status: 201 });
});

export const DELETE = handle(async (req: NextRequest) => {
  await requireAdmin();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) throw new ApiError(422, "缺少 id 参数");
  const word = await prisma.sensitiveWord.findUnique({ where: { id } });
  if (!word) throw new ApiError(404, "敏感词不存在");
  await prisma.sensitiveWord.delete({ where: { id } });
  return ok({});
});
