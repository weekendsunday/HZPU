import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { handle, ok, parsePage } from "@/lib/api";

const postSummarySelect = {
  id: true,
  title: true,
  replyCount: true,
  viewCount: true,
  createdAt: true,
  lastReplyAt: true,
  hotScore: true,
  author: { select: { id: true, name: true } },
  board: { select: { id: true, name: true, slug: true } },
} as const;

export const GET = handle(async (_req, { params }: { params: { slug: string } }) => {
  const board = await prisma.board.findUnique({ where: { slug: params.slug } });
  if (!board) throw new ApiError(404, "版块不存在");

  const { searchParams } = new URL(_req.url);
  const { page, pageSize, skip } = parsePage(searchParams);
  const sort = searchParams.get("sort") === "hot" ? "hot" : "new";

  const where = { boardId: board.id, status: "APPROVED" as const };
  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: sort === "hot" ? { hotScore: "desc" } : { lastReplyAt: "desc" },
      skip,
      take: pageSize,
      select: postSummarySelect,
    }),
  ]);

  return ok({
    board: {
      id: board.id,
      name: board.name,
      slug: board.slug,
      description: board.description,
      locked: board.locked,
    },
    posts,
    total,
    page,
    pageSize,
  });
});
