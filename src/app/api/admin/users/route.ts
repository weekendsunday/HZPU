import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, handle, parsePage } from "@/lib/api";

const querySchema = z.object({
  q: z.string().optional(),
  status: z.enum(["ACTIVE", "BANNED"]).optional(),
});

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const { page, pageSize, skip } = parsePage(sp);
  const { q, status } = querySchema.parse({
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
  });
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { studentId: { contains: q } },
          ],
        }
      : {}),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        studentId: true,
        name: true,
        realName: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { posts: true } },
      },
    }),
  ]);
  return ok({ users, total, page, pageSize });
});
