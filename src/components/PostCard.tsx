"use client";

import Link from "next/link";
import { fmtTime } from "@/lib/client";

export interface PostSummary {
  id: string;
  title: string;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  lastReplyAt: string;
  author: { id: string; name: string; realName?: string };
  board: { id: string; name: string; slug: string };
}

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link href={`/post/${post.id}`} className="card card-hover post-item">
      <span className="post-title">{post.title}</span>
      <span className="post-meta">
        <span>{post.author.name}</span>
        {post.author.realName && (
          <span className="real-name" title="真实姓名 · 仅本人与管理员可见">
            {post.author.realName}
          </span>
        )}
        <span>{post.board.name}</span>
        <span>回复 {post.replyCount}</span>
        <span>浏览 {post.viewCount}</span>
        <span>{fmtTime(post.lastReplyAt)}</span>
      </span>
    </Link>
  );
}
