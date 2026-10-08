import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { ok, handle, parsePage } from "@/lib/api";

type Ctx = { params: { id: string } };

async function requireMember(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      userA: { select: { id: true, name: true } },
      userB: { select: { id: true, name: true } },
    },
  });
  if (!conversation) throw new ApiError(404, "会话不存在");
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    throw new ApiError(403, "无权访问该会话");
  }
  return conversation;
}

export const GET = handle(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const conversation = await requireMember(params.id, user.id);
  const { page, pageSize, skip } = parsePage(req.nextUrl.searchParams);

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        content: true,
        read: true,
        createdAt: true,
        sender: { select: { id: true, name: true } },
      },
    }),
    prisma.message.count({ where: { conversationId: conversation.id } }),
  ]);

  // 将对方发来的消息标记已读
  await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      senderId: { not: user.id },
      read: false,
    },
    data: { read: true },
  });

  const other =
    conversation.userAId === user.id ? conversation.userB : conversation.userA;
  return ok({ messages, other, total, page, pageSize });
});

const replySchema = z.object({
  content: z.string().min(1).max(2000),
});

export const POST = handle(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const conversation = await requireMember(params.id, user.id);
  const body = replySchema.parse(await req.json());

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      content: body.content,
      read: false,
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: message.createdAt },
  });

  return ok({ message: { id: message.id, createdAt: message.createdAt } });
});
