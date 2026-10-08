"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api, fmtTime } from "@/lib/client";
import { PostCard, type PostSummary } from "@/components/PostCard";
import { Pagination } from "@/components/Pagination";

interface UserResult {
  id: string;
  name: string;
  studentId: string;
  createdAt: string;
}

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") === "user" ? "user" : "post";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [input, setInput] = useState(q);
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [users, setUsers] = useState<UserResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => setInput(q), [q]);

  useEffect(() => {
    if (!q) {
      setPosts(null);
      setUsers(null);
      setTotal(0);
      return;
    }
    setError("");
    const url = `/api/search?q=${encodeURIComponent(q)}&type=${type}&page=${page}`;
    if (type === "post") {
      setPosts(null);
      api<{ posts: PostSummary[]; total: number }>(url)
        .then((d) => {
          setPosts(d.posts);
          setTotal(d.total);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "搜索失败"));
    } else {
      setUsers(null);
      api<{ users: UserResult[]; total: number }>(url)
        .then((d) => {
          setUsers(d.users);
          setTotal(d.total);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "搜索失败"));
    }
  }, [q, type, page]);

  const navigate = useCallback(
    (nextQ: string, nextType: string, nextPage: number) => {
      const params = new URLSearchParams();
      if (nextQ) params.set("q", nextQ);
      if (nextType !== "post") params.set("type", nextType);
      if (nextPage > 1) params.set("page", String(nextPage));
      const qs = params.toString();
      router.push(qs ? `/search?${qs}` : "/search");
    },
    [router]
  );

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(input.trim(), type, 1);
  }

  return (
    <div>
      <div className="page-head">
        <h2>搜索</h2>
      </div>
      <form onSubmit={onSearch} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          className="input"
          placeholder="搜索帖子或用户…"
          value={input}
          maxLength={50}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-primary" disabled={!input.trim()}>
          搜索
        </button>
      </form>

      {q && (
        <div className="tabs">
          <button className={`tab${type === "post" ? " active" : ""}`} onClick={() => navigate(q, "post", 1)}>
            帖子
          </button>
          <button className={`tab${type === "user" ? " active" : ""}`} onClick={() => navigate(q, "user", 1)}>
            用户
          </button>
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {!q ? (
        <div className="empty card">输入关键词开始搜索</div>
      ) : type === "post" ? (
        posts === null ? (
          <div className="spinner">搜索中…</div>
        ) : posts.length === 0 ? (
          <div className="empty card">没有找到相关帖子</div>
        ) : (
          <>
            <div className="list-stack">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
            <Pagination page={page} pageSize={20} total={total} onChange={(p) => navigate(q, type, p)} />
          </>
        )
      ) : users === null ? (
        <div className="spinner">搜索中…</div>
      ) : users.length === 0 ? (
        <div className="empty card">没有找到相关用户</div>
      ) : (
        <>
          <div className="list-stack">
            {users.map((u) => (
              <Link key={u.id} href={`/user/${u.id}`} className="card card-hover conv-item">
                <span className="avatar">{u.name.slice(0, 1)}</span>
                <div className="conv-main">
                  <div className="conv-name">{u.name}</div>
                  <div className="conv-preview">学号 {u.studentId} · 加入于 {fmtTime(u.createdAt)}</div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} pageSize={20} total={total} onChange={(p) => navigate(q, type, p)} />
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="spinner">加载中…</div>}>
      <SearchInner />
    </Suspense>
  );
}
