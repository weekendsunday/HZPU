import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, handle, parsePage } from "@/lib/api";

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin();
  const { page, pageSize, skip } = parsePage(req.nextUrl.searchParams);
  const [total, logs] = await Promise.all([
    prisma.moderationLog.count(),
    prisma.moderationLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        action: true,
        auto: true,
        reason: true,
        reviewerId: true,
        createdAt: true,
      },
    }),
  ]);
  const reviewerIds = [...new Set(logs.map((l) => l.reviewerId).filter((x): x is string => !!x))];
  const reviewers = reviewerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById: Record<string, string> = Object.fromEntries(
    reviewers.map((u) => [u.id, u.name])
  );
  return ok({
    logs: logs.map(({ reviewerId, ...l }) => ({
      ...l,
      reviewer: reviewerId ? { name: nameById[reviewerId] ?? "未知" } : null,
    })),
    total,
    page,
    pageSize,
  });
});
