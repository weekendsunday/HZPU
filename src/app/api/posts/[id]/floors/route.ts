import { z } from "zod";
import type { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError, requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { moderate } from "@/lib/moderation";
import { extractMentions } from "@/lib/mentions";
import { hotScore } from "@/lib/hot";

const floorSchema = z.object({
  content: z.string().min(1).max(10000),
});

/** 在事务内创建楼层：取 floorNo=max+1，并发冲突时重试一次。 */
async function createFloor(postId: string, authorId: string, content: string, status: ContentStatus) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const max = await tx.floor.aggregate({
          where: { postId },
          _max: { floorNo: true },
        });
        return tx.floor.create({
          data: {
            postId,
            authorId,
            content,
            floorNo: (max._max.floorNo || 0) + 1,
            status,
          },
        });
      });
    } catch (e) {
      // 并发唯一键冲突：重试一次后放弃
      if (attempt === 0) continue;
      throw e;
    }
  }
}

export const POST = handle(async (req, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const input = floorSchema.parse(await req.json());

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) throw new ApiError(404, "帖子不存在");
  if (post.status !== "APPROVED") throw new ApiError(403, "帖子未通过审核，无法回复");

  const result = await moderate(input.content);
  const pass = result.pass;
  const floor = await createFloor(
    post.id,
    user.id,
    input.content,
    pass ? "APPROVED" : "PENDING"
  );

  await prisma.moderationLog.create({
    data: {
      targetType: "FLOOR",
      targetId: floor.id,
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
        message: `你的回复未通过自动审核：${result.reason}`,
      },
    });
  } else {
    // 更新帖子统计与热度
    const replyCount = post.replyCount + 1;
    const lastReplyAt = new Date();
    await prisma.post.update({
      where: { id: post.id },
      data: {
        replyCount,
        lastReplyAt,
        hotScore: hotScore({
          replyCount,
          viewCount: post.viewCount,
          lastReplyAt,
        }),
      },
    });

    // 通知楼主
    const notifications: {
      userId: string;
      type: "REPLY" | "MENTION";
      postId: string;
      actorId: string;
      message: string;
    }[] = [];
    if (post.authorId !== user.id) {
      notifications.push({
        userId: post.authorId,
        type: "REPLY",
        postId: post.id,
        actorId: user.id,
        message: "回复了你的帖子",
      });
    }

    // 提及时通知（排除楼主，避免与其 REPLY 通知重复）
    const mentioned = await extractMentions(input.content, user.id);
    for (const uid of mentioned) {
      if (uid === post.authorId) continue;
      notifications.push({
        userId: uid,
        type: "MENTION",
        postId: post.id,
        actorId: user.id,
        message: `在帖子《${post.title}》中提到了你`,
      });
    }
    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  }

  return ok({
    floor: { id: floor.id, floorNo: floor.floorNo, status: floor.status },
    moderation: pass ? { pass: true } : { pass: false, reason: result.reason },
  });
});
