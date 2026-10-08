import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

const readSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser();
  const body = readSchema.parse(await req.json());

  const result = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      ...(body.all ? {} : { id: { in: body.ids ?? [] } }),
    },
    data: { read: true },
  });

  return ok({ updated: result.count });
});
