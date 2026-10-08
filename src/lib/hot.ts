/**
 * 热榜评分：回复权重高、浏览权重低、随最后活跃时间衰减。
 * score = (replyCount*4 + viewCount*0.5 + 5) / (hoursSinceLastReply + 2)^1.2
 * 只给已发布帖子打分；由回复/浏览动作后即时刷新 + 定时全量刷新调用。
 */
export function hotScore(input: {
  replyCount: number;
  viewCount: number;
  lastReplyAt: Date;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const hours = Math.max(0, (now.getTime() - input.lastReplyAt.getTime()) / 3_600_000);
  const raw = input.replyCount * 4 + input.viewCount * 0.5 + 5;
  return Math.round((raw / Math.pow(hours + 2, 1.2)) * 100) / 100;
}
