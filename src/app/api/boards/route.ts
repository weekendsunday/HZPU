import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";

export const GET = handle(async () => {
  const boards = await prisma.board.findMany({
    orderBy: { sort: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      sort: true,
      locked: true,
      _count: { select: { posts: { where: { status: "APPROVED" } } } },
    },
  });
  return ok({
    boards: boards.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      sort: b.sort,
      locked: b.locked,
      postCount: b._count.posts,
    })),
  });
});
