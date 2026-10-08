"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

interface Board {
  id: string;
  name: string;
  slug: string;
  description: string;
  locked: boolean;
  postCount: number;
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ boards: Board[] }>("/api/boards")
      .then((d) => setBoards(d.boards))
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  return (
    <div>
      <div className="page-head">
        <h2>全部版块</h2>
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
              <h3 style={{ marginBottom: 4 }}>
                {b.name}
                {b.locked && <span className="muted">（已锁定）</span>}
              </h3>
              <p className="muted" style={{ marginBottom: 8 }}>
                {b.description || "暂无简介"}
              </p>
              <span className="muted">{b.postCount} 个帖子</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
