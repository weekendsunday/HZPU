"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PostCard, type PostSummary } from "@/components/PostCard";

export default function HotPage() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ posts: PostSummary[] }>("/api/hot?limit=50")
      .then((d) => setPosts(d.posts))
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  return (
    <div>
      <div className="page-head">
        <h2>🔥 全站热榜</h2>
      </div>
      {error && <div className="form-error">{error}</div>}
      {posts === null ? (
        <div className="spinner">加载中…</div>
      ) : posts.length === 0 ? (
        <div className="empty card">还没有帖子</div>
      ) : (
        <div className="list-stack">
          {posts.map((p, i) => (
            <div key={p.id} className="card hot-item">
              <span className={`hot-rank${i < 3 ? ` top${i + 1}` : ""}`}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PostCard post={p} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
