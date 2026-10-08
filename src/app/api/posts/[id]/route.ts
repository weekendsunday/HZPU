import { prisma } from "@/lib/db";
import { ApiError, getCurrentUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { hotScore } from "@/lib/hot";
import { authorView } from "@/lib/users";

export const GET = handle(async (_req, { params }: { params: { id: string } }) => {
  const user = await getCurrentUser();

  const existing = await prisma.post.findUnique({ where: { id: params.id } });
  if (!existing) throw new ApiError(404, "帖子不存在");

  // 未过审：仅作者或管理员可见，其余当作不存在
  if (existing.status !== "APPROVED") {
    const allowed = user && (user.id === existing.authorId || user.role === "ADMIN");
    if (!allowed) throw new ApiError(404, "帖子不存在");
  }

  // 每请求 viewCount+1 并重算 hotScore
  const viewCount = existing.viewCount + 1;
  await prisma.post.update({
    where: { id: existing.id },
    data: {
      viewCount,
      hotScore: hotScore({
        replyCount: existing.replyCount,
        viewCount,
        lastReplyAt: existing.lastReplyAt,
      }),
    },
  });

  const row = await prisma.post.findUniqueOrThrow({
    where: { id: existing.id },
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      rejectReason: true,
      viewCount: true,
      replyCount: true,
      createdAt: true,
      author: { select: { id: true, name: true, realName: true, studentId: true } },
      board: { select: { id: true, name: true, slug: true } },
    },
  });
  // 真实姓名仅本人与管理员可见，学号保持原样下发
  const post = {
    ...row,
    author: { ...authorView(row.author, user), studentId: row.author.studentId },
  };

  const floors = await prisma.floor.findMany({
    where: { postId: existing.id, status: "APPROVED" },
    orderBy: { floorNo: "asc" },
    select: {
      id: true,
      floorNo: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, realName: true } },
    },
  });

  return ok({
    post,
    floors: floors.map((f) => ({ ...f, author: authorView(f.author, user) })),
  });
});
