"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, fmtTime } from "@/lib/client";
import { PostCard, type PostSummary } from "@/components/PostCard";

interface Profile {
  id: string;
  name: string;
  studentId: string;
  createdAt: string;
}

export default function UserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ user: Profile | null; posts: PostSummary[] }>(`/api/users/${params.id}`)
      .then((d) => {
        setUser(d.user);
        setPosts(d.posts);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [params.id]);

  function dm() {
    if (!user) return;
    router.push(`/messages?to=${encodeURIComponent(user.name)}`);
  }

  if (error) return <div className="form-error">{error}</div>;
  if (!user || posts === null) return <div className="spinner">加载中…</div>;

  return (
    <div>
      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
        <span className="avatar avatar-lg">{user.name.slice(0, 1)}</span>
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: 2 }}>{user.name}</h2>
          <div className="muted">学号 {user.studentId} · 加入于 {fmtTime(user.createdAt)}</div>
        </div>
        <button className="btn btn-outline" onClick={dm}>
          发私信
        </button>
      </div>

      <h3 style={{ marginBottom: 12 }}>TA 的帖子（{posts.length}）</h3>
      {posts.length === 0 ? (
        <div className="empty card">还没有帖子</div>
      ) : (
        <div className="list-stack">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
      <p className="muted" style={{ marginTop: 12 }}>
        <Link href="/">返回首页</Link>
      </p>
    </div>
  );
}
