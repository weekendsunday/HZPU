import { prisma } from "./db";

/**
 * 从 Markdown 文本中提取 @姓名 提及。
 * 规则：@ 后紧跟 2-20 个非空白字符；按 User.name 精确匹配。
 * 返回去重后的用户 id 列表（不含 excludedUserId，避免自己 @ 自己）。
 */
export async function extractMentions(
  text: string,
  excludedUserId?: string
): Promise<string[]> {
  const matches = text.match(/@([^\s@，。,.!?:;；：！？]{2,20})/g) || [];
  const names = [...new Set(matches.map((m) => m.slice(1)))];
  if (names.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { name: { in: names }, status: "ACTIVE" },
    select: { id: true },
  });
  return users.map((u) => u.id).filter((id) => id !== excludedUserId);
}
