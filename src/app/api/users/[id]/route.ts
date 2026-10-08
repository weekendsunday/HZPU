import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { authorView } from "@/lib/users";

/** 公开接口：用户主页信息与该用户已发布的帖子（按最后回复排序，前 50 条）。 */
export const GET = handle(async (_req, { params }: { params: { id: string } }) => {
  const viewer = await getCurrentUser();
  const [user, posts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        realName: true,
        studentId: true,
        createdAt: true,
      },
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
        author: { select: { id: true, name: true, realName: true } },
      },
    }),
  ]);
  if (!user) return ok({ user: null, posts: [] });
  return ok({
    user: { ...authorView(user, viewer), studentId: user.studentId, createdAt: user.createdAt },
    posts: posts.map((p) => ({ ...p, author: authorView(p.author, viewer) })),
  });
});
