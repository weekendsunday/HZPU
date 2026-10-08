import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handle } from "@/lib/api";
import { ApiError } from "@/lib/auth";
import { hotScore } from "@/lib/hot";

const BATCH_SIZE = 500;

export const POST = handle(async (req: NextRequest) => {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    throw new ApiError(401, "未授权");
  }

  const now = new Date();
  let updated = 0;
  let skip = 0;

  for (;;) {
    const posts = await prisma.post.findMany({
      where: { status: "APPROVED" },
      select: { id: true, replyCount: true, viewCount: true, lastReplyAt: true },
      orderBy: { id: "asc" },
      skip,
      take: BATCH_SIZE,
    });
    if (posts.length === 0) break;

    await prisma.$transaction(
      posts.map((p) =>
        prisma.post.update({
          where: { id: p.id },
          data: {
            hotScore: hotScore({
              replyCount: p.replyCount,
              viewCount: p.viewCount,
              lastReplyAt: p.lastReplyAt,
              now,
            }),
          },
        })
      )
    );

    updated += posts.length;
    if (posts.length < BATCH_SIZE) break;
    skip += BATCH_SIZE;
  }

  return ok({ updated });
});
