"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api, getClientUser } from "@/lib/client";
import { PostCard, type PostSummary } from "@/components/PostCard";
import { Pagination } from "@/components/Pagination";

interface Board {
  id: string;
  name: string;
  slug: string;
  description: string;
  locked: boolean;
}

function BoardInner({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const sort = searchParams.get("sort") === "hot" ? "hot" : "new";

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    setPosts(null);
    setError("");
    api<{ board: Board; posts: PostSummary[]; total: number }>(
      `/api/boards/${slug}?page=${page}&sort=${sort}`
    )
      .then((d) => {
        setBoard(d.board);
        setPosts(d.posts);
        setTotal(d.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [slug, page, sort]);

  const setParam = useCallback(
    (key: string, value: string) => {
      const q = new URLSearchParams(searchParams.toString());
      if (value) q.set(key, value);
      else q.delete(key);
      const qs = q.toString();
      router.push(qs ? `/board/${slug}?${qs}` : `/board/${slug}`);
    },
    [router, searchParams, slug]
  );

  async function goNewPost() {
    const user = await getClientUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/new?board=${slug}`)}`);
      return;
    }
    router.push(`/new?board=${slug}`);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h2 style={{ marginBottom: 2 }}>{board?.name ?? "版块"}</h2>
          {board && <span className="muted">{board.description}</span>}
        </div>
        <button className="btn btn-primary" onClick={goNewPost} disabled={!!board?.locked}>
          {board?.locked ? "版块已锁定" : "发帖"}
        </button>
      </div>

      <div className="tabs">
        <button className={`tab${sort === "new" ? " active" : ""}`} onClick={() => setParam("sort", "")}>
          最新回复
        </button>
        <button className={`tab${sort === "hot" ? " active" : ""}`} onClick={() => setParam("sort", "hot")}>
          热门
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {posts === null ? (
        <div className="spinner">加载中…</div>
      ) : posts.length === 0 ? (
        <div className="empty card">还没有帖子，来发第一帖吧</div>
      ) : (
        <div className="list-stack">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={20} total={total} onChange={(p) => setParam("page", String(p))} />
    </div>
  );
}

export default function BoardPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<div className="spinner">加载中…</div>}>
      <BoardInner slug={params.slug} />
    </Suspense>
  );
}
