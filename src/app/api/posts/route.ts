import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireUser } from "@/lib/auth";
import { handle, ok, parsePage } from "@/lib/api";
import { moderate } from "@/lib/moderation";
import { extractMentions } from "@/lib/mentions";
import { hotScore } from "@/lib/hot";

const postSummarySelect = {
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

export const GET = handle(async (req) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = parsePage(searchParams);
  const boardId = searchParams.get("boardId") || undefined;

  const where = { ...(boardId ? { boardId } : {}), status: "APPROVED" as const };
  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: { lastReplyAt: "desc" },
      skip,
      take: pageSize,
      select: postSummarySelect,
    }),
  ]);

  return ok({ posts, total, page, pageSize });
});

const createSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(20000),
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const input = createSchema.parse(await req.json());

  const board = await prisma.board.findUnique({ where: { id: input.boardId } });
  if (!board) throw new ApiError(404, "版块不存在");
  if (board.locked) throw new ApiError(403, "版块已锁定，无法发帖");

  const result = await moderate(`${input.title}\n${input.body}`);
  const pass = result.pass;
  const post = await prisma.post.create({
    data: {
      boardId: board.id,
      authorId: user.id,
      title: input.title,
      body: input.body,
      status: pass ? "APPROVED" : "PENDING",
    },
  });

  await prisma.moderationLog.create({
    data: {
      targetType: "POST",
      targetId: post.id,
      action: pass ? "APPROVE" : "REJECT",
      auto: true,
      reason: pass ? undefined : result.reason,
    },
  });

  if (!pass) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        postId: post.id,
        message: `你的帖子《${input.title}》未通过自动审核：${result.reason}`,
      },
    });
  } else {
    // 提及时通知（仅已通过审核时通知）
    const mentioned = await extractMentions(input.body, user.id);
    if (mentioned.length > 0) {
      await prisma.notification.createMany({
        data: mentioned.map((uid) => ({
          userId: uid,
          type: "MENTION",
          postId: post.id,
          actorId: user.id,
          message: `在帖子《${input.title}》中提到了你`,
        })),
      });
    }
  }

  return ok({
    post: { id: post.id, status: post.status },
    moderation: pass ? { pass: true } : { pass: false, reason: result.reason },
  });
});
