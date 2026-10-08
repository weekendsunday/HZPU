import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { ok, handle, parsePage } from "@/lib/api";

export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser();

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { select: { id: true, name: true } },
      userB: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, senderId: true },
      },
    },
  });

  const data = conversations.map((c) => {
    const other = c.userAId === user.id ? c.userB : c.userA;
    const last = c.messages[0] ?? null;
    return {
      id: c.id,
      other,
      lastMessage: last
        ? { content: last.content, createdAt: last.createdAt }
        : null,
      unreadCount: 0,
    };
  });

  const convIds = conversations.map((c) => c.id);
  const unreadGroups = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: convIds },
      senderId: { not: user.id },
      read: false,
    },
    _count: { _all: true },
  });
  const unreadMap: Record<string, number> = {};
  for (const g of unreadGroups) {
    unreadMap[g.conversationId] = g._count._all;
  }
  data.forEach((d) => {
    d.unreadCount = unreadMap[d.id] ?? 0;
  });

  return ok({ conversations: data });
});

const sendSchema = z.object({
  to: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser();
  const body = sendSchema.parse(await req.json());

  const target = await prisma.user.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ name: body.to }, { studentId: body.to }],
    },
    select: { id: true },
  });
  if (!target) throw new ApiError(404, "用户不存在");
  if (target.id === user.id) throw new ApiError(400, "不能给自己发消息");

  const [userAId, userBId] =
    user.id < target.id ? [user.id, target.id] : [target.id, user.id];

  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
  });

  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        content: body.content,
      },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return ok({ conversationId: conversation.id });
});
