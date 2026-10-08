import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";
import { hotScore } from "@/lib/hot";

const bodySchema = z.object({
  targetType: z.enum(["POST", "FLOOR"]),
  targetId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional(),
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const { targetType, targetId, action, reason } = bodySchema.parse(
    await req.json()
  );
  const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  if (action === "REJECT" && !reason?.trim()) {
    throw new ApiError(422, "拒绝时必须填写原因");
  }

  const log = {
    targetType,
    targetId,
    action,
    auto: false,
    reason: reason ?? "",
    reviewerId: admin.id,
  } as const;

  if (targetType === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: targetId },
      include: { floors: { where: { status: "APPROVED" } } },
    });
    if (!post) throw new ApiError(404, "帖子不存在");
    if (post.status === nextStatus) return ok({});

    const lastReplyAt =
      post.floors.reduce<Date | null>(
        (latest, f) => (latest && latest > f.createdAt ? latest : f.createdAt),
        null
      ) ?? post.createdAt;
    await prisma.$transaction([
      prisma.post.update({
        where: { id: post.id },
        data: {
          status: nextStatus,
          rejectReason: action === "REJECT" ? reason! : null,
          replyCount: post.floors.length,
          lastReplyAt,
          hotScore: hotScore({
            replyCount: post.floors.length,
            viewCount: post.viewCount,
            lastReplyAt,
          }),
        },
      }),
      prisma.moderationLog.create({ data: log }),
      ...(action === "REJECT"
        ? [
            prisma.notification.create({
              data: {
                userId: post.authorId,
                type: "SYSTEM",
                postId: post.id,
                message: `你发布的内容未通过审核：${reason}`,
              },
            }),
          ]
        : []),
    ]);
    return ok({});
  }

  const floor = await prisma.floor.findUnique({
    where: { id: targetId },
    include: { post: true },
  });
  if (!floor) throw new ApiError(404, "楼层不存在");
  if (floor.status === nextStatus) return ok({});

  // 重新计算所在帖的回复数与热度
  const approvedFloors = await prisma.floor.findMany({
    where: { postId: floor.postId, status: "APPROVED" },
    select: { createdAt: true },
  });
  const replyCount = approvedFloors.length;
  const post = floor.post;
  const lastReplyAt =
    approvedFloors.reduce<Date | null>(
      (latest, f) => (latest && latest > f.createdAt ? latest : f.createdAt),
      null
    ) ?? post.createdAt;
  await prisma.$transaction([
    prisma.floor.update({
      where: { id: floor.id },
      data: { status: nextStatus },
    }),
    prisma.post.update({
      where: { id: floor.postId },
      data: {
        replyCount,
        lastReplyAt,
        hotScore: hotScore({
          replyCount,
          viewCount: post.viewCount,
          lastReplyAt,
        }),
      },
    }),
    prisma.moderationLog.create({ data: log }),
    ...(action === "REJECT"
      ? [
          prisma.notification.create({
            data: {
              userId: floor.authorId,
              type: "SYSTEM",
              postId: floor.postId,
              message: `你发布的内容未通过审核：${reason}`,
            },
          }),
        ]
      : []),
  ]);
  return ok({});
});
