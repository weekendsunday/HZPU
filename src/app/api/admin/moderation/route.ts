import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, handle, parsePage } from "@/lib/api";

const querySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
  type: z.enum(["POST", "FLOOR"]).default("POST"),
});

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const { page, pageSize, skip } = parsePage(sp);
  const { status, type } = querySchema.parse({
    status: sp.get("status") ?? undefined,
    type: sp.get("type") ?? undefined,
  });

  if (type === "POST") {
    const [total, rows] = await Promise.all([
      prisma.post.count({ where: { status } }),
      prisma.post.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          title: true,
          body: true,
          status: true,
          rejectReason: true,
          createdAt: true,
          author: { select: { id: true, name: true, studentId: true } },
          board: { select: { name: true } },
        },
      }),
    ]);
    return ok({ items: rows, total, page, pageSize });
  }

  const [total, rows] = await Promise.all([
    prisma.floor.count({ where: { status } }),
    prisma.floor.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        content: true,
        floorNo: true,
        status: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
        post: { select: { id: true, title: true } },
      },
    }),
  ]);
  return ok({ items: rows, total, page, pageSize });
});
