import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handle, parsePage } from "@/lib/api";

const querySchema = z.object({
  q: z.string().trim().min(1, "搜索词不能为空").max(50, "搜索词最多 50 字符"),
  type: z.enum(["post", "user"]).default("post"),
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
  const { q, type } = querySchema.parse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    type: req.nextUrl.searchParams.get("type") ?? undefined,
  });
  const { page, pageSize, skip } = parsePage(req.nextUrl.searchParams);

  if (type === "user") {
    const where = {
      OR: [{ name: { contains: q } }, { studentId: { contains: q } }],
    };
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, studentId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return ok({ users, total, page, pageSize });
  }

  const where = {
    status: "APPROVED" as const,
    OR: [{ title: { contains: q } }, { body: { contains: q } }],
  };
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: POST_SUMMARY_SELECT,
      orderBy: { lastReplyAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ]);
  return ok({ posts, total, page, pageSize });
});
