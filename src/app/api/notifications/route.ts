import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle, parsePage } from "@/lib/api";

export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser();
  const { skip, page, pageSize } = parsePage(req.nextUrl.searchParams);

  const [notifications, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        read: true,
        message: true,
        postId: true,
        actorId: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  // actorId 无 Prisma 关系，手动补齐触发者信息
  const actorIds = [...new Set(notifications.map((n) => n.actorId).filter((v): v is string => !!v))];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
    : [];
  const actorMap: Record<string, { id: string; name: string }> = {};
  for (const a of actors) {
    actorMap[a.id] = a;
  }

  const data = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    read: n.read,
    message: n.message,
    postId: n.postId,
    actor: n.actorId ? (actorMap[n.actorId] ?? null) : null,
    createdAt: n.createdAt,
  }));

  return ok({ notifications: data, total, unread, page, pageSize });
});
