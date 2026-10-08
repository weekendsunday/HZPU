import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

const bodySchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().regex(/^[a-z0-9-]{2,32}$/),
  description: z.string().max(500).default(""),
  sort: z.number().int().default(0),
});

export const GET = handle(async () => {
  await requireAdmin();
  const boards = await prisma.board.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      sort: true,
      locked: true,
      createdAt: true,
      _count: { select: { posts: true } },
    },
  });
  return ok({ boards });
});

export const POST = handle(async (req: NextRequest) => {
  await requireAdmin();
  const body = bodySchema.parse(await req.json());
  const exists = await prisma.board.findUnique({ where: { slug: body.slug } });
  if (exists) throw new ApiError(409, "版块 slug 已存在");
  const board = await prisma.board.create({ data: body });
  return ok(board, { status: 201 });
});
