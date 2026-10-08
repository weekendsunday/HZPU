"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PostCard, type PostSummary } from "@/components/PostCard";

interface Board {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
}

export default function HomePage() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [hot, setHot] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ boards: Board[] }>("/api/boards")
      .then((d) => setBoards(d.boards))
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
    api<{ posts: PostSummary[] }>("/api/hot?limit=10")
      .then((d) => setHot(d.posts))
      .catch(() => setHot([]));
  }, []);

  return (
    <div>
      <section>
        <div className="page-head">
          <h2>🔥 热榜</h2>
          <Link href="/hot" className="muted">
            查看全部 →
          </Link>
        </div>
        {hot === null ? (
          <div className="spinner">加载中…</div>
        ) : hot.length === 0 ? (
          <div className="empty card">还没有帖子</div>
        ) : (
          <div className="list-stack">
            {hot.map((p, i) => (
              <div key={p.id} className="hot-item">
                <span className={`hot-rank${i < 3 ? ` top${i + 1}` : ""}`}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <PostCard post={p} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="divider" />

      <section>
        <div className="page-head">
          <h2>版块</h2>
          <Link href="/boards" className="muted">
            全部版块 →
          </Link>
        </div>
        {error && <div className="form-error">{error}</div>}
        {boards === null ? (
          <div className="spinner">加载中…</div>
        ) : boards.length === 0 ? (
          <div className="empty card">还没有版块</div>
        ) : (
          <div className="card-grid">
            {boards.map((b) => (
              <Link key={b.id} href={`/board/${b.slug}`} className="card card-hover">
                <h3 style={{ marginBottom: 4 }}>{b.name}</h3>
                <p className="muted" style={{ marginBottom: 8 }}>
                  {b.description || "暂无简介"}
                </p>
                <span className="muted">{b.postCount} 个帖子</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
