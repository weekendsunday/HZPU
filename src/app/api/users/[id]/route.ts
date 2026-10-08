import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";

/** 公开接口：用户主页信息与该用户已发布的帖子（按最后回复排序，前 50 条）。 */
export const GET = handle(async (_req, { params }: { params: { id: string } }) => {
  const [user, posts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, studentId: true, createdAt: true },
    }),
    prisma.post.findMany({
      where: { authorId: params.id, status: "APPROVED" },
      orderBy: { lastReplyAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        replyCount: true,
        viewCount: true,
        createdAt: true,
        lastReplyAt: true,
        board: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
      },
    }),
  ]);
  if (!user) return ok({ user: null, posts: [] });
  return ok({ user, posts });
});
