import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handle } from "@/lib/api";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** 帖子摘要形状，与版块/帖子路由保持一致。 */
const POST_SUMMARY_SELECT = {
  id: true,
  title: true,
  replyCount: true,
  viewCount: true,
  createdAt: true,
  lastReplyAt: true,
  hotScore: true,
  author: { select: { id: true, name: true } },
  board: { select: { id: true, name: true, slug: true } },
} as const;

export const GET = handle(async (req: NextRequest) => {
  const { limit } = querySchema.parse({
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });

  const posts = await prisma.post.findMany({
    where: { status: "APPROVED" },
    select: POST_SUMMARY_SELECT,
    orderBy: { hotScore: "desc" },
    take: limit,
  });

  return ok({ posts });
});
