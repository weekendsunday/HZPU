import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

const putSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  sort: z.number().int().optional(),
  locked: z.boolean().optional(),
});

type Params = { params: { id: string } };

export const PUT = handle(async (req: NextRequest, { params }: Params) => {
  await requireAdmin();
  const body = putSchema.parse(await req.json());
  const board = await prisma.board.update({
    where: { id: params.id },
    data: body,
  });
  return ok(board);
});

export const DELETE = handle(async (_req: NextRequest, { params }: Params) => {
  await requireAdmin();
  const board = await prisma.board.findUnique({
    where: { id: params.id },
    include: { _count: { select: { posts: true } } },
  });
  if (!board) throw new ApiError(404, "版块不存在");
  if (board._count.posts > 0) {
    throw new ApiError(409, "该版块下仍有帖子，无法删除");
  }
  await prisma.board.delete({ where: { id: params.id } });
  return ok({});
});
